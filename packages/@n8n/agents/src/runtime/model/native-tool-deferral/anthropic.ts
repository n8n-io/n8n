import { isRecord } from '@n8n/utils/is-record';
import type { ModelMessage, ToolResultPart, ToolSet } from 'ai';

import type { ModelConfig, NativeToolDeferralConfig } from '../../../types/sdk/agent';
import {
	addNativeSearchTool,
	deferLocalTools,
	findProviderTool,
	getEffectiveBaseUrl,
	supportsEndpoint,
	type NativeToolDeferral,
} from '../native-tool-deferral';

const SEARCH_TOOL_IDS = [
	'anthropic.tool_search_bm25_20251119',
	'anthropic.tool_search_regex_20251119',
];

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
	const configuredSearch = findProviderTool(tools, SEARCH_TOOL_IDS);
	const { tools: nativeTools, hasDeferredTools } = deferLocalTools(tools, 'anthropic', config);
	if (!hasDeferredTools) return nativeTools;

	const { anthropic } = await import('@ai-sdk/anthropic');
	const searchTool =
		configuredSearch?.[1].id === 'anthropic.tool_search_regex_20251119'
			? anthropic.tools.toolSearchRegex_20251119()
			: anthropic.tools.toolSearchBm25_20251119();
	return addNativeSearchTool(nativeTools, 'anthropic', searchTool, configuredSearch);
}

function filterToolReferences(part: ToolResultPart, tools: ToolSet): ToolResultPart {
	if (part.output.type !== 'json' || !Array.isArray(part.output.value)) return part;
	const value = part.output.value.filter((reference) => {
		if (
			!isRecord(reference) ||
			reference.type !== 'tool_reference' ||
			typeof reference.toolName !== 'string'
		) {
			return true;
		}
		return Object.hasOwn(tools, reference.toolName);
	});
	if (value.length === part.output.value.length) return part;
	return { ...part, output: { ...part.output, value } };
}

function prepareMessages(messages: ModelMessage[], tools: ToolSet): ModelMessage[] {
	const searchToolNames = new Set(
		Object.entries(tools)
			.filter(([, tool]) => tool.type === 'provider' && SEARCH_TOOL_IDS.includes(tool.id))
			.map(([name]) => name),
	);
	if (searchToolNames.size === 0) return messages;

	// Anthropic rejects saved references when a tool leaves the authorized catalog.
	return messages.map((message) => {
		if (message.role !== 'assistant' || typeof message.content === 'string') return message;
		return {
			...message,
			content: message.content.map((part) =>
				part.type === 'tool-result' && searchToolNames.has(part.toolName)
					? filterToolReferences(part, tools)
					: part,
			),
		};
	});
}

export const anthropicToolDeferral: NativeToolDeferral = {
	supports,
	prepareTools,
	prepareMessages,
};
