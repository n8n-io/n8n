import type { ListModelsFn, ListModelsOptions, ProviderModel } from './types';

/**
 * Provider model-list implementations, ported 1:1 from the corresponding chat
 * node's `searchModels` method or declarative `loadOptions` routing config in
 * `@n8n/n8n-nodes-langchain` (endpoints, auth, filters, and sort order match
 * the node's model dropdown). When changing behavior here, keep the node in
 * sync — the source node is referenced on each function.
 */

async function getJson(
	url: string,
	headers: Record<string, string>,
	options: ListModelsOptions,
	provider: string,
): Promise<unknown> {
	const fetchFn = options.fetch ?? globalThis.fetch;
	const response = await fetchFn(url, {
		method: 'GET',
		headers: { ...headers, ...options.headers },
	});
	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(
			`Failed to list ${provider} models (status ${response.status})${body ? `: ${body.slice(0, 500)}` : ''}`,
		);
	}
	return await response.json();
}

function baseUrl(options: ListModelsOptions, fallback: string): string {
	return (options.baseURL ?? fallback).replace(/\/+$/, '');
}

function bearerHeaders(options: ListModelsOptions): Record<string, string> {
	return { Authorization: `Bearer ${options.apiKey}` };
}

function byName(a: ProviderModel, b: ProviderModel): number {
	return a.name.localeCompare(b.name);
}

interface IdItem {
	id?: unknown;
}

function idsToModels(items: IdItem[]): ProviderModel[] {
	return items
		.filter((item): item is { id: string } => typeof item.id === 'string' && item.id !== '')
		.map((item) => ({ id: item.id, name: item.id }));
}

/** Source: LMChatAnthropic `methods/searchModels.ts` (GET /v1/models, newest first). */
export const listAnthropicModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, 'https://api.anthropic.com')}/v1/models`,
		{ 'x-api-key': options.apiKey, 'anthropic-version': '2023-06-01' },
		options,
		'anthropic',
	)) as { data?: Array<{ id: string; display_name?: string; created_at?: string }> };

	return (data.data ?? [])
		.slice()
		.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
		.map((model) => ({ id: model.id, name: model.display_name ?? model.id }));
};

const OFFICIAL_OPENAI_HOSTNAMES = ['api.openai.com', 'ai-assistant.n8n.io'];

/**
 * Source: LMChatOpenAi `methods/loadModels.ts` — on the official API, exclude
 * non-chat model families; on custom (proxy/self-hosted) hosts include all.
 */
export function shouldIncludeOpenAiModel(modelId: string, isCustomApi: boolean): boolean {
	if (isCustomApi) return true;
	return !(
		modelId.startsWith('babbage') ||
		modelId.startsWith('davinci') ||
		modelId.startsWith('computer-use') ||
		modelId.startsWith('dall-e') ||
		modelId.startsWith('text-embedding') ||
		modelId.startsWith('tts') ||
		modelId.includes('-tts') ||
		modelId.startsWith('whisper') ||
		modelId.startsWith('omni-moderation') ||
		modelId.startsWith('sora') ||
		modelId.includes('-realtime') ||
		(modelId.startsWith('gpt-') && modelId.includes('instruct'))
	);
}

/** Source: LMChatOpenAi `methods/loadModels.ts` (GET /models, filtered, id asc). */
export const listOpenAiModels: ListModelsFn = async (options) => {
	const base = baseUrl(options, 'https://api.openai.com/v1');
	const isCustomApi = !OFFICIAL_OPENAI_HOSTNAMES.includes(new URL(base).hostname);
	const data = (await getJson(`${base}/models`, bearerHeaders(options), options, 'openai')) as {
		data?: IdItem[];
	};

	return idsToModels(data.data ?? [])
		.filter((model) => shouldIncludeOpenAiModel(model.id, isCustomApi))
		.sort(byName);
};

/**
 * Source: LmChatGoogleGemini `loadOptions` routing (GET /v1beta/models, key
 * query auth, embedding/imagen excluded). Ids keep Google's `models/` prefix,
 * matching the node dropdown values.
 */
export const listGoogleModels: ListModelsFn = async (options) => {
	const base = baseUrl(options, 'https://generativelanguage.googleapis.com');
	const data = (await getJson(
		`${base}/v1beta/models?key=${encodeURIComponent(options.apiKey)}`,
		{},
		options,
		'google',
	)) as { models?: Array<{ name?: unknown }> };

	return (data.models ?? [])
		.filter(
			(model): model is { name: string } =>
				typeof model.name === 'string' &&
				!model.name.includes('embedding') &&
				!model.name.includes('imagen'),
		)
		.map((model) => ({ id: model.name, name: model.name }))
		.sort(byName);
};

/** Source: LmChatGroq `loadOptions` routing (active model objects only). */
export const listGroqModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, 'https://api.groq.com/openai/v1')}/models`,
		bearerHeaders(options),
		options,
		'groq',
	)) as { data?: Array<{ id?: unknown; active?: unknown; object?: unknown }> };

	return idsToModels(
		(data.data ?? []).filter((model) => model.active === true && model.object === 'model'),
	);
};

/** Source: LmChatMistralCloud `loadOptions` routing (embedding models excluded). */
export const listMistralModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, 'https://api.mistral.ai/v1')}/models`,
		bearerHeaders(options),
		options,
		'mistral',
	)) as { data?: IdItem[] };

	return idsToModels(data.data ?? [])
		.filter((model) => !model.id.includes('embed'))
		.sort(byName);
};

/** Source: LmChatCohere `loadOptions` routing (chat endpoint models only). */
export const listCohereModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, 'https://api.cohere.ai')}/v1/models?page_size=100&endpoint=chat`,
		bearerHeaders(options),
		options,
		'cohere',
	)) as { models?: Array<{ name?: unknown }> };

	return (data.models ?? [])
		.filter((model): model is { name: string } => typeof model.name === 'string')
		.map((model) => ({ id: model.name, name: model.name }))
		.sort(byName);
};

/** Source: LmChatNvidia `loadOptions` routing — mirrors NEMOTRON_SUPPORTED_MODELS. */
const NVIDIA_SUPPORTED_MODELS = new Set([
	'nvidia/llama-3.1-nemotron-nano-8b-v1',
	'nvidia/llama-3.3-nemotron-super-49b-v1',
	'nvidia/llama-3.3-nemotron-super-49b-v1.5',
	'nvidia/nemotron-3-nano-30b-a3b',
	'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
	'nvidia/nemotron-3-super-120b-a12b',
	'nvidia/nemotron-nano-12b-v2-vl',
	'nvidia/nvidia-nemotron-nano-9b-v2',
]);

export const listNvidiaModels: ListModelsFn = async (options) => {
	const data = (await getJson(
		`${baseUrl(options, 'https://integrate.api.nvidia.com/v1')}/models`,
		bearerHeaders(options),
		options,
		'nvidia',
	)) as { data?: IdItem[] };

	return idsToModels(data.data ?? [])
		.filter((model) => NVIDIA_SUPPORTED_MODELS.has(model.id))
		.sort(byName);
};

function makeBearerDataListing(provider: string, defaultBaseUrl: string): ListModelsFn {
	return async (options) => {
		const data = (await getJson(
			`${baseUrl(options, defaultBaseUrl)}/models`,
			bearerHeaders(options),
			options,
			provider,
		)) as { data?: IdItem[] };
		return idsToModels(data.data ?? []).sort(byName);
	};
}

/** Source: LmChatDeepSeek `loadOptions` routing. */
export const listDeepSeekModels = makeBearerDataListing('deepseek', 'https://api.deepseek.com');
/** Source: LmChatOpenRouter `loadOptions` routing. */
export const listOpenRouterModels = makeBearerDataListing(
	'openrouter',
	'https://openrouter.ai/api/v1',
);
/** Source: LmChatXAiGrok `loadOptions` routing. */
export const listXaiModels = makeBearerDataListing('xai', 'https://api.x.ai/v1');
/** Source: LmChatVercelAiGateway `loadOptions` routing. */
export const listVercelModels = makeBearerDataListing('vercel', 'https://ai-gateway.vercel.sh/v1');
