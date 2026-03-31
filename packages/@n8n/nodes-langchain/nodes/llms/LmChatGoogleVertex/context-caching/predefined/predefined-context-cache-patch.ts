import type { BaseMessage } from '@langchain/core/messages';
import type { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs';
import type { ChatVertexAI } from '@langchain/google-vertexai';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import { vertexContextCachePredefinedIgnoredSystemHint } from './hints';
import { stripSystemMessages, stripToolCallOptions } from '../utils';

function hasSystemMessage(messages: BaseMessage[]): boolean {
	return messages.some((m) => m.type === 'system');
}

/**
 * Merges `cachedContent`, strips tools from invocation params, and strips system messages from
 * each generate/stream call (matching auto-cache warm behavior). Warns when workflow system
 * messages would have been sent.
 */
export function applyPredefinedVertexContextCachePatch(
	model: ChatVertexAI,
	ctx: ISupplyDataFunctions,
	cacheResourceName: string,
): void {
	const originalInvocationParams = model.invocationParams.bind(model);
	model.invocationParams = (callOptions) => {
		const merged = originalInvocationParams(callOptions) as Record<string, unknown>;
		const next: Record<string, unknown> = { ...merged };
		delete next.tools;
		delete next.tool_choice;
		delete next.allowed_function_names;
		next.cachedContent = cacheResourceName;
		return next;
	};

	const originalGenerate = model._generate?.bind(model) as
		| ((messages: BaseMessage[], options: object, runManager?: unknown) => Promise<ChatResult>)
		| undefined;

	if (typeof originalGenerate === 'function') {
		model._generate = async (messages, options, runManager) => {
			if (hasSystemMessage(messages)) {
				ctx.addExecutionHints(vertexContextCachePredefinedIgnoredSystemHint());
			}
			return await originalGenerate(
				stripSystemMessages(messages),
				stripToolCallOptions(options as object),
				runManager,
			);
		};
	}

	const originalStream = model._streamResponseChunks?.bind(model) as
		| ((
				messages: BaseMessage[],
				options: object,
				runManager?: unknown,
		  ) => AsyncGenerator<ChatGenerationChunk>)
		| undefined;

	if (typeof originalStream === 'function') {
		model._streamResponseChunks = async function* (messages, options, runManager) {
			if (hasSystemMessage(messages)) {
				ctx.addExecutionHints(vertexContextCachePredefinedIgnoredSystemHint());
			}
			yield* originalStream(
				stripSystemMessages(messages),
				stripToolCallOptions(options as object),
				runManager,
			);
		};
	}
}
