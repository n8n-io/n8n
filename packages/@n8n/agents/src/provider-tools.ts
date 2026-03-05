import type { BuiltProviderTool, ProviderDefinedTool } from './types';

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
		// This creates a provider-defined tool object that Mastra/AI SDK
		// pass through to the Anthropic API as a server tool.
		const toolDef: ProviderDefinedTool = {
			type: 'provider-defined',
			id: 'anthropic.web_search_20250305',
			args: {},
		};

		if (config?.maxUses !== undefined) {
			toolDef.args.maxUses = config.maxUses;
		}
		if (config?.allowedDomains) {
			toolDef.args.allowedDomains = config.allowedDomains;
		}
		if (config?.blockedDomains) {
			toolDef.args.blockedDomains = config.blockedDomains;
		}
		if (config?.userLocation) {
			toolDef.args.userLocation = config.userLocation;
		}

		return {
			name: 'web_search',
			_providerTool: toolDef,
		};
	},

	openaiImageGeneration(): BuiltProviderTool {
		const toolDef: ProviderDefinedTool = {
			type: 'provider-defined',
			id: 'openai.image_generation',
			args: {},
		};
		return {
			name: 'image_generation',
			_providerTool: toolDef,
		};
	},
};
