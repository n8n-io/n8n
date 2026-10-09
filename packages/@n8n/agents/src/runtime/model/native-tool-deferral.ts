import { splitModelId } from '@n8n/ai-utilities/agent-config';
import { isRecord } from '@n8n/utils/is-record';
import type { Tool, ToolSet } from 'ai';

import type { ModelConfig, NativeToolDeferralConfig } from '../../types/sdk/agent';
import { getModelIdString } from '../../utils/model';
import { loadAi } from './lazy-ai';
import { hasAnthropicCacheControl, mergeProviderOptions } from './prompt-cache';

export type NativeToolDeferralProvider = 'openai' | 'anthropic';

function supportsOpenAiToolSearch(model: string): boolean {
	const version = /^gpt-(\d+)(?:\.(\d+))?(?:-([a-z0-9]+)(?:-[a-z0-9]+)*)?$/.exec(model);
	if (!version) return false;
	const major = Number(version[1]);
	const minor = Number(version[2] ?? 0);
	// The GPT-5.4 Nano model documentation excludes tool search.
	if (major === 5 && minor === 4 && version[3] === 'nano') return false;
	return major > 5 || (major === 5 && minor >= 4);
}

function supportsAnthropicToolSearch(model: string): boolean {
	// A snapshot date must not become the minor version, as in claude-sonnet-4-20250514.
	const alias = model.replace(/-\d{8}$/, '');
	const version = /^claude-[a-z]+-(\d+)(?:-(\d+))?(?:-latest)?$/.exec(alias);
	if (!version) return false;
	const major = Number(version[1]);
	const minor = Number(version[2] ?? 0);
	return major > 4 || (major === 4 && minor >= 5);
}

/** Match the effective endpoint. A provider prefix does not verify a proxy route. */
export function resolveNativeToolDeferralProvider(
	config: ModelConfig,
): NativeToolDeferralProvider | undefined {
	// A pre-built model does not expose its endpoint.
	if (typeof config !== 'string' && 'doGenerate' in config) return undefined;

	const { provider, model } = splitModelId(getModelIdString(config));
	if (provider !== 'openai' && provider !== 'anthropic') return undefined;
	const credentials: Record<string, unknown> = isRecord(config) ? config : {};
	if (provider === 'openai' && credentials.apiStyle === 'chat') return undefined;
	const supportsToolSearch =
		provider === 'openai' ? supportsOpenAiToolSearch(model) : supportsAnthropicToolSearch(model);
	if (!supportsToolSearch) return undefined;

	const configuredUrl = credentials.baseURL ?? (credentials.url || undefined);
	const environmentUrl =
		provider === 'openai' ? process.env.OPENAI_BASE_URL : process.env.ANTHROPIC_BASE_URL;
	const defaultUrl =
		provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.anthropic.com/v1';
	const effectiveUrl = configuredUrl ?? environmentUrl ?? defaultUrl;
	if (typeof effectiveUrl !== 'string') return undefined;

	try {
		const url = new URL(effectiveUrl);
		const path = url.pathname.replace(/\/$/, '');
		const expectedHost = provider === 'openai' ? 'api.openai.com' : 'api.anthropic.com';
		if (
			url.protocol !== 'https:' ||
			url.hostname !== expectedHost ||
			url.port ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		) {
			return undefined;
		}
		if (path !== '/v1' && !(provider === 'anthropic' && path === '')) return undefined;
		return provider;
	} catch {
		return undefined;
	}
}

function eagerTools(tools: ToolSet): ToolSet {
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

type ProviderTool = Extract<Tool, { type: 'provider' }>;

function isNativeSearchTool(
	tool: Tool,
	provider: NativeToolDeferralProvider,
): tool is ProviderTool {
	if (tool.type !== 'provider') return false;
	if (provider === 'openai') return tool.id === 'openai.tool_search';
	return (
		tool.id === 'anthropic.tool_search_bm25_20251119' ||
		tool.id === 'anthropic.tool_search_regex_20251119'
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

async function createSearchTool(
	provider: NativeToolDeferralProvider,
	configuredTool?: ProviderTool,
): Promise<Tool> {
	if (provider === 'openai') {
		const { openai } = await import('@ai-sdk/openai');
		return adaptSearchTool(openai.tools.toolSearch({ execution: 'server' }), configuredTool);
	}
	const { anthropic } = await import('@ai-sdk/anthropic');
	if (
		configuredTool?.type === 'provider' &&
		configuredTool.id === 'anthropic.tool_search_regex_20251119'
	) {
		return adaptSearchTool(anthropic.tools.toolSearchRegex_20251119(), configuredTool);
	}
	return adaptSearchTool(anthropic.tools.toolSearchBm25_20251119(), configuredTool);
}

/** Change model visibility. The local execution registry remains complete. */
export async function applyNativeToolDeferral(
	tools: ToolSet,
	provider: NativeToolDeferralProvider | undefined,
	config: NativeToolDeferralConfig,
): Promise<ToolSet> {
	if (!provider) return eagerTools(tools);

	const configuredSearch = Object.entries(tools).find((entry): entry is [string, ProviderTool] =>
		isNativeSearchTool(entry[1], provider),
	);
	if (
		provider === 'openai' &&
		configuredSearch &&
		configuredSearch[1].type === 'provider' &&
		configuredSearch[1].args.execution === 'client'
	) {
		return eagerTools(tools);
	}

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
	if (!hasDeferredTools) return nativeTools;

	if (configuredSearch) {
		const [name, tool] = configuredSearch;
		nativeTools[name] = await createSearchTool(provider, tool);
		return nativeTools;
	}

	const searchTool = await createSearchTool(provider);
	const baseName = `${provider}.tool_search`;
	let name = baseName;
	let suffix = 2;
	while (name in nativeTools) name = `${baseName}_${suffix++}`;
	nativeTools[name] = searchTool;
	return nativeTools;
}
