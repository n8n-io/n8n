import type { ToolSet } from 'ai';

import type { ModelConfig, NativeToolDeferralConfig } from '../../../types/sdk/agent';
import {
	addNativeSearchTool,
	deferLocalTools,
	findProviderTool,
	getEffectiveBaseUrl,
	supportsEndpoint,
	type NativeToolDeferral,
} from '../native-tool-deferral';

function supportsModel(model: string): boolean {
	// A snapshot date must not become the minor version, as in claude-sonnet-4-20250514.
	const alias = model.replace(/-\d{8}$/, '');
	const version = /^claude-[a-z]+-(\d+)(?:-(\d+))?(?:-latest)?$/.exec(alias);
	if (!version) return false;
	const major = Number(version[1]);
	const minor = Number(version[2] ?? 0);
	return major > 4 || (major === 4 && minor >= 5);
}

function supports(model: string, config: ModelConfig): boolean {
	if (!supportsModel(model)) return false;
	const effectiveUrl = getEffectiveBaseUrl(
		config,
		process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1',
	);
	return supportsEndpoint(effectiveUrl, 'https://api.anthropic.com', ['/v1', '']);
}

async function prepareTools(tools: ToolSet, config: NativeToolDeferralConfig): Promise<ToolSet> {
	const configuredSearch = findProviderTool(tools, [
		'anthropic.tool_search_bm25_20251119',
		'anthropic.tool_search_regex_20251119',
	]);
	const { tools: nativeTools, hasDeferredTools } = deferLocalTools(tools, 'anthropic', config);
	if (!hasDeferredTools) return nativeTools;

	const { anthropic } = await import('@ai-sdk/anthropic');
	const searchTool =
		configuredSearch?.[1].id === 'anthropic.tool_search_regex_20251119'
			? anthropic.tools.toolSearchRegex_20251119()
			: anthropic.tools.toolSearchBm25_20251119();
	return addNativeSearchTool(nativeTools, 'anthropic', searchTool, configuredSearch);
}

export const anthropicToolDeferral: NativeToolDeferral = {
	supports,
	prepareTools,
};
