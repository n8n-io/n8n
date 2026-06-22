import { isRecord } from '@n8n/utils';

import type {
	CompleteEmission,
	ModelCallContext,
	ModelTurnResult,
	RunOutputSink,
	RunServices,
	SuspendEmission,
} from './run-output-sink';
import type { ExecutionOptions, TokenUsage } from '../../types/sdk/agent';
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
	private lastUsage: TokenUsage | undefined;
	// Raw provider usage for the in-flight turn, captured from the stream so an
	// aborted run can still be billed (the SDK reports no usage on abort).
	private inFlightRawUsage: Record<string, unknown> | undefined;

	constructor(
		private readonly guard: StreamWriterGuard,
		private readonly services: RunServices,
		private readonly options: ExecutionOptions | undefined,
	) {}

	reportUsage(usage: TokenUsage | undefined): void {
		this.lastUsage = usage;
	}

	/**
	 * Cost-applied usage + model to stamp on the terminal finish chunk of an
	 * aborted run, so a cancelled run still bills the tokens consumed before the
	 * stop. Mirrors the shape `finishComplete` writes on the success path.
	 *
	 * Prefers usage reported by completed turns; falls back to the in-flight
	 * turn's usage recovered from the raw provider stream when the stop landed
	 * mid-turn (the only case where the SDK surfaces nothing).
	 */
	getAbortFinish(): { usage?: TokenUsage; model: string } {
		const usage = this.services.applyCost(this.lastUsage ?? this.rawDerivedUsage());
		return { ...(usage && { usage }), model: this.services.modelId };
	}

	/**
	 * Pull usage out of the provider's raw SSE events. Anthropic's `message_start`
	 * carries input/cache tokens (final from the first event) plus the initial
	 * output count; `message_delta` updates the cumulative output as it streams.
	 * Provider-specific and best-effort: unknown shapes leave usage unset.
	 */
	private captureRawUsage(rawValue: unknown): void {
		if (typeof rawValue !== 'object' || rawValue === null) return;
		const event = rawValue as { type?: unknown; message?: unknown; usage?: unknown };
		if (event.type === 'message_start' && isRecord(event.message)) {
			const usage = event.message.usage;
			if (isRecord(usage)) this.inFlightRawUsage = usage;
		} else if (event.type === 'message_delta' && isRecord(event.usage)) {
			this.inFlightRawUsage = { ...(this.inFlightRawUsage ?? {}), ...event.usage };
		}
	}

	/** Map the captured Anthropic raw usage to our `TokenUsage` shape. */
	private rawDerivedUsage(): TokenUsage | undefined {
		const raw = this.inFlightRawUsage;
		if (!raw) return undefined;
		const num = (v: unknown): number => (typeof v === 'number' && v > 0 ? v : 0);
		const noCache = num(raw.input_tokens);
		const cacheWrite = num(raw.cache_creation_input_tokens);
		const cacheRead = num(raw.cache_read_input_tokens);
		const output = num(raw.output_tokens);
		const promptTokens = noCache + cacheWrite + cacheRead;
		if (promptTokens + output <= 0) return undefined;

		const usage: TokenUsage = {
			promptTokens,
			completionTokens: output,
			totalTokens: promptTokens + output,
		};
		if (noCache || cacheRead || cacheWrite) {
			usage.inputTokenDetails = {
				...(noCache && { noCache }),
				...(cacheRead && { cacheRead }),
				...(cacheWrite && { cacheWrite }),
			};
		}
		return usage;
	}

	private buildSmoothStreamTransformOptions(): {
		experimental_transform?: ReturnType<ReturnType<typeof loadAi>['smoothStream']>;
	} {
		if (this.options?.smoothStream === false) return {};
		const { smoothStream } = loadAi();
		return { experimental_transform: smoothStream(this.options?.smoothStream ?? {}) };
	}

	async callModel(ctx: ModelCallContext): Promise<ModelTurnResult> {
		this.inFlightRawUsage = undefined;
		const { streamText } = loadAi();
		const result = streamText({
			model: ctx.model,
			system: ctx.system,
			messages: ctx.messages,
			abortSignal: ctx.abortSignal,
			// Surface the provider's raw message_start/message_delta events so an
			// aborted run can recover its usage — the SDK reports none on abort.
			includeRawChunks: true,
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
			// Track usage from raw provider events so an aborted turn (which never
			// reaches the post-loop awaits) can still be billed via getAbortFinish.
			if (chunk.type === 'raw') {
				this.captureRawUsage(chunk.rawValue);
				continue;
			}
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
