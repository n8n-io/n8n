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

import { AgentExecutionRecordingError } from './agent-execution-recording.error';
import {
	AgentExecutionService,
	type RecordMessageParams,
	type StartExecutionParams,
} from './agent-execution.service';
import { buildToolCallDetails, ExecutionRecorder } from './execution-recorder';
import type { ToolRegistry } from './tool-registry';
import { streamAgentChunks } from './utils/agent-stream';
import { createAttributionTracker } from './utils/mcp-attribution';

type RecordingContext = Pick<StartExecutionParams, 'projectId' | 'agentId' | 'threadId'>;

type AgentTurnRequest = { recording: StartExecutionParams } & (
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
	onExecutionRecorded?: (executionId: string) => void;
	onAdmitted?: () => Promise<void>;
	onSettled?: (suspended: boolean) => Promise<void>;
}

interface TurnExecutionState {
	executionStarted: boolean;
	executionError?: unknown;
	receivedFinish: boolean;
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
	) {}

	async getSessionMode(threadId: string): Promise<'new' | 'existing'> {
		return await this.agentExecutionService.getSessionMode(threadId);
	}

	async *execute(config: ExecuteTurnConfig): AsyncGenerator<StreamChunk> {
		let executionId: string | undefined;
		let turn: AgentTurnRequest | undefined;
		const state: TurnExecutionState = { executionStarted: false, receivedFinish: false };
		const recorder = this.createRecorder(
			config.toolRegistry,
			() => executionId,
			config.context,
			config.backgroundJobSignal,
		);

		try {
			turn = await config.prepare();
			turn.options.abortSignal?.throwIfAborted();
			executionId = await this.startExecution(
				{
					...turn.recording,
					...(config.backgroundJobSignal
						? { initialTimeline: structuredClone(recorder.getMessageRecord().timeline) }
						: {}),
				},
				recorder.startedAt,
			);
			this.setHostRunId(turn, executionId);
			await config.onAdmitted?.();
			turn.options.abortSignal?.throwIfAborted();
			const stream = await this.startTurn(turn, config, recorder, state);
			yield* this.streamTurn(stream, turn, config, recorder, state);
		} catch (error) {
			state.executionError = error;
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			if (turn && executionId) {
				await this.finalizeTurn(turn, config, recorder, executionId, state);
				await config.onSettled?.(recorder.suspended);
			}
		}
	}

	private setHostRunId(turn: AgentTurnRequest, executionId: string): void {
		if (turn.type === 'resume') {
			turn.options.hostRunId = executionId;
		} else if (turn.options.persistence) {
			turn.options.persistence.hostRunId = executionId;
		}
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
			if (chunk.type === 'error') state.executionError = chunk.error;
			if (chunk.type === 'finish') state.receivedFinish = true;

			if (turn.type === 'start') {
				if (chunk.type === 'tool-call-suspended') {
					this.logger.info('Chat: tool-call-suspended chunk received', {
						agentId: config.context.agentId,
						toolCallId: chunk.toolCallId,
						toolName: chunk.toolName,
					});
				}
				if (chunk.type === 'finish' && chunk.finishReason === 'max-iterations') {
					for (const maxIterationsChunk of getMaxIterationsChunks()) {
						recorder.record(maxIterationsChunk);
						yield maxIterationsChunk;
					}
				}
			}

			for (const attributionChunk of attributionTracker.observe(chunk)) {
				recorder.record(attributionChunk);
				yield attributionChunk;
			}
			yield chunk;
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
		const hitlStatus = recorder.suspended
			? 'suspended'
			: turn.type === 'resume' && state.executionStarted
				? 'resumed'
				: undefined;

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
	): Promise<string> {
		try {
			return await this.agentExecutionService.startExecutionRecording(params, startedAt);
		} catch (cause) {
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

	async recordFailedStart(
		params: StartExecutionParams,
		executionError: unknown,
		onExecutionRecorded?: (executionId: string) => void,
	): Promise<void> {
		const recorder = this.createRecorder();
		recorder.record({ type: 'error', error: executionError });
		recorder.record({ type: 'finish', finishReason: 'error' });
		const executionId = await this.startExecution(params, recorder.startedAt, executionError);
		await this.finalizeExecution({
			executionId,
			executionStarted: false,
			executionError,
			onExecutionRecorded,
			params: { ...params, record: recorder.getMessageRecord() },
		});
	}
}
