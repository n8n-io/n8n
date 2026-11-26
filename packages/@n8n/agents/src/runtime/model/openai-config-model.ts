import type { OpenAiModel } from '@n8n/ai-utilities';
import type { EgressFilter } from '@n8n/ai-utilities/http-proxy-agent';
import { isRecord } from '@n8n/utils/is-record';
import type { LanguageModel, LanguageModelMiddleware } from 'ai';

import { loadAi } from './lazy-ai';
import { buildOpenAiCompatible, statelessResponses, type FetchFn } from './model-factory';

type RequestBody = Record<string, unknown>;

/** `ChatOpenAI` adds these after `modelKwargs`, so `additionalParams` cannot replace them. */
const CONVERSATION_FIELDS: ReadonlySet<string> = new Set(['messages', 'input', 'stream']);

/** The model names that `ChatOpenAI` treats as reasoning models. */
function isReasoningModel(model: string): boolean {
	return /^o\d/.test(model) || (model.startsWith('gpt-5') && !model.startsWith('gpt-5-chat'));
}

/** `ChatOpenAI` also picks the Responses API by itself for these configs. */
function usesResponsesApi(config: OpenAiModel): boolean {
	return (
		config.useResponsesApi === true ||
		Boolean(config.reasoning?.summary) ||
		/gpt-5\.[24]-pro|codex/.test(config.model)
	);
}

function withRequestBody(fetch: FetchFn, transform: (body: RequestBody) => RequestBody): FetchFn {
	return async (input, init) => {
		if (typeof init?.body !== 'string') return await fetch(input, init);
		const body: unknown = JSON.parse(init.body);
		if (!isRecord(body)) return await fetch(input, init);
		return await fetch(input, { ...init, body: JSON.stringify(transform(body)) });
	};
}

/**
 * Fills the fields that the SDK left unset from the config, then spreads
 * `additionalParams` over the top level of the body, as `ChatOpenAI` does with
 * `modelKwargs`.
 */
function applyConfigFields(
	body: RequestBody,
	configFields: RequestBody,
	additionalParams: RequestBody = {},
): RequestBody {
	const result = { ...body };
	for (const [key, value] of Object.entries(configFields)) {
		if (value !== undefined && result[key] === undefined) result[key] = value;
	}
	for (const [key, value] of Object.entries(additionalParams)) {
		if (!CONVERSATION_FIELDS.has(key)) result[key] = value;
	}
	return result;
}

function chatCompletionsBody(config: OpenAiModel): (body: RequestBody) => RequestBody {
	const reasoningModel = isReasoningModel(config.model);
	return ({ max_tokens, ...body }) =>
		applyConfigFields(
			{ ...body, ...(reasoningModel ? { max_completion_tokens: max_tokens } : { max_tokens }) },
			{
				logprobs: config.logprobs,
				top_logprobs: config.topLogprobs,
				service_tier: config.service_tier,
				prompt_cache_key: config.promptCacheKey,
				verbosity: config.verbosity,
				reasoning_effort: reasoningModel ? config.reasoning?.effort : undefined,
			},
			config.additionalParams,
		);
}

function responsesBody(config: OpenAiModel): (body: RequestBody) => RequestBody {
	const reasoning = isReasoningModel(config.model) ? config.reasoning : undefined;
	return (body) => ({
		...applyConfigFields(
			body,
			{
				service_tier: config.service_tier,
				prompt_cache_key: config.promptCacheKey,
				reasoning,
			},
			config.additionalParams,
		),
		// The runtime sends the whole history on each turn, so `additionalParams`
		// cannot turn stored responses back on.
		store: false,
	});
}

/** A tool that does not set `strict` gets the config's value, as in `ChatOpenAI`. */
function strictToolsByDefault(strict: boolean): LanguageModelMiddleware {
	return {
		specificationVersion: 'v4',
		transformParams: async ({ params }) => ({
			...params,
			tools: params.tools?.map((tool) =>
				tool.type === 'function' && tool.strict === undefined ? { ...tool, strict } : tool,
			),
		}),
	};
}

type Credentials = Parameters<typeof buildOpenAiCompatible>[2];

async function createBaseModel(
	config: OpenAiModel,
	transport: FetchFn,
	credentials: Credentials,
	responsesApi: boolean,
): Promise<Parameters<typeof statelessResponses>[0]> {
	if (responsesApi) {
		const { createOpenAI } = await import('@ai-sdk/openai');
		const fetch = withRequestBody(transport, responsesBody(config));
		// The runtime sends the whole history on each turn, which an endpoint
		// that does not store responses can only read with `store: false`.
		return statelessResponses(createOpenAI({ ...credentials, fetch }).responses(config.model));
	}
	const fetch = withRequestBody(transport, chatCompletionsBody(config));
	return buildOpenAiCompatible('custom', undefined, credentials, config.model, fetch, {
		includeUsage: config.streamUsage ?? true,
	});
}

/**
 * Builds an AI SDK model from the OpenAI-compatible config that a community
 * chat model node passes to `supplyModel`. The vendor gets the request that
 * `ChatOpenAI` sends for the same config. Requests go through the transport
 * that `supplyModel` uses: the node's egress filter, the environment proxy,
 * `timeout` as the headers and body timeout, and the AI response size limit.
 *
 * The config fields that the SDK knows as call settings (such as `temperature`)
 * are defaults: a value in the call replaces them.
 */
export async function createOpenAiConfigModel(
	config: OpenAiModel,
	egressFilter: EgressFilter,
): Promise<LanguageModel> {
	const { proxyFetch } = await import('@n8n/ai-utilities/http-proxy-agent');
	const timeoutOptions =
		config.timeout === undefined
			? undefined
			: { headersTimeout: config.timeout, bodyTimeout: config.timeout };
	const transport: FetchFn = async (input, init) =>
		await proxyFetch({ input, init, timeoutOptions, egressFilter });
	const credentials: Credentials = {
		baseURL: config.baseUrl,
		// Without a key the OpenAI provider reads `OPENAI_API_KEY` of the host,
		// which must not reach the vendor's base URL.
		apiKey: config.apiKey ?? '',
		headers: config.defaultHeaders,
	};

	const responsesApi = usesResponsesApi(config);
	const model = await createBaseModel(config, transport, credentials, responsesApi);

	const maxTokens = config.maxCompletionTokens ?? config.maxTokens;
	const { wrapLanguageModel, defaultSettingsMiddleware } = loadAi();
	const middleware = [
		defaultSettingsMiddleware({
			settings: {
				temperature: config.temperature,
				topP: config.topP,
				// The Responses API has no penalties, and `ChatOpenAI` does not send them there.
				...(!responsesApi && {
					frequencyPenalty: config.frequencyPenalty,
					presencePenalty: config.presencePenalty,
				}),
				maxOutputTokens: maxTokens === -1 ? undefined : maxTokens,
				stopSequences: config.stopSequences ?? config.stop,
			},
		}),
		...(config.supportsStrictToolCalling === undefined
			? []
			: [strictToolsByDefault(config.supportsStrictToolCalling)]),
	];
	return wrapLanguageModel({ model, middleware });
}
