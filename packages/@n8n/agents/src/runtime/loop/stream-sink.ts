import type {
	CompleteEmission,
	ModelCallContext,
	ModelTurnResult,
	RunOutputSink,
	RunServices,
	SuspendEmission,
} from './run-output-sink';
import { classifyModelTurnError, mergeUsage } from './runtime-helpers';
import type { ExecutionOptions, TokenUsage } from '../../types/sdk/agent';
import type { AgentMessage } from '../../types/sdk/message';
import { loadAi } from '../model/lazy-ai';
import { fromAiFinishReason, fromAiMessages } from '../model/messages';
import { createRawErrorReader, type RawErrorReader } from '../model/raw-error';
import { createRawUsageReader, type RawUsageReader } from '../model/raw-usage';
import { convertChunk, toTokenUsage } from '../streaming/stream';
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
	 * aborted run, so a cancelled run still bills the tokens consumed before the
	 * stop. Mirrors the shape `finishComplete` writes on the success path.
	 *
	 * Adds the in-flight turn's usage (recovered from the raw provider stream when
	 * the stop landed mid-turn — the only case where the SDK surfaces nothing) on
	 * top of the usage already folded from completed turns. `reportUsage` clears
	 * the raw capture once its turn is folded, so a completed turn is never counted
	 * twice.
	 */
	getAbortFinish(): { usage?: TokenUsage; model: string } {
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

	private buildSmoothStreamTransformOptions(): {
		experimental_transform?: ReturnType<ReturnType<typeof loadAi>['smoothStream']>;
	} {
		if (this.options?.smoothStream === false) return {};
		const { smoothStream } = loadAi();
		return { experimental_transform: smoothStream(this.options?.smoothStream ?? {}) };
	}

	async callModel(ctx: ModelCallContext): Promise<ModelTurnResult> {
		// Opt-in: only build the reader (and request raw chunks) when the host bills
		// stopped runs. Also requires a reader for the provider, so an unsupported
		// provider never pays the cost even with the option on.
		this.rawUsageReader = this.options?.recoverUsageOnAbort
			? createRawUsageReader(this.services.modelId)
			: undefined;
		// Some providers report failures (e.g. prompt safety blocks) only on the
		// raw stream — no error, no content — so raw chunks are required to
		// explain an otherwise silent empty response.
		this.rawErrorReader = createRawErrorReader(this.services.modelId);
		const { streamText } = loadAi();
		const result = streamText({
			model: ctx.model,
			system: ctx.system,
			messages: ctx.messages,
			abortSignal: ctx.abortSignal,
			// Surface the provider's raw message_start/message_delta events so an
			// aborted run can recover its usage — the SDK reports none on abort.
			...(this.rawUsageReader !== undefined || this.rawErrorReader !== undefined
				? { includeRawChunks: true }
				: {}),
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
				this.rawUsageReader?.capture(chunk.rawValue);
				this.rawErrorReader?.capture(chunk.rawValue);
				continue;
			}
			// Filter only the SDK's terminal `finish` chunk — the runtime emits its
			// own consolidated `finish` after the loop completes. `start-step` /
			// `finish-step` are passed through as LLM-iteration boundaries.
			if (chunk.type === 'finish') continue;

			// Accumulate streamed text so an abort mid-response can persist it (the
			// turn's `newMessages` are only built below, which the abort never reaches).
			if (chunk.type === 'text-delta') this.partialText += chunk.text ?? '';

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
		const providerMetadata = await result.providerMetadata;
		const response = await result.response;
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
			toolCalls: await result.toolCalls,
			structuredOutput:
				ctx.outputSpec && aiFinishReason !== 'tool-calls' ? await result.output : undefined,
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
