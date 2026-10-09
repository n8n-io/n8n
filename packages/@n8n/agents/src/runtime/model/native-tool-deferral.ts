import { isRecord } from '@n8n/utils/is-record';
import type { Tool, ToolSet } from 'ai';

import type { ModelConfig, NativeToolDeferralConfig } from '../../types/sdk/agent';
import { loadAi } from './lazy-ai';
import { hasAnthropicCacheControl, mergeProviderOptions } from './prompt-cache';

type NativeToolDeferralProvider = 'openai' | 'anthropic';

export interface NativeToolDeferral {
	supports: (model: string, config: ModelConfig) => boolean;
	prepareTools: (tools: ToolSet, config: NativeToolDeferralConfig) => Promise<ToolSet>;
}

export function getEffectiveBaseUrl(config: ModelConfig, fallbackUrl: string): unknown {
	const credentials: Record<string, unknown> = isRecord(config) ? config : {};
	return credentials.baseURL ?? (credentials.url || fallbackUrl);
}

export function supportsEndpoint(
	effectiveUrl: unknown,
	origin: string,
	allowedPaths: readonly string[],
): boolean {
	if (typeof effectiveUrl !== 'string') return false;
	try {
		const url = new URL(effectiveUrl);
		return (
			url.origin === origin &&
			allowedPaths.includes(url.pathname.replace(/\/$/, '')) &&
			!url.username &&
			!url.password &&
			!url.search &&
			!url.hash
		);
	} catch {
		return false;
	}
}

/** Change model visibility. The local execution registry remains complete. */
export async function applyNativeToolDeferral(
	tools: ToolSet,
	implementation: NativeToolDeferral | undefined,
	config: NativeToolDeferralConfig,
): Promise<ToolSet> {
	if (!implementation) return eagerTools(tools);
	return await implementation.prepareTools(tools, config);
}

export function eagerTools(tools: ToolSet): ToolSet {
	return Object.fromEntries(
		Object.entries(tools).map(([name, tool]) => {
			if (tool.type === 'provider') return [name, tool];
			let providerOptions = tool.providerOptions;
			for (const provider of ['openai', 'anthropic']) {
				if (providerOptions?.[provider]?.deferLoading !== true) continue;
				providerOptions = mergeProviderOptions(providerOptions, {
					[provider]: { deferLoading: false },
				});
			}
			return [name, { ...tool, providerOptions }];
		}),
	);
}

export function deferLocalTools(
	tools: ToolSet,
	provider: NativeToolDeferralProvider,
	config: NativeToolDeferralConfig,
) {
	const eagerNames = new Set(config.eagerToolNames);
	let hasDeferredTools = false;
	const nativeTools: ToolSet = {};
	for (const [name, tool] of Object.entries(tools)) {
		if (tool.type === 'provider') {
			nativeTools[name] = tool;
			continue;
		}
		const deferLoading =
			!eagerNames.has(name) &&
			!hasAnthropicCacheControl(tool.providerOptions) &&
			tool.providerOptions?.[provider]?.deferLoading !== false;
		hasDeferredTools ||= deferLoading;
		nativeTools[name] = {
			...tool,
			providerOptions: mergeProviderOptions(tool.providerOptions, {
				[provider]: { deferLoading },
			}),
		};
	}
	return { tools: nativeTools, hasDeferredTools };
}

export type ProviderTool = Extract<Tool, { type: 'provider' }>;

export function findProviderTool(tools: ToolSet, ids: readonly string[]) {
	return Object.entries(tools).find(
		(entry): entry is [string, ProviderTool] =>
			entry[1].type === 'provider' && ids.includes(entry[1].id),
	);
}

type NativeSearchTool =
	| ReturnType<typeof import('@ai-sdk/openai')['openai']['tools']['toolSearch']>
	| ReturnType<typeof import('@ai-sdk/anthropic')['anthropic']['tools']['toolSearchBm25_20251119']>
	| ReturnType<
			typeof import('@ai-sdk/anthropic')['anthropic']['tools']['toolSearchRegex_20251119']
	  >;

function adaptSearchTool(nativeTool: NativeSearchTool, configuredTool?: ProviderTool): Tool {
	const { inputSchema, outputSchema } = nativeTool;
	if (typeof inputSchema !== 'function' || typeof outputSchema !== 'function') {
		throw new Error('Native tool search requires lazy provider schemas.');
	}
	const input = inputSchema();
	const output = outputSchema();
	const { jsonSchema } = loadAi();
	// Adapters use separate provider-utils versions. Keep their schemas and validators.
	return {
		type: 'provider',
		id: nativeTool.id,
		args: nativeTool.args,
		...('supportsDeferredResults' in nativeTool
			? { supportsDeferredResults: nativeTool.supportsDeferredResults }
			: {}),
		inputSchema: jsonSchema<unknown>(input.jsonSchema, { validate: input.validate }),
		outputSchema: jsonSchema<unknown>(output.jsonSchema, { validate: output.validate }),
		...configuredTool,
		isProviderExecuted: true,
	};
}

export function addNativeSearchTool(
	tools: ToolSet,
	provider: NativeToolDeferralProvider,
	nativeTool: NativeSearchTool,
	configuredSearch?: [string, ProviderTool],
): ToolSet {
	const searchTool = adaptSearchTool(nativeTool, configuredSearch?.[1]);
	if (configuredSearch) {
		tools[configuredSearch[0]] = searchTool;
		return tools;
	}

	const baseName = `${provider}.tool_search`;
	let name = baseName;
	let suffix = 2;
	while (name in tools) name = `${baseName}_${suffix++}`;
	tools[name] = searchTool;
	return tools;
}
