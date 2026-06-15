import type {
	CompleteEmission,
	ModelCallContext,
	ModelTurnResult,
	RunOutputSink,
	RunServices,
	SuspendEmission,
} from './run-output-sink';
import type { ExecutionOptions } from '../../types/sdk/agent';
import { loadAi } from '../model/lazy-ai';
import { fromAiFinishReason, fromAiMessages } from '../model/messages';
import { convertChunk } from '../streaming/stream';
import type { StreamWriterGuard } from '../streaming/stream-writer-guard';
import type { ToolCallBatchResult } from '../tools/tool-call-executor';

/**
 * Streaming output sink: drives the loop with `streamText`, forwards text /
 * reasoning / tool chunks (and provider-executed tool timing) through the
 * `StreamWriterGuard`, and writes the terminal `finish` / `tool-call-suspended`
 * chunks. Owns the smooth-stream transform option.
 */
export class StreamSink implements RunOutputSink<void> {
	constructor(
		private readonly guard: StreamWriterGuard,
		private readonly services: RunServices,
		private readonly options: ExecutionOptions | undefined,
	) {}

	private buildSmoothStreamTransformOptions(): {
		experimental_transform?: ReturnType<ReturnType<typeof loadAi>['smoothStream']>;
	} {
		if (this.options?.smoothStream === false) return {};
		const { smoothStream } = loadAi();
		return { experimental_transform: smoothStream(this.options?.smoothStream ?? {}) };
	}

	async callModel(ctx: ModelCallContext): Promise<ModelTurnResult> {
		const { streamText } = loadAi();
		const result = streamText({
			model: ctx.model,
			system: ctx.system,
			messages: ctx.messages,
			abortSignal: ctx.abortSignal,
			...(ctx.hasTools ? { tools: ctx.aiTools } : {}),
			...(ctx.providerOptions ? { providerOptions: ctx.providerOptions } : {}),
			...(ctx.outputSpec ? { output: ctx.outputSpec } : {}),
			...ctx.aiSdkOptions,
			...this.buildSmoothStreamTransformOptions(),
		});

		// Consume the stream. When the AbortSignal fires mid-stream the AI SDK
		// cancels the underlying fetch and the async iterator throws; the error
		// propagates to the StreamSession which closes the consumer stream.
		for await (const chunk of result.fullStream) {
			// Filter only the SDK's terminal `finish` chunk — the runtime emits its
			// own consolidated `finish` after the loop completes. `start-step` /
			// `finish-step` are passed through as LLM-iteration boundaries.
			if (chunk.type === 'finish') continue;

			// Provider-executed tools (e.g. native web search) skip the local
			// execution loop that emits tool-execution lifecycle events via the
			// event bus. Stamp them here at chunk-arrival time so live chat and the
			// persisted timeline both show a duration. A failed call arrives as a
			// `tool-error` part (never a `tool-result`), so close its timing there.
			if ((chunk.type === 'tool-result' || chunk.type === 'tool-error') && chunk.providerExecuted) {
				await this.guard.write({
					type: 'tool-execution-end',
					toolCallId: chunk.toolCallId,
					toolName: chunk.toolName ?? '',
					isError: chunk.type === 'tool-error',
					endTime: Date.now(),
				});
			}

			const converted = convertChunk(chunk);
			if (converted) await this.guard.write(converted);

			if (chunk.type === 'tool-call' && chunk.providerExecuted) {
				await this.guard.write({
					type: 'tool-execution-start',
					toolCallId: chunk.toolCallId,
					toolName: chunk.toolName ?? '',
					startTime: Date.now(),
				});
			}
		}

		const aiFinishReason = await result.finishReason;
		const usage = await result.usage;
		const response = await result.response;

		return {
			aiFinishReason,
			finishReason: fromAiFinishReason(aiFinishReason),
			usage,
			newMessages: fromAiMessages(response.messages),
			toolCalls: await result.toolCalls,
			structuredOutput:
				ctx.outputSpec && aiFinishReason !== 'tool-calls' ? await result.output : undefined,
		};
	}

	async emitToolBatch(batch: ToolCallBatchResult): Promise<void> {
		for (const r of batch.results) {
			await this.guard.write({
				type: 'tool-result',
				toolCallId: r.toolCallId,
				toolName: r.toolName,
				output: r.modelOutput,
				...(r.toolEntry.canceled ? { canceled: true } : {}),
			});
			if (r.customMessage) {
				await this.guard.write({ type: 'message', message: r.customMessage });
			}
		}

		for (const e of batch.errors) {
			await this.guard.write({
				type: 'tool-result',
				toolCallId: e.toolCallId,
				toolName: e.toolName,
				output: e.error,
				isError: true,
			});
		}
	}

	async finishSuspended(emission: SuspendEmission): Promise<void> {
		for (const s of emission.suspensions) {
			await this.guard.write({
				type: 'tool-call-suspended',
				runId: emission.suspendRunId,
				toolCallId: s.toolCallId,
				toolName: s.toolName,
				input: s.input,
				suspendPayload: s.payload,
				resumeSchema: s.resumeSchema,
			});
		}
		await this.guard.write({ type: 'finish', finishReason: 'tool-calls' });
		await this.guard.close();
	}

	async finishComplete(emission: CompleteEmission): Promise<void> {
		const { list, options, finishReason, usage, structuredOutput } = emission;
		const costUsage = this.services.applyCost(usage);

		await this.services.saveToMemory(list, options);
		await this.services.maybeGenerateTitle(list, options);
		await this.services.cleanupRun();
		await this.services.flushTelemetry(options);

		await this.guard.write({
			type: 'finish',
			finishReason,
			...(costUsage && { usage: costUsage }),
			model: this.services.modelId,
			...(structuredOutput !== undefined && { structuredOutput }),
		});
		this.services.updateState({ status: 'success', messageList: list.serialize() });
		this.services.emitAgentEnd(list.responseDelta());
		await this.guard.close();
	}
}
