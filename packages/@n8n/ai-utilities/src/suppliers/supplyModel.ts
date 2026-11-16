import type { ServerTool } from '@langchain/core/tools';
import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import type { ISupplyDataFunctions, SupplyData } from 'n8n-workflow';

import { LangchainChatModelAdapter } from '../adapters/langchain-chat-model';
import { BaseChatModel } from '../chat-model/base';
import type { ChatModel } from '../types/chat-model';
import type { OpenAIModelOptions } from '../types/openai';
import { makeN8nLlmFailedAttemptHandler } from '../utils/failed-attempt-handler/n8nLlmFailedAttemptHandler';
import { getProxyAgent, aiClientFetch } from '../utils/http-proxy-agent';
import { N8nLlmTracing } from '../utils/n8n-llm-tracing';

export type OpenAiModel = OpenAIModelOptions & {
	type: 'openai';
};
export type SupplyModelOptions = ChatModel | OpenAiModel;

function isOpenAiModel(model: SupplyModelOptions): model is OpenAiModel {
	return 'type' in model && model.type === 'openai' && !(model instanceof BaseChatModel);
}

function getOpenAiModel(ctx: ISupplyDataFunctions, model: OpenAiModel) {
	const clientConfiguration: ClientOptions = {
		fetch: aiClientFetch,
		baseURL: model.baseUrl,
	};

	if (model.defaultHeaders) {
		clientConfiguration.defaultHeaders = model.defaultHeaders;
	}

	const timeout = model.timeout;
	clientConfiguration.fetchOptions = {
		dispatcher: getProxyAgent(
			model.baseUrl,
			{
				headersTimeout: timeout,
				bodyTimeout: timeout,
			},
			ctx.helpers.getSecureEgressFilter(),
		),
	};

	const openAiModel = new ChatOpenAI({
		configuration: clientConfiguration,
		model: model.model,
		apiKey: model.apiKey,
		useResponsesApi: model.useResponsesApi,
		logprobs: model.logprobs,
		topLogprobs: model.topLogprobs,
		supportsStrictToolCalling: model.supportsStrictToolCalling,
		reasoning: model.reasoning,
		zdrEnabled: model.zdrEnabled,
		service_tier: model.service_tier,
		promptCacheKey: model.promptCacheKey,
		temperature: model.temperature,
		topP: model.topP,
		frequencyPenalty: model.frequencyPenalty,
		presencePenalty: model.presencePenalty,
		stopSequences: model.stopSequences,
		maxRetries: model.maxRetries,
		modelKwargs: model.additionalParams,
		verbosity: model.verbosity,
		streaming: model.streaming,
		streamUsage: model.streamUsage,
		stop: model.stop,
		maxTokens: model.maxTokens,
		maxCompletionTokens: model.maxCompletionTokens,
		timeout: model.timeout,
		callbacks: [new N8nLlmTracing(ctx)],
		onFailedAttempt: makeN8nLlmFailedAttemptHandler(ctx, model.onFailedAttempt),
	});

	if (model.providerTools?.length) {
		openAiModel.metadata = {
			...openAiModel.metadata,
			// Tools in metadata are read by ToolAgent and added to a list of all agent tools.
			tools: model.providerTools.map<ServerTool>((tool) => ({
				// openai format requires type to be the name of the tool
				// langchain simply passes the tool object to openai as is
				type: tool.name,
				...tool.args,
			})),
		};
	}

	return openAiModel;
}

// `Symbol.for` gives the ESM and CJS builds the same key, so either copy finds the source.
const SUPPLIED_MODEL_SOURCE: unique symbol = Symbol.for('@n8n/ai-utilities.suppliedModelSource');

type WithSource = { [SUPPLIED_MODEL_SOURCE]: SupplyModelOptions };

function hasSource(value: unknown): value is WithSource {
	return typeof value === 'object' && value !== null && Object.hasOwn(value, SUPPLIED_MODEL_SOURCE);
}

/**
 * Returns what a node passed to `supplyModel`, read from the model that
 * `supplyModel` returned. This lets the first-class Agent build its own
 * model in place of the LangChain one.
 *
 * Returns `undefined` for anything else, including models derived from the
 * returned one, for example by `bindTools`.
 *
 * The result can contain an API key, so do not log or serialize it.
 */
export function getSuppliedModelSource(response: unknown): SupplyModelOptions | undefined {
	return hasSource(response) ? response[SUPPLIED_MODEL_SOURCE] : undefined;
}

export function supplyModel(ctx: ISupplyDataFunctions, model: SupplyModelOptions): SupplyData {
	const response = isOpenAiModel(model)
		? getOpenAiModel(ctx, model)
		: new LangchainChatModelAdapter(model, ctx);
	// Attach the options to the model so `getSuppliedModelSource` can read back what the node passed in.
	// Non-enumerable, so spread, `Object.assign` and `util.inspect` neither copy nor print it: it can hold an API key.
	Object.defineProperty(response, SUPPLIED_MODEL_SOURCE, { value: model });
	return { response };
}
