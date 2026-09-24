import type { StreamTextTransform, TextStreamPart, ToolSet } from 'ai';

import {
	finalizeRun,
	type CompleteEmission,
	type ModelCallContext,
	type ModelTurnResult,
	type RunOutputSink,
	type RunServices,
	type SuspendEmission,
} from './run-output-sink';
import { classifyModelTurnError, mergeUsage } from './runtime-helpers';
import type { ExecutionOptions, TokenUsage } from '../../types/sdk/agent';
import type { AgentMessage } from '../../types/sdk/message';
import { isAttachmentValidationError } from '../model/attachment-validation-error';
import { loadAi } from '../model/lazy-ai';
import { fromAiFinishReason, fromAiMessages } from '../model/messages';
import { createRawErrorReader, type RawErrorReader } from '../model/raw-error';
import { createRawUsageReader, type RawUsageReader } from '../model/raw-usage';
import { convertChunk, toTokenUsage } from '../streaming/stream';
import {
	DEFAULT_MODEL_STREAM_FIRST_OUTPUT_TIMEOUT_MS,
	DEFAULT_MODEL_STREAM_IDLE_TIMEOUT_MS,
	MAX_MODEL_STREAM_STALL_RETRIES,
	MAX_MODEL_STREAM_TIMEOUT_MS,
	ModelStreamStallError,
	raceWithStallDeadline,
	withChunkIdleTimeout,
} from '../streaming/stream-stall';
import type { StreamWriterGuard } from '../streaming/stream-writer-guard';
import type { ToolCallBatchResult } from '../tools/tool-call-executor';

/**
 * Chunk types that are pure transport bookkeeping: an attempt that stalled
 * having emitted only these produced nothing user-visible or persisted, so it
 * can be silently re-issued. Everything else (text, reasoning, tool activity)
 * marks the attempt as streamed — unknown future types err on the safe side.
 */
const STALL_RETRY_SAFE_CHUNK_TYPES = new Set<string>([
	'raw',
	'start',
	'stream-start',
	'start-step',
	'finish-step',
	'finish',
	'abort',
]);

/**
 * Streaming output sink: drives the loop with `streamText`, forwards text /
 * reasoning / tool chunks (and provider-executed tool timing) through the
 * `StreamWriterGuard`, and writes the terminal `finish` / `tool-call-suspended`
 * chunks. Owns the smooth-stream transform option.
 */
export class StreamSink implements RunOutputSink<void> {
	private lastUsage: TokenUsage | undefined;
	// Reads the in-flight turn's usage from the provider's raw stream events so an
	// aborted run can still be billed (the SDK reports no usage on abort). The
	// provider-specific translation lives behind `RawUsageReader`; undefined when
	// the run's provider has no reader.
	private rawUsageReader: RawUsageReader | undefined;
	// Text streamed for the in-flight turn, retained so a stop landing mid-response
	// can still persist what the user already saw. Cleared once the turn is folded.
	private partialText = '';
	// Reads provider failure signals (e.g. a prompt safety block) from raw
	// chunks, so an output-less rejected request can report why. Per-provider
	// implementations live behind `RawErrorReader`; undefined when the run's
	// provider has no reader.
	private rawErrorReader: RawErrorReader | undefined;
	constructor(
		private readonly guard: StreamWriterGuard,
		private readonly services: RunServices,
		private readonly options: ExecutionOptions | undefined,
	) {}

	reportUsage(usage: TokenUsage | undefined): void {
		this.lastUsage = usage;
		// The just-completed turn is now folded into `usage`; its raw capture is
		// stale and must not be re-added to a later between-turns abort total.
		this.rawUsageReader = undefined;
	}

	/**
	 * The just-returned turn's messages are now in the list, so the retained streamed
	 * text is redundant — drop it. Deferred until here (not `reportUsage`) so a stop
	 * landing after the model completes but before the fold still recovers the turn.
	 */
	onTurnFolded(): void {
		this.partialText = '';
	}

	/**
	 * Cost-applied usage + model to stamp on the terminal finish chunk of an
	 * aborted or failed run, so a run cut short still bills the tokens consumed
	 * before the stop. Mirrors the shape `finishComplete` writes on the success
	 * path.
	 *
	 * Adds the in-flight turn's usage (recovered from the raw provider stream when
	 * the stop landed mid-turn — the only case where the SDK surfaces nothing) on
	 * top of the usage already folded from completed turns. `reportUsage` clears
	 * the raw capture once its turn is folded, so a completed turn is never counted
	 * twice.
	 */
	getTerminalFinish(): { usage?: TokenUsage; model: string } {
		const usage = this.services.applyCost(
			mergeUsage(this.lastUsage, this.rawUsageReader?.getUsage()),
		);
		return { ...(usage && { usage }), model: this.services.modelId };
	}

	/**
	 * Partial assistant output streamed before a stop landed mid-response, so the text
	 * the user already saw is persisted (and rendered on reload) rather than lost — the
	 * turn's `newMessages` are only built once the stream completes, which an abort skips.
	 * Text only: an unfinished tool call has no result and would render as stuck-loading
	 * or be stripped on load. Undefined between turns / when nothing streamed yet.
	 */
	getAbortSnapshot(): AgentMessage | undefined {
		if (!this.partialText) return undefined;
		return { role: 'assistant', content: [{ type: 'text', text: this.partialText }] };
	}

	/**
	 * Timestamps every chunk (keepalives included) for the stall watchdog, then
	 * consumes `raw` chunks: the readers get their raw values here, and nothing
	 * downstream ever sees them. Must run BEFORE smoothStream — it flushes its
	 * word buffer on every non-text chunk, so raw chunks interleaved with text
	 * deltas would silently defeat smoothing.
	 *
	 * The readers are bound per attempt, not read off `this`: an abandoned
	 * attempt's pipeline can still drain buffered chunks after a stall retry
	 * swapped in fresh readers, which would bill its usage against the retry.
	 */
	private buildRawChunkTap(
		activity: { lastAt: number },
		readers: { usage: RawUsageReader | undefined; error: RawErrorReader | undefined },
	): StreamTextTransform<ToolSet> {
		return () =>
			new TransformStream({
				transform: (chunk, controller) => {
					activity.lastAt = Date.now();
					if (chunk.type === 'raw') {
						readers.usage?.capture(chunk.rawValue);
						readers.error?.capture(chunk.rawValue);
						return;
					}
					controller.enqueue(chunk);
				},
			});
	}

	private buildTransformOptions(rawChunkTap: StreamTextTransform<ToolSet> | undefined): {
		experimental_transform?: Array<StreamTextTransform<ToolSet>>;
	} {
		const transforms: Array<StreamTextTransform<ToolSet>> = [];
		if (rawChunkTap) transforms.push(rawChunkTap);
		if (this.options?.smoothStream !== false) {
			const { smoothStream } = loadAi();
			transforms.push(smoothStream(this.options?.smoothStream ?? {}));
		}
		return transforms.length > 0 ? { experimental_transform: transforms } : {};
	}

	private getStreamDeadlines(): { idleMs: number; firstOutputMs: number } {
		// Clamped to MAX_MODEL_STREAM_TIMEOUT_MS: above it setTimeout fires after
		// 1ms, turning an "effectively disable" override into instant stalls.
		const idleMs = Math.min(
			this.options?.modelStreamIdleTimeoutMs ?? DEFAULT_MODEL_STREAM_IDLE_TIMEOUT_MS,
			MAX_MODEL_STREAM_TIMEOUT_MS,
		);
		// Pre-first-output silence tolerates prompt processing (large cache-miss
		// prompts send nothing for minutes); never let it undercut the idle limit.
		const firstOutputMs = Math.min(
			Math.max(
				idleMs,
				this.options?.modelStreamFirstOutputTimeoutMs ??
					DEFAULT_MODEL_STREAM_FIRST_OUTPUT_TIMEOUT_MS,
			),
			MAX_MODEL_STREAM_TIMEOUT_MS,
		);
		return { idleMs, firstOutputMs };
	}

	async callModel(ctx: ModelCallContext): Promise<ModelTurnResult> {
		const deadlines = this.getStreamDeadlines();
		for (let attempt = 0; ; attempt++) {
			this.resetRawReaders();
			// Per-attempt controller: a stall must be able to cancel this attempt's
			// fetch (releasing the socket the 1h network timeout would otherwise
			// hold) without touching the run-level signal.
			const turnAbort = new AbortController();
			const attemptState = { streamedContent: false };
			try {
				return await this.streamModelTurn(ctx, turnAbort, deadlines, attemptState);
			} catch (error) {
				if (isAttachmentValidationError(error)) {
					if (!attemptState.streamedContent) await ctx.onInputRejected?.(error);
					throw error;
				}
				if (!this.canRetryStream(error, attempt, attemptState, ctx.abortSignal)) throw error;
			}
		}
	}

	private resetRawReaders(): void {
		// Each attempt needs fresh readers so a retry does not reuse captured usage.
		this.rawUsageReader = this.options?.recoverUsageOnAbort
			? createRawUsageReader(this.services.modelId)
			: undefined;
		// Some providers report a blocked prompt only in raw chunks.
		this.rawErrorReader = createRawErrorReader(this.services.modelId);
	}

	private canRetryStream(
		error: unknown,
		attempt: number,
		attemptState: { streamedContent: boolean },
		abortSignal: AbortSignal,
	): boolean {
		// Retry only before content is visible or persisted. The abandoned attempt stays unbilled.
		return (
			(error instanceof ModelStreamStallError ||
				loadAi().NoOutputGeneratedError.isInstance(error)) &&
			attempt < MAX_MODEL_STREAM_STALL_RETRIES &&
			!attemptState.streamedContent &&
			!abortSignal.aborted
		);
	}

	private async streamModelTurn(
		ctx: ModelCallContext,
		turnAbort: AbortController,
		deadlines: { idleMs: number; firstOutputMs: number },
		attemptState: { streamedContent: boolean },
	): Promise<ModelTurnResult> {
		const { idleMs, firstOutputMs } = deadlines;
		const { NoOutputGeneratedError, streamText } = loadAi();
		const { result, activity } = this.startModelStream(ctx, turnAbort, idleMs, streamText);

		// Use the longer deadline before the first output to allow prompt processing.
		const chunkStream =
			idleMs > 0
				? withChunkIdleTimeout(
						result.stream,
						() => (attemptState.streamedContent ? idleMs : firstOutputMs),
						() => turnAbort.abort(),
						() => activity.lastAt,
					)
				: result.stream;

		for await (const chunk of chunkStream) {
			if (chunk.type === 'error' && isAttachmentValidationError(chunk.error)) throw chunk.error;
			// Result promises report this error. Do not forward it or count it as content before a retry.
			if (chunk.type === 'error' && NoOutputGeneratedError.isInstance(chunk.error)) continue;
			if (!this.captureStreamChunk(chunk, attemptState)) continue;
			await this.writeStreamChunk(chunk);
		}

		return await this.resolveModelTurn(result, ctx, idleMs, turnAbort);
	}

	private startModelStream(
		ctx: ModelCallContext,
		turnAbort: AbortController,
		idleMs: number,
		streamText: ReturnType<typeof loadAi>['streamText'],
	) {
		// Raw chunks serve two consumers: the usage/error readers parse them, and
		// the stall watchdog counts them as liveness — keepalive events the SDK
		// otherwise drops (e.g. Anthropic `ping`, a gateway's empty-delta frames)
		// are the only sign of life on a slow turn. Deliberately not gated by
		// provider: keepalives are injected by proxies and gateways too, and a
		// false stall is worse than the extra chunk volume. The raw-chunk tap
		// (see buildRawChunkTap) consumes them right inside the SDK pipeline.
		const needsRawChunks =
			idleMs > 0 || this.rawUsageReader !== undefined || this.rawErrorReader !== undefined;
		// Liveness bookkeeping the chunk iterator cannot see: the tap stamps this
		// on every chunk before the raw ones are consumed, and the stall deadline
		// re-arms while it stays fresh.
		const activity = { lastAt: Date.now() };
		const result = streamText({
			model: ctx.model,
			instructions: ctx.system,
			messages: ctx.messages,
			allowSystemInMessages: true,
			// Run abort (user stop) and turn abort (stall watchdog) both cancel
			// this attempt's fetch.
			abortSignal: AbortSignal.any([ctx.abortSignal, turnAbort.signal]),
			...(ctx.reasoning ? { reasoning: ctx.reasoning } : {}),
			...(needsRawChunks ? { include: { rawChunks: true } } : {}),
			...(ctx.hasTools ? { tools: ctx.aiTools } : {}),
			...(ctx.providerOptions ? { providerOptions: ctx.providerOptions } : {}),
			...(ctx.outputSpec ? { output: ctx.outputSpec } : {}),
			...(ctx.maxOutputTokens !== undefined ? { maxOutputTokens: ctx.maxOutputTokens } : {}),
			...ctx.aiSdkOptions,
			...this.buildTransformOptions(
				needsRawChunks
					? this.buildRawChunkTap(activity, {
							usage: this.rawUsageReader,
							error: this.rawErrorReader,
						})
					: undefined,
			),
		});
		return { result, activity };
	}

	private captureStreamChunk(
		chunk: TextStreamPart<ToolSet>,
		attemptState: { streamedContent: boolean },
	): boolean {
		// Capture raw chunks here when a stream does not use the tap, such as a test stream.
		if (chunk.type === 'raw') {
			this.rawUsageReader?.capture(chunk.rawValue);
			this.rawErrorReader?.capture(chunk.rawValue);
			return false;
		}
		if (!STALL_RETRY_SAFE_CHUNK_TYPES.has(chunk.type)) attemptState.streamedContent = true;
		// The runtime writes its own finish chunk after the loop completes.
		if (chunk.type === 'finish') return false;
		// Retain partial text so cancellation can save an unfinished response.
		if (chunk.type === 'text-delta') this.partialText += chunk.text ?? '';
		return true;
	}

	private async writeStreamChunk(chunk: TextStreamPart<ToolSet>): Promise<void> {
		// Provider tools skip the local executor. Record their timing when chunks arrive.
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

	private async resolveModelTurn(
		result: ReturnType<StreamSink['startModelStream']>['result'],
		ctx: ModelCallContext,
		idleMs: number,
		turnAbort: AbortController,
	): Promise<ModelTurnResult> {
		// The result promises settle as part of stream close on a healthy turn;
		// guard them with the same stall deadline so an SDK-internal promise that
		// never settles cannot hang the turn after the chunk loop ended.
		const settle = async <T>(promise: PromiseLike<T>): Promise<T> =>
			idleMs > 0
				? await raceWithStallDeadline(promise, idleMs, () => turnAbort.abort())
				: await promise;

		const aiFinishReason = await settle(result.finishReason);
		const usage = await settle(result.usage);
		const providerMetadata = await settle(result.providerMetadata);
		const response = await settle(result.response);
		const newMessages = fromAiMessages(response.messages);
		const errorReason = classifyModelTurnError({
			aiFinishReason,
			newMessages,
			providerError: this.rawErrorReader?.getError(),
		});

		return {
			aiFinishReason,
			finishReason: fromAiFinishReason(aiFinishReason),
			usage: toTokenUsage(usage, providerMetadata),
			newMessages,
			toolCalls: await settle(result.toolCalls),
			structuredOutput:
				ctx.outputSpec && aiFinishReason !== 'tool-calls' ? await settle(result.output) : undefined,
			...(errorReason && { errorReason }),
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
				...(r.mcpServerName !== undefined ? { mcpServerName: r.mcpServerName } : {}),
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
		// Stamp the tokens consumed to reach this suspension on the finish chunk,
		// as the completion path does. A HITL run reuses one runId across segments,
		// so each segment must bill its own usage here — otherwise the pre-suspension
		// tokens are never emitted and go unbilled (worse, a stop while suspended
		// never reaches a completion finish at all).
		const costUsage = this.services.applyCost(emission.usage);
		await this.guard.write({
			type: 'finish',
			finishReason: 'tool-calls',
			...(costUsage && { usage: costUsage }),
			model: this.services.modelId,
		});
		await this.guard.close();
	}

	async finishComplete(emission: CompleteEmission): Promise<void> {
		const { list, finishReason, usage, structuredOutput } = emission;
		const costUsage = this.services.applyCost(usage);

		await finalizeRun(this.services, emission);

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
