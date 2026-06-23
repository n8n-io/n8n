import type { BuiltProviderTool } from '../types';

interface AnthropicWebSearchConfig {
	maxUses?: number;
	allowedDomains?: string[];
	blockedDomains?: string[];
	userLocation?: {
		type: 'approximate';
		city?: string;
		region?: string;
		country?: string;
		timezone?: string;
	};
}

interface OpenAIWebSearchConfig {
	/**
	 * When set to `true`, lets the model fetch page content from the open web.
	 * Defaults to OpenAI's own defaults when omitted.
	 */
	externalWebAccess?: boolean;
	/** Restrict results to the given domains (allow-list). */
	filters?: {
		allowedDomains?: string[];
	};
	/**
	 * How much surrounding page content to include per result. Trades off
	 * token cost against answer quality. Defaults to OpenAI's own default.
	 */
	searchContextSize?: 'low' | 'medium' | 'high';
	userLocation?: {
		type: 'approximate';
		city?: string;
		region?: string;
		country?: string;
		timezone?: string;
	};
}

/**
 * Factory for creating provider-defined tools.
 *
 * Provider tools are native capabilities offered by LLM providers
 * (e.g. Anthropic's web search, OpenAI's code interpreter) that run
 * on the provider's infrastructure rather than locally.
 */
export const providerTools = {
	/**
	 * Anthropic's web search tool — gives the model access to real-time
	 * web content with automatic source citations.
	 *
	 * Requires web search to be enabled in your Anthropic Console settings.
	 *
	 * @example
	 * ```typescript
	 * const agent = new Agent('researcher')
	 *   .model('anthropic/claude-sonnet-4-5')
	 *   .instructions('Research topics using web search.')
	 *   .providerTool(providerTools.anthropicWebSearch())
	 *   .build();
	 * ```
	 */
	anthropicWebSearch(config?: AnthropicWebSearchConfig): BuiltProviderTool {
		const args: Record<string, unknown> = {};

		if (config?.maxUses !== undefined) {
			args.maxUses = config.maxUses;
		}
		if (config?.allowedDomains) {
			args.allowedDomains = config.allowedDomains;
		}
		if (config?.blockedDomains) {
			args.blockedDomains = config.blockedDomains;
		}
		if (config?.userLocation) {
			args.userLocation = config.userLocation;
		}

		return {
			// Intentionally on the pre-dynamic-filtering version. The newer
			// `web_search_20260209` forces a server-side code-execution pipeline
			// (the AI SDK auto-adds the `code-execution-web-tools-2026-02-09`
			// beta) which is slower, emits code_execution tool results on every
			// search, and is only officially supported on Sonnet 4.6 / Opus 4.6
			// / Opus 4.7. The 20250305 version is fast, stable, and works
			// across all Claude models that support web search.
			// See https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
			name: 'anthropic.web_search_20250305',
			args,
		};
	},

	/**
	 * OpenAI's web search tool — available via the Responses API. Gives the
	 * model access to real-time web content with automatic citations.
	 *
	 * Only works on models that the Responses API supports (e.g. GPT-4o
	 * and successors). Older chat-completions-only models will reject it.
	 *
	 * @example
	 * ```typescript
	 * const agent = new Agent('researcher')
	 *   .model('openai/gpt-4o')
	 *   .instructions('Research topics using web search.')
	 *   .providerTool(providerTools.openaiWebSearch({ searchContextSize: 'medium' }))
	 *   .build();
	 * ```
	 */
	openaiWebSearch(config?: OpenAIWebSearchConfig): BuiltProviderTool {
		const args: Record<string, unknown> = {};

		if (config?.externalWebAccess !== undefined) {
			args.externalWebAccess = config.externalWebAccess;
		}
		if (config?.filters) {
			args.filters = config.filters;
		}
		if (config?.searchContextSize) {
			args.searchContextSize = config.searchContextSize;
		}
		if (config?.userLocation) {
			args.userLocation = config.userLocation;
		}

		return {
			name: 'openai.web_search',
			args,
		};
	},

	openaiImageGeneration(): BuiltProviderTool {
		return {
			name: 'openai.image_generation',
			args: {},
		};
	},
};
