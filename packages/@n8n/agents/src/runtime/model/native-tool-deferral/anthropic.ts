import { isRecord } from '@n8n/utils/is-record';
import type { ToolSet } from 'ai';

import type { ModelConfig, NativeToolDeferralConfig } from '../../../types/sdk/agent';
import {
	addNativeSearchTool,
	deferLocalTools,
	type NativeToolDeferral,
	type ProviderTool,
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

function supportsEndpoint(effectiveUrl: unknown): boolean {
	if (typeof effectiveUrl !== 'string') return false;
	try {
		const url = new URL(effectiveUrl);
		const path = url.pathname.replace(/\/$/, '');
		return (
			url.origin === 'https://api.anthropic.com' &&
			(path === '/v1' || path === '') &&
			!url.username &&
			!url.password &&
			!url.search &&
			!url.hash
		);
	} catch {
		return false;
	}
}

function supports(model: string, config: ModelConfig): boolean {
	if (!supportsModel(model)) return false;
	const credentials: Record<string, unknown> = isRecord(config) ? config : {};
	const configuredUrl = credentials.baseURL ?? (credentials.url || undefined);
	const effectiveUrl =
		configuredUrl ?? process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com/v1';
	return supportsEndpoint(effectiveUrl);
}

async function prepareTools(tools: ToolSet, config: NativeToolDeferralConfig): Promise<ToolSet> {
	const configuredSearch = Object.entries(tools).find(
		(entry): entry is [string, ProviderTool] =>
			entry[1].type === 'provider' &&
			(entry[1].id === 'anthropic.tool_search_bm25_20251119' ||
				entry[1].id === 'anthropic.tool_search_regex_20251119'),
	);
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
