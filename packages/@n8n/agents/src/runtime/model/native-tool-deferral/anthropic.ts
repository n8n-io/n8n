import { isRecord } from '@n8n/utils/is-record';
import type { ModelMessage, ToolResultPart, ToolSet } from 'ai';

import type { ModelConfig, NativeToolDeferralConfig } from '../../../types/sdk/agent';
import {
	addNativeSearchTool,
	deferLocalTools,
	findProviderTool,
	getEffectiveBaseUrl,
	supportsEndpoint,
	type NativeToolCatalog,
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

async function prepareTools(
	tools: ToolSet,
	config: NativeToolDeferralConfig,
): Promise<NativeToolCatalog> {
	const { anthropic } = await import('@ai-sdk/anthropic');
	const bm25Search = anthropic.tools.toolSearchBm25_20251119();
	const regexSearch = anthropic.tools.toolSearchRegex_20251119();
	const configuredSearch = findProviderTool(tools, [bm25Search.id, regexSearch.id]);
	const { tools: nativeTools, hasDeferredTools } = deferLocalTools(tools, 'anthropic', config);
	if (!hasDeferredTools) return { tools: nativeTools, searchToolName: configuredSearch?.[0] };

	const searchTool = configuredSearch?.[1].id === regexSearch.id ? regexSearch : bm25Search;
	return addNativeSearchTool(nativeTools, 'anthropic', searchTool, configuredSearch);
}

function filterToolReferences(part: ToolResultPart, tools: ToolSet): ToolResultPart {
	if (part.output.type !== 'json' || !Array.isArray(part.output.value)) return part;
	// Anthropic rejects saved references when a tool leaves the authorized catalog.
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

function prepareMessages(
	messages: ModelMessage[],
	tools: ToolSet,
	searchToolName?: string,
): ModelMessage[] {
	if (!searchToolName) return messages;

	return messages.flatMap<ModelMessage>((message) => {
		if (message.role !== 'assistant' || typeof message.content === 'string') return [message];

		// The adapter drops search errors but keeps their calls. Remove each failed pair.
		const failedSearchIds = new Set(
			message.content.flatMap((part) =>
				part.type === 'tool-result' &&
				part.toolName === searchToolName &&
				(part.output.type === 'error-json' || part.output.type === 'error-text')
					? [part.toolCallId]
					: [],
			),
		);
		const content = message.content
			.filter((part) => {
				if (part.type !== 'tool-call' && part.type !== 'tool-result') return true;
				return !failedSearchIds.has(part.toolCallId);
			})
			.map((part) =>
				part.type === 'tool-result' && part.toolName === searchToolName
					? filterToolReferences(part, tools)
					: part,
			);
		return content.length > 0 ? [{ ...message, content }] : [];
	});
}

export const anthropicToolDeferral: NativeToolDeferral = {
	supports,
	prepareTools,
	prepareMessages,
};
