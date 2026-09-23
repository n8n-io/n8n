import type {
	Agent as RuntimeAgent,
	ExecutionOptions,
	ResumeOptions,
	RunOptions,
	StreamChunk,
} from '@n8n/agents';
import type { AgentBackgroundJobSignal } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { sleep } from '@n8n/utils/sleep';
import { UnexpectedError } from 'n8n-workflow';

import type { AgentSessionMode } from './utils/agent-thread-access';
import { AgentExecutionRecordingError } from './agent-execution-recording.error';
import { AgentChatExecutionService } from './agent-chat-execution.service';
import {
	AgentExecutionService,
	type RecordMessageParams,
	type StartedExecution,
	type StartExecutionParams,
} from './agent-execution.service';
import { AgentSessionLeaseService } from './agent-session-lease.service';
import { AgentTurnAlreadyRunningError } from './agent-turn-already-running.error';
import { buildToolCallDetails, ExecutionRecorder } from './execution-recorder';
import type { ToolRegistry } from './tool-registry';
import { anyAbortSignal } from './utils/abort-signal';
import { streamAgentChunks } from './utils/agent-stream';
import { createAttributionTracker } from './utils/mcp-attribution';

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
	agentInstance: RuntimeAgent;
	toolRegistry: ToolRegistry;
	mcpServerAttributions: Map<string, string>;
	context: RecordingContext;
	prepare: () => Promise<AgentTurnRequest>;
	includeHitlToolDetails?: boolean;
	backgroundJobSignal?: AgentBackgroundJobSignal;
	previewChat?: boolean;
	// TODO(AGENT-1031): Remove with the message queue flag. The session lease admits resumes.
	/** Admits an automatic Preview resume under the Preview lock while the flag is off. */
	automaticPreviewContinuation?: boolean;
	/** How long to wait while another turn holds the session. Defaults to no wait. */
	sessionWaitMs?: number;
	/** Runs before each start attempt. Throws when the turn must not start anymore. */
	assertCanStart?: () => Promise<void>;
	onExecutionStarted?: (executionId: string, sessionId: string) => void;
	onExecutionRecorded?: (executionId: string) => void;
	onSettled?: (suspended: boolean) => Promise<void>;
}

/** Interval between start attempts while another turn holds the session. */
const SESSION_WAIT_POLL_MS = 250;

interface SessionWaitOptions {
	/** How long to wait while another turn holds the session. */
	waitMs: number;
	abortSignal?: AbortSignal;
	/** Runs before each start attempt. Throws when the turn must not start anymore. */
	assertCanStart?: () => Promise<void>;
}

interface TurnExecutionState {
	executionId?: string;
	executionStarted: boolean;
	executionError?: unknown;
	receivedFinish: boolean;
	suspendedRunId?: string;
	/** Stops the SDK run when the consumer of the turn stops reading early. */
	stopRun: AbortController;
	// TODO(AGENT-1031): Remove with the message queue flag. Each recorded turn holds a lease then.
	/** The turn holds a session lease, so its writes are fenced and it stops before release. */
	leased: boolean;
}

interface PreviewExecutionControl {
	controller: AbortController;
	detachRequest: () => void;
	userId: string;
}

function withApprovalToolDetails(chunk: StreamChunk, toolRegistry: ToolRegistry): StreamChunk {
	if (chunk.type !== 'tool-call-suspended' || !isRecord(chunk.suspendPayload)) return chunk;
	if (chunk.suspendPayload.type !== 'approval') return chunk;

	const toolName = chunk.suspendPayload.toolName;
	if (typeof toolName !== 'string' || toolName.length === 0) return chunk;

	return {
		...chunk,
		suspendPayload: {
			...chunk.suspendPayload,
			details: buildToolCallDetails(toolRegistry, toolName, chunk.suspendPayload.args),
		},
	};
}

function getMaxIterationsChunks(): StreamChunk[] {
	const id = crypto.randomUUID();
	return [
		{ type: 'text-start', id },
		{
			type: 'text-delta',
			id,
			delta: 'The agent has reached the maximum number of iterations and has stopped.',
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
		private readonly sessionLeases: AgentSessionLeaseService,
	) {}

	async getSessionMode(threadId: string): Promise<AgentSessionMode> {
		return await this.agentExecutionService.getSessionMode(threadId);
	}

	async *execute(config: ExecuteTurnConfig): AsyncGenerator<StreamChunk> {
		let turn: AgentTurnRequest | undefined;
		let previewControl: PreviewExecutionControl | undefined;
		const state: TurnExecutionState = {
			executionStarted: false,
			receivedFinish: false,
			stopRun: new AbortController(),
			leased: false,
		};
		const recorder = this.createRecorder(
			config.toolRegistry,
			() => state.executionId,
			config.context,
			config.backgroundJobSignal,
		);

		try {
			turn = await config.prepare();
			const preparedTurn = turn;
			if (config.previewChat) {
				previewControl = this.createPreviewExecutionControl(preparedTurn);
				preparedTurn.options.abortSignal = previewControl.controller.signal;
			}
			const stream = await this.admitTurn(preparedTurn, config, recorder, state, previewControl);
			yield* this.streamTurn(stream, preparedTurn, config, recorder, state);
		} catch (error) {
			state.executionError = error;
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			previewControl?.detachRequest();
			if (turn && state.executionId) {
				await this.settleTurn(turn, config, recorder, state.executionId, state);
				await config.onSettled?.(recorder.suspended);
			}
		}
	}

	private createPreviewExecutionControl(turn: AgentTurnRequest): PreviewExecutionControl {
		const userId = turn.recording.access.ownerId;
		if (turn.recording.access.accessScope !== 'user' || !userId) {
			throw new UnexpectedError('A preview execution must have an owning user.');
		}
		const requestSignal = turn.options.abortSignal;
		const controller = new AbortController();
		const abort = () => controller.abort(requestSignal?.reason);
		if (requestSignal?.aborted) abort();
		else requestSignal?.addEventListener('abort', abort, { once: true });
		return {
			controller,
			userId,
			detachRequest: () => requestSignal?.removeEventListener('abort', abort),
		};
	}

	/** Starts the SDK run in the scope of a leased turn, so the writes of the run are fenced. */
	private async startTurn(
		executionId: string,
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
	): Promise<ReadableStream<StreamChunk>> {
		const startRun = async () => await this.startSdkRun(turn, config, recorder, state);
		if (!state.leased) return await startRun();
		return await this.sessionLeases.runInTurn(executionId, startRun);
	}

	private async startSdkRun(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
	): Promise<ReadableStream<StreamChunk>> {
		if (turn.type === 'start') {
			state.executionStarted = true;
			return (await config.agentInstance.stream(turn.input, turn.options)).stream;
		}

		const { options, resumeData } = turn;
		return (
			await config.agentInstance.resume('stream', resumeData, {
				...options,
				onResumeClaimed: async () => {
					state.executionStarted = true;
					recorder.recordHitlResponse(options.toolCallId, resumeData);
					await options.onResumeClaimed?.();
				},
			})
		).stream;
	}

	private async *streamTurn(
		stream: ReadableStream<StreamChunk>,
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
	): AsyncGenerator<StreamChunk> {
		const attributionTracker = createAttributionTracker(config.mcpServerAttributions);

		// Only a leased turn stops before its lease is released. Other turns cancel the stream.
		const stopOnEarlyExit = state.leased
			? {
					abortRun: () => state.stopRun.abort(),
					onDrainedChunk: (chunk: StreamChunk) => recorder.record(chunk),
				}
			: undefined;
		for await (const value of streamAgentChunks(stream, stopOnEarlyExit)) {
			const chunk = config.includeHitlToolDetails
				? withApprovalToolDetails(value, config.toolRegistry)
				: value;
			recorder.record(chunk);
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
	): Promise<void> {
		const finalize = async () =>
			await this.finalizeTurn(turn, config, recorder, executionId, state);
		const settle = async () => {
			if (config.previewChat) {
				await this.chatExecutionService.settle(executionId, finalize, state.suspendedRunId);
			} else {
				await finalize();
			}
		};
		if (!state.leased) return await settle();
		// In the scope of the turn, cancelling a stopped suspension is a fenced write.
		await this.sessionLeases.runInTurn(executionId, settle);
	}

	private async finalizeTurn(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		executionId: string,
		state: TurnExecutionState,
	): Promise<void> {
		const record = recorder.getMessageRecord();
		const cancelled =
			turn.options.abortSignal?.aborted ||
			(!state.receivedFinish && !recorder.suspended && record.error === null);
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
		});
	}

	createRecorder(
		toolRegistry?: ToolRegistry,
		getExecutionId: () => string | undefined = () => undefined,
		context?: RecordingContext,
		backgroundJobSignal?: AgentBackgroundJobSignal,
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
		);
	}

	async startExecution(
		params: StartExecutionParams,
		startedAt: Date,
		executionError?: unknown,
	): Promise<StartedExecution> {
		try {
			return await this.agentExecutionService.startExecutionRecording(params, startedAt);
		} catch (cause) {
			// Callers map a busy session to their own response, so keep its type.
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
		}
		onExecutionRecorded?.(recordedId);
	}

	/**
	 * Records a turn that failed before it could start. Takes the session lease
	 * like a turn. With the message queue flag off, Preview admission applies.
	 */
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
			(await this.startExecution(params, recorder.startedAt, executionError)).executionId;
		const recordFailure = async (executionId: string) => {
			await this.finalizeExecution({
				executionId,
				executionStarted: false,
				executionError,
				onExecutionRecorded,
				params: { ...params, record: recorder.getMessageRecord() },
			});
		};
		// TODO(AGENT-1031): Remove with the message queue flag, with the `options` parameter.
		if (options.previewChat && options.automaticContinuationRunId) {
			await this.chatExecutionService.admitAutomaticContinuation(
				params.threadId,
				params.agentId,
				options.automaticContinuationRunId,
				async () => await recordFailure(await recordStart()),
			);
			return;
		}
		await recordFailure(await this.admitStart(options.previewChat, params.threadId, recordStart));
	}

	/**
	 * The session lease admits the turn when its execution is recorded. With the
	 * message queue flag off, the Preview lock admits Preview turns.
	 */
	private async admitTurn(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
		previewControl?: PreviewExecutionControl,
	): Promise<ReadableStream<StreamChunk>> {
		const recordStart = async () => await this.recordTurnStart(turn, config, recorder, state);
		const startAccepted = async (id: string) =>
			await this.startAcceptedTurn(id, turn, config, recorder, state, previewControl);
		// TODO(AGENT-1031): Remove with the message queue flag. The session lease admits resumes.
		if (previewControl && config.automaticPreviewContinuation && turn.type === 'resume') {
			return await this.chatExecutionService.admitAutomaticContinuation(
				config.context.threadId,
				config.context.agentId,
				turn.options.runId,
				async () => await startAccepted(await recordStart()),
			);
		}
		return await startAccepted(
			await this.admitStart(previewControl !== undefined, config.context.threadId, recordStart),
		);
	}

	// TODO(AGENT-1031): Remove with the message queue flag. The session lease admits Preview turns.
	private async admitStart(
		previewChat: boolean | undefined,
		threadId: string,
		recordStart: () => Promise<string>,
	): Promise<string> {
		if (!previewChat) return await recordStart();
		return await this.chatExecutionService.admit(threadId, recordStart);
	}

	private async recordTurnStart(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
	): Promise<string> {
		const { executionId, leaseSignal } = await this.startExecutionWhenSessionFree(
			this.recordingParams(turn, config, recorder),
			recorder.startedAt,
			{
				waitMs: config.sessionWaitMs ?? 0,
				abortSignal: turn.options.abortSignal,
				assertCanStart: config.assertCanStart,
			},
		);
		state.executionId = executionId;
		state.leased = leaseSignal !== undefined;
		turn.options.abortSignal = anyAbortSignal(
			turn.options.abortSignal,
			leaseSignal,
			state.stopRun.signal,
		);
		turn.options.abortSignal.throwIfAborted();
		return executionId;
	}

	/** Starts the execution, waiting up to `waitMs` while another turn holds the session. */
	async startExecutionWhenSessionFree(
		params: StartExecutionParams,
		startedAt: Date,
		options: SessionWaitOptions,
	): Promise<StartedExecution> {
		const deadline = Date.now() + options.waitMs;
		for (;;) {
			const started = await this.tryStart(params, startedAt, deadline, options);
			if (started) return started;
			await sleep(SESSION_WAIT_POLL_MS, options.abortSignal);
		}
	}

	/** Returns null while another turn holds the session and the wait has not ended. */
	private async tryStart(
		params: StartExecutionParams,
		startedAt: Date,
		deadline: number,
		{ abortSignal, assertCanStart }: SessionWaitOptions,
	): Promise<StartedExecution | null> {
		abortSignal?.throwIfAborted();
		await assertCanStart?.();
		try {
			return await this.startExecution(params, startedAt);
		} catch (error) {
			if (error instanceof AgentTurnAlreadyRunningError && Date.now() < deadline) return null;
			throw error;
		}
	}

	private recordingParams(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
	): StartExecutionParams {
		if (!config.backgroundJobSignal) return turn.recording;
		return {
			...turn.recording,
			initialTimeline: structuredClone(recorder.getMessageRecord().timeline),
		};
	}

	private async startAcceptedTurn(
		executionId: string,
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
		previewControl?: PreviewExecutionControl,
	): Promise<ReadableStream<StreamChunk>> {
		if (previewControl) {
			this.chatExecutionService.register(
				{ ...config.context, userId: previewControl.userId, executionId },
				previewControl.controller,
			);
			previewControl.detachRequest();
		}
		config.onExecutionStarted?.(executionId, config.context.threadId);
		turn.options.abortSignal?.throwIfAborted();
		return await this.startTurn(executionId, turn, config, recorder, state);
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
