import type { ModelConfig } from '../../types/sdk/agent';

export const OPENROUTER_API_BASE_URL = 'https://openrouter.ai/api/v1';

type FetchFn = typeof globalThis.fetch;

/**
 * Ask OpenRouter to prefer one upstream host. Each host keeps its own prompt
 * cache, so a request routed to another host is a guaranteed cache miss.
 * Fallbacks stay allowed: availability wins over a cache hit. A routing
 * preference that the caller already set is left unchanged.
 */
export function withOpenRouterProviderPreference(fetch: FetchFn, upstream: string): FetchFn {
	return async (input, init) => {
		if (init?.method !== 'POST' || typeof init.body !== 'string') return await fetch(input, init);
		let body: unknown;
		try {
			body = JSON.parse(init.body);
		} catch {
			return await fetch(input, init);
		}
		if (typeof body !== 'object' || body === null || Array.isArray(body) || 'provider' in body) {
			return await fetch(input, init);
		}
		const preferred = { ...body, provider: { order: [upstream], allow_fallbacks: true } };
		return await fetch(input, { ...init, body: JSON.stringify(preferred) });
	};
}

/** Claude families that support tool search. Claude 3 and older stay on Chat Completions. */
const TOOL_SEARCH_CLAUDE = /^claude-(?:opus|sonnet|haiku|fable|mythos)-\d/;

/**
 * Route an OpenRouter Claude model to OpenRouter's Anthropic-compatible
 * Messages endpoint (`openrouter-anthropic`). OpenRouter's Chat Completions
 * endpoint rejects tool search, so this is what gives OpenRouter Claude models
 * provider tool search and Anthropic prompt caching.
 *
 * The OpenRouter slug (`anthropic/claude-sonnet-4.6`) becomes the Anthropic
 * model name (`claude-sonnet-4-6`), which the Messages endpoint accepts and
 * which every Anthropic model check in the runtime recognizes. Other models,
 * and variant slugs such as `:thinking`, are returned unchanged.
 */
export function routeOpenRouterClaudeModel<T extends ModelConfig>(config: T): T;
export function routeOpenRouterClaudeModel(config: unknown): unknown {
	if (typeof config === 'string') return routeModelId(config) ?? config;
	if (typeof config !== 'object' || config === null) return config;
	if (!('id' in config) || typeof config.id !== 'string') return config;
	const id = routeModelId(config.id);
	return id ? { ...config, id } : config;
}

function routeModelId(id: string): `${string}/${string}` | undefined {
	const match = /^openrouter\/anthropic\/(claude-[a-z0-9.-]+)$/.exec(id);
	if (!match) return undefined;
	const modelName = match[1].replace(/\./g, '-');
	return TOOL_SEARCH_CLAUDE.test(modelName) ? `openrouter-anthropic/${modelName}` : undefined;
}
