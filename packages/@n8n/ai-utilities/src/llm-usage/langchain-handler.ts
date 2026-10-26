import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { Serialized } from '@langchain/core/load/serializable';
import { AIMessage, AIMessageChunk, type BaseMessage } from '@langchain/core/messages';
import type { LLMResult } from '@langchain/core/outputs';

import { reportLlmUsage } from './report';
import type { LlmCallContext, LlmUsageCredential } from './types';

interface RunStart {
	startedAt: Date;
	provider?: string;
	model?: string;
}

const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const asCount = (value: unknown) =>
	typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * Keeps the start of each LangChain LLM run and reports its usage when it ends. Owned by one
 * callback handler, so the run map is freed with it and cannot grow across executions.
 */
export class LangChainUsageTracker {
	private readonly runs = new Map<string, RunStart>();

	start(runId: string, metadata?: Record<string, unknown>) {
		this.runs.set(runId, {
			startedAt: new Date(),
			provider: asString(metadata?.ls_provider),
			model: asString(metadata?.ls_model_name),
		});
	}

	discard(runId: string) {
		this.runs.delete(runId);
	}

	/**
	 * Reports each generation that carries usage. Call it before the result is changed.
	 * `provider` wins over what the library reports: the caller can know the vendor better,
	 * for example from the node's credential.
	 */
	end(
		output: LLMResult,
		runId: string,
		context?: LlmCallContext,
		provider?: string,
		credential?: LlmUsageCredential,
	) {
		const run = this.runs.get(runId);
		this.runs.delete(runId);
		const finishedAt = new Date();
		let reported = false;

		for (const [generation] of output.generations) {
			const message = generation && 'message' in generation ? generation.message : undefined;
			if (!AIMessage.isInstance(message) && !AIMessageChunk.isInstance(message)) continue;
			const usage = message.usage_metadata;
			if (!usage) continue;

			const metadata = message.response_metadata;
			reportLlmUsage(
				{
					// The AI node SDK adapter puts its provider into the response metadata, while
					// LangChain names the adapter class in `ls_provider`.
					provider: provider ?? asString(metadata.provider) ?? run?.provider ?? 'unknown',
					model:
						asString(metadata.model_name) ?? asString(metadata.model) ?? run?.model ?? 'unknown',
					providerResponseId: message.id,
					inputTokens: usage.input_tokens,
					// Some integrations (Gemini) leave reasoning tokens out of the output, but not
					// out of the total. They are billed as output.
					outputTokens: Math.max(usage.output_tokens, usage.total_tokens - usage.input_tokens),
					cacheReadTokens: usage.input_token_details?.cache_read,
					cacheWriteTokens: usage.input_token_details?.cache_creation,
					startedAt: run?.startedAt,
					finishedAt,
					subType: 'llm',
					credential,
				},
				context,
			);
			reported = true;
		}

		// Text-completion models have no chat message: their usage is in the run output.
		const tokenUsage: unknown = output.llmOutput?.tokenUsage;
		if (reported || typeof tokenUsage !== 'object' || tokenUsage === null) return;
		const inputTokens = asCount(Reflect.get(tokenUsage, 'promptTokens'));
		const outputTokens = asCount(Reflect.get(tokenUsage, 'completionTokens'));
		if (inputTokens === undefined && outputTokens === undefined) return;
		reportLlmUsage(
			{
				provider: provider ?? run?.provider ?? 'unknown',
				model: run?.model ?? 'unknown',
				inputTokens: inputTokens ?? 0,
				outputTokens: outputTokens ?? 0,
				startedAt: run?.startedAt,
				finishedAt,
				subType: 'llm',
				credential,
			},
			context,
		);
	}
}

/** Reports the LangChain LLM calls of one scope with the scope's context. */
export class LlmUsageCallbackHandler extends BaseCallbackHandler {
	// LangChain dedupes configure-hook handlers by name.
	name = 'n8n_llm_usage';

	// Without this, LangChain runs the handler on a background queue, so the times would be the
	// queue's, not the call's. The handler is synchronous, so waiting for it costs nothing.
	awaitHandlers = true;

	private readonly tracker = new LangChainUsageTracker();

	constructor(private readonly context: LlmCallContext) {
		super();
	}

	handleLLMStart(
		_llm: Serialized,
		_prompts: string[],
		runId: string,
		_parentRunId?: string,
		_extraParams?: Record<string, unknown>,
		_tags?: string[],
		metadata?: Record<string, unknown>,
	) {
		this.tracker.start(runId, metadata);
	}

	handleChatModelStart(
		_llm: Serialized,
		_messages: BaseMessage[][],
		runId: string,
		_parentRunId?: string,
		_extraParams?: Record<string, unknown>,
		_tags?: string[],
		metadata?: Record<string, unknown>,
	) {
		this.tracker.start(runId, metadata);
	}

	handleLLMError(_error: unknown, runId: string) {
		this.tracker.discard(runId);
	}

	handleLLMEnd(output: LLMResult, runId: string) {
		this.tracker.end(output, runId, this.context);
	}
}
