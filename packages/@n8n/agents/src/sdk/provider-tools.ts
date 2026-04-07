import type { BuiltProviderTool } from '../types';

interface WebSearchConfig {
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
	anthropicWebSearch(config?: WebSearchConfig): BuiltProviderTool {
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
			name: 'anthropic.web_search_20250305',
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
