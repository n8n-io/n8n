import type {
	Agent as RuntimeAgent,
	ExecutionOptions,
	ResumeOptions,
	RunOptions,
	SideCallUsageReport,
	StreamChunk,
} from '@n8n/agents';
import type { AgentBackgroundJobSignal } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { AgentChatSurface, AgentSessionMode } from './utils/agent-thread-access';
import { AgentExecutionRecordingError } from './agent-execution-recording.error';
import { AgentTurnAlreadyRunningError } from './agent-turn-already-running.error';
import { AgentChatExecutionService } from './agent-chat-execution.service';
import { SESSION_STOPPED_REASON } from './agent-session-stop-reason';
import { AgentKnowledgeUsageTracker } from './agent-knowledge-usage-tracker';
import { AgentMessageQueueService } from './agent-message-queue.service';
import { AgentMessageSteeringService } from './agent-message-steering.service';
import type { AgentExecutionStreamChunk, SteeredMessageEvent } from './types/agent-steering';
import type { AgentTurnFinalizeOutcome, FormattedTurnError } from './types/agent-turn-outcome';
import { AgentToolApprovalService } from './agent-tool-approval.service';
import { EXECUTION_METADATA_KEY, type AgentExecutionAdmission } from './types/agent-queued-message';
import {
	AgentExecutionService,
	type RecordMessageParams,
	type StartExecutionParams,
} from './agent-execution.service';
import { ExecutionRecorder } from './execution-recorder';
import type { ToolRegistry } from './tool-registry';
import { streamAgentChunks } from './utils/agent-stream';
import { MAX_ITERATIONS_STOPPED_MESSAGE } from './utils/fatal-session-outcome';
import { createAttributionTracker } from './utils/mcp-attribution';
import { bindExecutionInput } from './utils/execution-input';

type RecordingContext = Pick<StartExecutionParams, 'projectId' | 'agentId' | 'threadId'>;

export type AgentTurnRequest = { recording: StartExecutionParams } & (
	| {
			type: 'start';
			input: Parameters<RuntimeAgent['stream']>[0];
			options: RunOptions & ExecutionOptions;
	  }
	| {
			type: 'resume';
			resumeData: unknown;
			options: ResumeOptions & ExecutionOptions;
	  }
);

interface ExecuteTurnConfig {
	admittedExecution?: AgentExecutionAdmission;
	onAdmitted?: () => Promise<void>;
	agentInstance: RuntimeAgent;
	toolRegistry: ToolRegistry;
	mcpServerAttributions: Map<string, string>;
	context: RecordingContext;
	prepare: () => Promise<AgentTurnRequest>;
	backgroundJobSignal?: AgentBackgroundJobSignal;
	/** The chat surface this turn runs under. Undefined for integrations and tasks. */
	chatSurface?: AgentChatSurface;
	/** Set false to keep additional input queued without cancelling the turn. */
	acceptsSteering?: boolean;
	/**
	 * The controller of the chat turn. Defaults to a new controller. A cancel
	 * aborts it, and the caller can abort it to stop the turn at any time. The
	 * abort signal in the turn options also aborts it.
	 */
	chatController?: AbortController;
	automaticPreviewContinuation?: boolean;
	onExecutionStarted?: (executionId: string, sessionId: string, inputMessageIds: string[]) => void;
	onExecutionRecorded?: (executionId: string) => void;
	onSettled?: (suspended: boolean) => Promise<void>;
	/**
	 * Called once when the outcome of the turn is known, before the runtime
	 * stores the turn record. Events that the host records here are stored
	 * with the turn. The runtime does not call it when the turn has no
	 * execution record.
	 */
	onBeforeFinalize?: (outcome: AgentTurnFinalizeOutcome) => Promise<void>;
	/**
	 * Map a turn error to the text to store on the execution. Return
	 * `undefined` to store the raw error. Must not reject.
	 */
	formatError?: (error: unknown) => Promise<FormattedTurnError | undefined>;
	/** Called once with the recorder of the turn, so that a host can record its own events. */
	onRecorderCreated?: (recorder: ExecutionRecorder) => void;
}

interface TurnExecutionState {
	steeredMessages: Map<string, SteeredMessageEvent>;
	executionId?: string;
	executionStarted: boolean;
	executionError?: unknown;
	receivedFinish: boolean;
	suspendedRunId?: string;
	runId?: string;
}

/** Controls cancellation for Preview and n8n Chat turns. */
interface ChatExecutionControl {
	controller: AbortController;
	dispose: () => void;
	userId: string;
	surface: AgentChatSurface;
}

function getMaxIterationsChunks(): StreamChunk[] {
	const id = crypto.randomUUID();
	return [
		{ type: 'text-start', id },
		{
			type: 'text-delta',
			id,
			delta: MAX_ITERATIONS_STOPPED_MESSAGE,
		},
		{ type: 'text-end', id },
	];
}

@Service()
export class AgentTurnExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly chatExecutionService: AgentChatExecutionService,
		private readonly messageQueue: AgentMessageQueueService,
		private readonly steering: AgentMessageSteeringService,
		private readonly toolApprovalService: AgentToolApprovalService,
		private readonly knowledgeUsageTracker: AgentKnowledgeUsageTracker,
	) {}

	async getSessionMode(threadId: string): Promise<AgentSessionMode> {
		return await this.agentExecutionService.getSessionMode(threadId);
	}

	async *execute(config: ExecuteTurnConfig): AsyncGenerator<AgentExecutionStreamChunk> {
		let turn: AgentTurnRequest | undefined;
		let chatControl: ChatExecutionControl | undefined;
		const state: TurnExecutionState = {
			steeredMessages: new Map(),
			executionStarted: false,
			receivedFinish: false,
			executionId: config.admittedExecution?.executionId,
		};
		const recorder = this.createRecorder(
			config.toolRegistry,
			() => state.executionId,
			config.context,
			config.backgroundJobSignal,
			config.admittedExecution?.startedAt,
		);
		try {
			config.onRecorderCreated?.(recorder);
			turn = await config.prepare();
			const preparedTurn = turn;
			if (config.chatSurface !== undefined) {
				chatControl = this.createChatExecutionControl(
					preparedTurn,
					config.chatSurface,
					config.chatController,
				);
				preparedTurn.options.abortSignal = chatControl.controller.signal;
			}

			const stream = await this.admitTurn(preparedTurn, config, recorder, state, chatControl);
			yield* this.streamTurn(stream, preparedTurn, config, recorder, state);
			if (
				!state.receivedFinish &&
				state.executionError === undefined &&
				state.executionId &&
				(await this.isStoppedTurn(turn, config))
			) {
				const finish: StreamChunk = { type: 'finish', finishReason: 'cancelled' };
				recorder.record(finish);
				yield finish;
			}
		} catch (error) {
			const { isAbortError } = await import('@n8n/agents');
			if ((await this.isStoppedTurn(turn, config)) && isAbortError(error)) {
				if (state.executionId && !state.receivedFinish) {
					const finish: StreamChunk = { type: 'finish', finishReason: 'cancelled' };
					recorder.record(finish);
					yield finish;
				}
				return;
			}

			state.executionError = error;
			const formatted = await config.formatError?.(error);
			recorder.record({ type: 'error', error: formatted?.message ?? error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			chatControl?.dispose();
			if (turn && state.executionId) {
				try {
					await this.settleTurn(turn, config, recorder, state.executionId, state, chatControl);
					await config.onSettled?.(recorder.suspended);
				} finally {
					await this.messageQueue.settle(config.context.threadId, state.executionId);
				}
			}
		}
	}

	private async isStoppedTurn(
		turn: AgentTurnRequest | undefined,
		config: ExecuteTurnConfig,
	): Promise<boolean> {
		const signal = turn?.options.abortSignal;
		if (!signal?.aborted) return false;
		if (signal.reason === SESSION_STOPPED_REASON) return true;
		if (config.chatSurface === undefined) return false;
		const { isAbortError } = await import('@n8n/agents');
		return isAbortError(signal.reason);
	}

	private createChatExecutionControl(
		turn: AgentTurnRequest,
		surface: AgentChatSurface,
		controller = new AbortController(),
	): ChatExecutionControl {
		const userId = turn.recording.access.ownerId;
		if (turn.recording.access.accessScope !== 'user' || !userId) {
			throw new UnexpectedError('A preview execution must have an owning user.');
		}
		const executionSignal = turn.options.abortSignal;
		const abort = () => controller.abort(executionSignal?.reason);
		if (executionSignal?.aborted) abort();
		else executionSignal?.addEventListener('abort', abort, { once: true });
		return {
			controller,
			userId,
			surface,
			dispose: () => executionSignal?.removeEventListener('abort', abort),
		};
	}

	private async startTurn(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
	): Promise<ReadableStream<StreamChunk>> {
		turn.options.approvalContext = await this.toolApprovalService.createContext(
			turn.recording,
			config.toolRegistry,
		);
		turn.options.abortSignal?.throwIfAborted();
		if (turn.type === 'start') {
			state.executionStarted = true;
			const started = await config.agentInstance.stream(turn.input, turn.options);
			state.runId = started.runId;
			return started.stream;
		}

		const { options, resumeData } = turn;
		const resumed = await config.agentInstance.resume('stream', resumeData, {
			...options,
			onResumeClaimed: async () => {
				state.executionStarted = true;
				recorder.recordHitlResponse(options.toolCallId, resumeData);
				await options.onResumeClaimed?.();
			},
		});
		state.runId = resumed.runId;
		return resumed.stream;
	}

	private async *streamTurn(
		stream: ReadableStream<StreamChunk>,
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
	): AsyncGenerator<AgentExecutionStreamChunk> {
		const attributionTracker = createAttributionTracker(config.mcpServerAttributions);

		for await (let chunk of streamAgentChunks(stream)) {
			if (chunk.type === 'input-boundary') {
				chunk.acknowledge();
				continue;
			}

			if (chunk.type === 'input') {
				const event = state.steeredMessages.get(chunk.message.id);
				if (event) {
					state.steeredMessages.delete(chunk.message.id);
					yield event;
				}
				continue;
			}

			// Report requested stops consistently across chat and integration streams.
			if (
				(chunk.type === 'error' || chunk.type === 'finish') &&
				(await this.isStoppedTurn(turn, config))
			) {
				if (chunk.type === 'error') {
					const { isAbortError } = await import('@n8n/agents');
					if (isAbortError(chunk.error)) continue;
				} else if (state.executionError === undefined) {
					chunk = { ...chunk, finishReason: 'cancelled' };
				}
			}

			if (chunk.type === 'error') {
				const formatted = await config.formatError?.(chunk.error);
				recorder.record({ ...chunk, error: formatted?.message ?? chunk.error });
			} else {
				recorder.record(chunk);
			}

			if (chunk.type === 'usage' && state.executionId) {
				this.agentExecutionService.reportUsage(
					{ ...config.context, executionId: state.executionId },
					chunk.usage,
					Math.max(0, Date.now() - recorder.startedAt.getTime()),
				);
			}
			if (chunk.type === 'tool-call-suspended') state.suspendedRunId = chunk.runId;
			if (chunk.type === 'error') state.executionError = chunk.error;
			if (chunk.type === 'finish') state.receivedFinish = true;

			if (turn.type === 'start') {
				yield* this.streamStartTurnNotices(chunk, config.context.agentId, recorder);
			}

			for (const attributionChunk of attributionTracker.observe(chunk)) {
				recorder.record(attributionChunk);
				yield attributionChunk;
			}
			yield chunk;
		}
	}

	private async settleTurn(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		executionId: string,
		state: TurnExecutionState,
		chatControl?: ChatExecutionControl,
	): Promise<void> {
		const finalize = async () => {
			await this.finalizeTurn(turn, config, recorder, executionId, state);
			// A checkpoint can finish saving after Stop first checks the session.
			if (turn.options.abortSignal?.reason === SESSION_STOPPED_REASON)
				await this.chatExecutionService.cancelSessionSuspension(
					config.context.agentId,
					config.context.threadId,
					executionId,
				);
		};
		if (chatControl) {
			await this.chatExecutionService.settle(executionId, finalize, state.suspendedRunId);
		} else {
			await finalize();
		}
	}

	private async finalizeTurn(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		executionId: string,
		state: TurnExecutionState,
	): Promise<void> {
		const cancelled = await this.isCancelled(turn, recorder, state);
		await this.runBeforeFinalize(config, recorder, executionId, state, cancelled);
		const record = recorder.getMessageRecord();
		let hitlStatus: RecordMessageParams['hitlStatus'];
		if (recorder.suspended) hitlStatus = 'suspended';
		else if (turn.type === 'resume' && state.executionStarted) hitlStatus = 'resumed';

		await this.finalizeExecution({
			executionId,
			executionStarted: state.executionStarted,
			executionError: state.executionError,
			onExecutionRecorded: config.onExecutionRecorded,
			params: {
				...turn.recording,
				record: cancelled ? { ...record, finishReason: 'cancelled', error: null } : record,
				hitlStatus,
			},
			runId: state.runId,
		});
	}

	private sendKnowledgeUsage(runId: string | undefined, params: RecordMessageParams) {
		if (!runId) {
			return;
		}

		const { agentId, telemetry } = params;
		if (!telemetry) {
			this.knowledgeUsageTracker.takeRunUsage(runId);
			return;
		}

		this.knowledgeUsageTracker.sendRunUsage(runId, {
			agentId,
			runType: telemetry.runType,
			userId: telemetry.userId,
		});
	}

	private async isCancelled(
		turn: AgentTurnRequest,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
	): Promise<boolean> {
		if (state.executionError !== undefined) {
			const { isAbortError } = await import('@n8n/agents');
			if (!isAbortError(state.executionError)) return false;
		}
		return (
			turn.options.abortSignal?.aborted === true ||
			(!state.receivedFinish && !recorder.suspended && recorder.getMessageRecord().error === null)
		);
	}

	/** Give the host the outcome of the turn before the record is final. */
	private async runBeforeFinalize(
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		executionId: string,
		state: TurnExecutionState,
		cancelled: boolean,
	): Promise<void> {
		if (!config.onBeforeFinalize) return;
		const record = recorder.getMessageRecord();
		let status: AgentTurnFinalizeOutcome['status'] = 'completed';
		if (cancelled) status = 'cancelled';
		else if (recorder.suspended) status = 'suspended';
		else if (record.error !== null || record.finishReason === 'error') status = 'errored';
		// A thrown error, or the error that the model stream reported.
		const error = state.executionError ?? record.error ?? undefined;
		try {
			await config.onBeforeFinalize({
				executionId,
				status,
				...(status === 'errored' && error !== undefined ? { error } : {}),
			});
		} catch (hookError) {
			// The turn record must be stored even when the host hook fails.
			this.logger.warn('Agent turn before-finalize hook failed', {
				threadId: config.context.threadId,
				executionId,
				error: hookError,
			});
		}
	}

	createRecorder(
		toolRegistry?: ToolRegistry,
		getExecutionId: () => string | undefined = () => undefined,
		context?: RecordingContext,
		backgroundJobSignal?: AgentBackgroundJobSignal,
		startedAt?: Date,
	): ExecutionRecorder {
		return new ExecutionRecorder(
			toolRegistry,
			(timeline) => {
				const executionId = getExecutionId();
				if (executionId && context) {
					this.agentExecutionService.recordTimelineSnapshot({
						projectId: context.projectId,
						agentId: context.agentId,
						threadId: context.threadId,
						executionId,
						timeline,
					});
				}
			},
			backgroundJobSignal,
			startedAt,
		);
	}

	async startExecution(
		params: StartExecutionParams,
		startedAt: Date,
		executionError?: unknown,
	): Promise<AgentExecutionAdmission> {
		try {
			return await this.agentExecutionService.startExecutionRecording(params, startedAt);
		} catch (cause) {
			if (cause instanceof AgentTurnAlreadyRunningError) throw cause;
			throw new AgentExecutionRecordingError({ phase: 'create', cause, executionError });
		}
	}

	async finalizeExecution(args: {
		executionId: string;
		executionStarted: boolean;
		executionError?: unknown;
		onExecutionRecorded?: (executionId: string) => void;
		params: RecordMessageParams;
		/** Run id of the agent runtime. Absent when the runtime never started. */
		runId?: string;
	}): Promise<void> {
		const { executionId, executionStarted, executionError, onExecutionRecorded, params } = args;
		let recordedId: string;
		try {
			recordedId = await this.agentExecutionService.finalizeExecution(executionId, params);
		} catch (cause) {
			throw new AgentExecutionRecordingError({
				phase: 'finalize',
				executionId,
				executionStarted,
				executionError,
				cause,
			});
		} finally {
			// Make sure the run's knowledge counts leave memory, also when recording fails.
			this.sendKnowledgeUsage(args.runId, params);
		}
		onExecutionRecorded?.(recordedId);
	}

	/** Finalize an admitted execution whose runtime could not start. */
	async recordFailedAdmission(
		admission: AgentExecutionAdmission,
		params: StartExecutionParams,
		executionError: unknown,
	): Promise<void> {
		const recorder = this.createRecorder(
			undefined,
			undefined,
			undefined,
			undefined,
			admission.startedAt,
		);
		recorder.record({ type: 'error', error: executionError });
		recorder.record({ type: 'finish', finishReason: 'error' });
		await this.finalizeExecution({
			executionId: admission.executionId,
			executionStarted: false,
			executionError,
			params: { ...params, record: recorder.getMessageRecord() },
		});
	}

	async recordFailedStart(
		params: StartExecutionParams,
		executionError: unknown,
		onExecutionRecorded?: (executionId: string) => void,
		options: { previewChat?: boolean; automaticContinuationRunId?: string } = {},
	): Promise<void> {
		const recorder = this.createRecorder();
		recorder.record({ type: 'error', error: executionError });
		recorder.record({ type: 'finish', finishReason: 'error' });
		const recordStart = async () =>
			await this.startExecution(
				{
					...params,
					resumeRunId: params.resumeRunId ?? options.automaticContinuationRunId,
					allowSuspendedPredecessor: Boolean(options.automaticContinuationRunId),
				},
				recorder.startedAt,
				executionError,
			);
		const recordFailure = async (executionId: string) => {
			await this.finalizeExecution({
				executionId,
				executionStarted: false,
				executionError,
				onExecutionRecorded,
				params: { ...params, record: recorder.getMessageRecord() },
			});
		};
		const { executionId } = await recordStart();
		try {
			await recordFailure(executionId);
		} finally {
			await this.messageQueue.settle(params.threadId, executionId);
		}
	}

	private async admitTurn(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
		chatControl?: ChatExecutionControl,
	): Promise<ReadableStream<StreamChunk>> {
		const admit = async (signal?: AbortSignal) => {
			signal?.throwIfAborted();
			const admission =
				config.admittedExecution ??
				(await this.recordTurnStart(turn, config, recorder, state, chatControl));
			state.executionId = admission.executionId;
			signal?.throwIfAborted();

			if (chatControl) {
				this.chatExecutionService.register(
					{
						...config.context,
						userId: chatControl.userId,
						executionId: admission.executionId,
						surface: chatControl.surface,
					},
					chatControl.controller,
				);
			}
			return admission;
		};

		const admission = chatControl
			? await this.chatExecutionService.withTurnLock(config.context.threadId, admit)
			: await admit();

		return await this.startAcceptedTurn(admission, turn, config, recorder, state, chatControl);
	}

	private async recordTurnStart(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
		chatControl?: ChatExecutionControl,
	): Promise<AgentExecutionAdmission> {
		turn.options.abortSignal?.throwIfAborted();
		const admission = await this.startExecution(
			{
				...turn.recording,
				previewChat: config.chatSurface === 'preview' ? true : undefined,
				acceptsSteering: chatControl !== undefined && config.acceptsSteering !== false,
				resumeRunId: turn.type === 'resume' ? turn.options.runId : undefined,
				allowSuspendedPredecessor: config.automaticPreviewContinuation,
				...(config.backgroundJobSignal
					? { initialTimeline: structuredClone(recorder.getMessageRecord().timeline) }
					: {}),
			},
			recorder.startedAt,
		);
		state.executionId = admission.executionId;
		turn.options.abortSignal?.throwIfAborted();
		return admission;
	}

	private async startAcceptedTurn(
		admission: AgentExecutionAdmission,
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
		chatControl?: ChatExecutionControl,
	): Promise<ReadableStream<StreamChunk>> {
		const { executionId, inputMessageIds } = admission;
		if (turn.type === 'start') turn.input = bindExecutionInput(turn.input, inputMessageIds);
		const executionSignal = this.agentExecutionService.getAbortSignal(executionId);
		turn.options.abortSignal = turn.options.abortSignal
			? AbortSignal.any([turn.options.abortSignal, executionSignal])
			: executionSignal;
		if (turn.type === 'start' && turn.options.persistence) {
			turn.options.persistence.hostMetadata = {
				...turn.options.persistence.hostMetadata,
				[EXECUTION_METADATA_KEY]: executionId,
			};
		} else if (turn.type === 'resume') {
			turn.options.hostMetadata = {
				...turn.options.hostMetadata,
				[EXECUTION_METADATA_KEY]: executionId,
			};
		}

		if (chatControl && config.acceptsSteering !== false) {
			turn.options.onInputBoundary = async (boundary) => {
				const result = await this.steering.consume(
					{ ...config.context, executionId, resourceId: turn.recording.resourceId },
					boundary,
					recorder,
					turn.options.abortSignal!,
				);
				if (result.stopped) chatControl.controller.abort();
				for (const event of result.events) state.steeredMessages.set(event.message.id, event);
				return result.messages;
			};
		}

		config.onExecutionStarted?.(executionId, config.context.threadId, inputMessageIds);
		turn.options.abortSignal?.throwIfAborted();
		await config.onAdmitted?.();
		turn.options.abortSignal?.throwIfAborted();

		// Forward side-call model costs (title generation, observation-log
		// observer/reflector, episodic-memory model calls) onto this execution
		// row and its thread. The SDK prices each call; the host only adds the
		// cost. Best-effort and idempotent per reportId. A caller's own callback
		// still receives every report, for example to bill it. The SDK awaits
		// that callback and logs its failure, so the caller decides how to handle it.
		const threadId = config.context.threadId;
		const callerOnSideCallUsage = turn.options.onSideCallUsage;
		turn.options.onSideCallUsage = async (report: SideCallUsageReport) => {
			void this.agentExecutionService.recordSideCallUsage(executionId, threadId, report);
			await callerOnSideCallUsage?.(report);
		};
		return await this.startTurn(turn, config, recorder, state);
	}

	private *streamStartTurnNotices(
		chunk: StreamChunk,
		agentId: string,
		recorder: ExecutionRecorder,
	): Generator<StreamChunk> {
		if (chunk.type === 'tool-call-suspended') {
			this.logger.info('Chat: tool-call-suspended chunk received', {
				agentId,
				toolCallId: chunk.toolCallId,
				toolName: chunk.toolName,
			});
		}
		if (chunk.type !== 'finish' || chunk.finishReason !== 'max-iterations') return;
		for (const notice of getMaxIterationsChunks()) {
			recorder.record(notice);
			yield notice;
		}
	}
}
