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
import { withLeaseSignal } from './agent-session-lease.service';
import { AgentTurnAlreadyRunningError } from './agent-turn-already-running.error';
import { buildToolCallDetails, ExecutionRecorder } from './execution-recorder';
import type { ToolRegistry } from './tool-registry';
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
	onExecutionStarted?: (executionId: string, sessionId: string) => void;
	onExecutionRecorded?: (executionId: string) => void;
	onSettled?: (suspended: boolean) => Promise<void>;
}

interface TurnExecutionState {
	executionId?: string;
	executionStarted: boolean;
	executionError?: unknown;
	receivedFinish: boolean;
	suspendedRunId?: string;
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
	) {}

	async getSessionMode(threadId: string): Promise<AgentSessionMode> {
		return await this.agentExecutionService.getSessionMode(threadId);
	}

	async *execute(config: ExecuteTurnConfig): AsyncGenerator<StreamChunk> {
		let turn: AgentTurnRequest | undefined;
		let previewControl: PreviewExecutionControl | undefined;
		const state: TurnExecutionState = { executionStarted: false, receivedFinish: false };
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

	private async startTurn(
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

		for await (const value of streamAgentChunks(stream)) {
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
		if (config.previewChat) {
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

	/** Records a turn that failed before it could start. Takes the session lease like a turn. */
	async recordFailedStart(
		params: StartExecutionParams,
		executionError: unknown,
		onExecutionRecorded?: (executionId: string) => void,
	): Promise<void> {
		const recorder = this.createRecorder();
		recorder.record({ type: 'error', error: executionError });
		recorder.record({ type: 'finish', finishReason: 'error' });
		const { executionId } = await this.startExecution(params, recorder.startedAt, executionError);
		await this.finalizeExecution({
			executionId,
			executionStarted: false,
			executionError,
			onExecutionRecorded,
			params: { ...params, record: recorder.getMessageRecord() },
		});
	}

	/** The session lease admits the turn when its execution is recorded. */
	private async admitTurn(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
		previewControl?: PreviewExecutionControl,
	): Promise<ReadableStream<StreamChunk>> {
		const executionId = await this.recordTurnStart(turn, config, recorder, state);
		return await this.startAcceptedTurn(executionId, turn, config, recorder, state, previewControl);
	}

	private async recordTurnStart(
		turn: AgentTurnRequest,
		config: ExecuteTurnConfig,
		recorder: ExecutionRecorder,
		state: TurnExecutionState,
	): Promise<string> {
		turn.options.abortSignal?.throwIfAborted();
		const { executionId, leaseSignal } = await this.startExecution(
			{
				...turn.recording,
				...(config.backgroundJobSignal
					? { initialTimeline: structuredClone(recorder.getMessageRecord().timeline) }
					: {}),
			},
			recorder.startedAt,
		);
		state.executionId = executionId;
		turn.options.abortSignal = withLeaseSignal(turn.options.abortSignal, leaseSignal);
		turn.options.abortSignal.throwIfAborted();
		return executionId;
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
