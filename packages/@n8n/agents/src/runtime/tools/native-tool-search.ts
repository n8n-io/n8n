import type { LanguageModel } from 'ai';

import type { BuiltProviderTool, BuiltTool, ModelConfig } from '../../types';
import { createModel } from '../model/model-factory';

/**
 * Provider-side tool search. The provider holds the deferred tool definitions
 * out of the model's context and runs the search on its own servers, so a
 * deferred tool costs no extra model round trip and discovering one does not
 * rewrite the cached prompt prefix.
 */
export interface NativeToolSearch {
	/** `providerOptions` namespace that carries the per-tool `deferLoading` flag. */
	namespace: 'anthropic' | 'openai';
	/** The provider-executed search tool that must sit in the same request. */
	searchTool: BuiltProviderTool;
}

const ANTHROPIC_TOOL_SEARCH: NativeToolSearch = {
	namespace: 'anthropic',
	// BM25 takes natural-language queries. The regex variant makes the model
	// write patterns, which it does worse for a catalogue of domain tools.
	searchTool: { name: 'anthropic.tool_search_bm25_20251119', args: {} },
};

const OPENAI_TOOL_SEARCH: NativeToolSearch = {
	namespace: 'openai',
	// Hosted execution: OpenAI runs the search, so the loop never sees a call to run.
	searchTool: { name: 'openai.tool_search', args: {} },
};

/** Claude 3.x models predate tool search and reject the search tool. */
const ANTHROPIC_WITHOUT_TOOL_SEARCH = /claude-(?:3|instant|v?2)/;

/** OpenAI serves tool search on the Responses API from GPT-5.4 on. */
function openAiModelSupportsToolSearch(modelId: string): boolean {
	const match = /(?:^|\/)gpt-(\d+)(?:\.(\d+))?/.exec(modelId);
	if (!match) return false;
	const major = Number(match[1]);
	const minor = Number(match[2] ?? 0);
	return major > 5 || (major === 5 && minor >= 4);
}

/**
 * Pick the provider-side tool search for a built model, or `undefined` when
 * the runtime must fall back to the local `search_tools` / `load_tool` pair.
 *
 * Detection reads the AI SDK `provider` string instead of the model id prefix:
 * only the wire API decides support. `openai.chat` and every OpenAI-compatible
 * gateway, OpenRouter included, go through Chat Completions, where tool search
 * does not exist.
 */
export function resolveNativeToolSearch(model: LanguageModel): NativeToolSearch | undefined {
	if (typeof model === 'string') return undefined;
	const { provider, modelId } = model;

	// `anthropic.messages` and `vertex.anthropic.messages` (Claude on Vertex).
	if (provider.endsWith('anthropic.messages')) {
		return ANTHROPIC_WITHOUT_TOOL_SEARCH.test(modelId) ? undefined : ANTHROPIC_TOOL_SEARCH;
	}
	if (provider === 'openai.responses') {
		return openAiModelSupportsToolSearch(modelId) ? OPENAI_TOOL_SEARCH : undefined;
	}
	return undefined;
}

/**
 * Whether a model config gets provider-side tool search. Hosts use it to size
 * the always-loaded toolset: a deferred tool is cheap with native search and
 * costs two extra model calls without it.
 */
export function supportsNativeToolSearch(model: ModelConfig): boolean {
	try {
		return resolveNativeToolSearch(createModel(model)) !== undefined;
	} catch {
		// An unbuildable config fails later with a real error. Here it only means
		// "no native search", which keeps the conservative toolset.
		return false;
	}
}

/** Mark a tool as deferred for the given provider. Explicit tool options win. */
export function withDeferLoading(tool: BuiltTool, namespace: NativeToolSearch['namespace']) {
	const existing = tool.providerOptions?.[namespace];
	return {
		...tool,
		providerOptions: {
			...tool.providerOptions,
			[namespace]: { deferLoading: true, ...existing },
		},
	} satisfies BuiltTool;
}
