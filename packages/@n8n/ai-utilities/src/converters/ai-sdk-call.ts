import type {
	LanguageModelV3CallOptions,
	LanguageModelV3FinishReason,
	LanguageModelV3Usage,
	SharedV3Warning,
} from '@ai-sdk/provider';
import { isJSONObject } from '@ai-sdk/provider';

import type { ChatModel, ChatModelConfig } from '../types/chat-model';
import type { FinishReason, TokenUsage } from '../types/output';
import type { FunctionTool } from '../types/tool';

/** Binds the tools and the output schema of an AI SDK call to a chat model. */
export function bindCallTools(
	chatModel: ChatModel,
	options: LanguageModelV3CallOptions,
): { model: ChatModel; warnings: SharedV3Warning[] } {
	const warnings: SharedV3Warning[] = [];
	const functionTools: FunctionTool[] = [];
	let model = chatModel;

	for (const tool of options.tools ?? []) {
		if (tool.type === 'function') {
			functionTools.push({
				type: 'function',
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputSchema,
				strict: tool.strict,
				providerOptions: tool.providerOptions,
			});
		} else {
			// A provider tool needs the chat model to declare that it supports it.
			// The contract has no such declaration yet, so the tool is dropped.
			warnings.push({ type: 'unsupported', feature: `provider tool ${tool.id}` });
		}
	}

	if (functionTools.length > 0) {
		model = model.withTools(functionTools);
	}

	if (options.toolChoice && options.toolChoice.type !== 'auto') {
		warnings.push({ type: 'unsupported', feature: `toolChoice ${options.toolChoice.type}` });
	}

	if (options.responseFormat?.type === 'json') {
		const { schema } = options.responseFormat;
		if (model.withStructuredOutput && schema) {
			model = model.withStructuredOutput({ ...schema });
		} else {
			warnings.push({ type: 'unsupported', feature: 'responseFormat json' });
		}
	}

	return { model, warnings };
}

/** Converts the sampling settings of an AI SDK call into a chat model config. */
export function toChatModelConfig(options: LanguageModelV3CallOptions): ChatModelConfig {
	// Only set the fields the caller set. Chat models spread this config over
	// their defaults, and an explicit `undefined` would erase a default.
	const config: ChatModelConfig = {};
	if (options.maxOutputTokens !== undefined) config.maxTokens = options.maxOutputTokens;
	if (options.temperature !== undefined) config.temperature = options.temperature;
	if (options.topP !== undefined) config.topP = options.topP;
	if (options.topK !== undefined) config.topK = options.topK;
	if (options.presencePenalty !== undefined) config.presencePenalty = options.presencePenalty;
	if (options.frequencyPenalty !== undefined) config.frequencyPenalty = options.frequencyPenalty;
	if (options.stopSequences !== undefined) config.stopSequences = options.stopSequences;
	if (options.seed !== undefined) config.seed = options.seed;
	if (options.abortSignal !== undefined) config.abortSignal = options.abortSignal;
	if (options.headers !== undefined) config.headers = options.headers;
	return config;
}

export function toFinishReason(reason: FinishReason | undefined): LanguageModelV3FinishReason {
	// The chat model contract only carries the unified reason.
	return { unified: reason ?? 'other', raw: undefined };
}

export function toUsage(usage: TokenUsage | undefined): LanguageModelV3Usage {
	const raw = usage?.additionalMetadata;
	const cacheRead = usage?.inputTokenDetails?.cacheRead;
	const reasoning = usage?.outputTokenDetails?.reasoning;
	return {
		inputTokens: {
			total: usage?.promptTokens,
			// `promptTokens` includes the cached tokens, like LangChain's `input_tokens`.
			noCache: usage ? Math.max(0, usage.promptTokens - (cacheRead ?? 0)) : undefined,
			cacheRead,
			cacheWrite: undefined,
		},
		outputTokens: {
			total: usage?.completionTokens,
			text: usage ? Math.max(0, usage.completionTokens - (reasoning ?? 0)) : undefined,
			reasoning,
		},
		raw: isJSONObject(raw) ? raw : undefined,
	};
}
