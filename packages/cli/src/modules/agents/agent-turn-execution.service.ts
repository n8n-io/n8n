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
	onSettled?: (suspended: boolean) => Promise<void>;
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

	async *execute(config: ExecuteTurnConfig): AsyncGenerator<StreamChunk> {
		const { agentInstance, toolRegistry, backgroundJobSignal, onExecutionRecorded } = config;
		let executionId: string | undefined;
		let turn: AgentTurnRequest | undefined;
		let executionStarted = false;
		let executionError: unknown;
		let receivedFinish = false;
		const recorder = this.createRecorder(
			toolRegistry,
			() => executionId,
			config.context,
			backgroundJobSignal,
		);

		try {
			turn = await config.prepare();
			turn.options.abortSignal?.throwIfAborted();
			executionId = await this.startExecution(
				{
					...turn.recording,
					...(backgroundJobSignal
						? { initialTimeline: structuredClone(recorder.getMessageRecord().timeline) }
						: {}),
				},
				recorder.startedAt,
			);
			turn.options.abortSignal?.throwIfAborted();
			let result;
			if (turn.type === 'start') {
				executionStarted = true;
				result = await agentInstance.stream(turn.input, turn.options);
			} else {
				const { options, resumeData } = turn;
				result = await agentInstance.resume('stream', resumeData, {
					...options,
					onResumeClaimed: async () => {
						executionStarted = true;
						recorder.recordHitlResponse(options.toolCallId, resumeData);
						await options.onResumeClaimed?.();
					},
				});
			}
			const attributionTracker = createAttributionTracker(config.mcpServerAttributions);
			for await (const value of streamAgentChunks(result.stream)) {
				const chunk = config.includeHitlToolDetails
					? withApprovalToolDetails(value, toolRegistry)
					: value;
				recorder.record(chunk);
				if (chunk.type === 'error') executionError = chunk.error;
				if (chunk.type === 'finish') receivedFinish = true;
				if (turn.type === 'start') {
					if (chunk.type === 'tool-call-suspended') {
						this.logger.info('Chat: tool-call-suspended chunk received', {
							agentId: config.context.agentId,
							toolCallId: chunk.toolCallId,
							toolName: chunk.toolName,
						});
					}
					if (chunk.type === 'finish' && chunk.finishReason === 'max-iterations') {
						for (const chunk of getMaxIterationsChunks()) {
							recorder.record(chunk);
							yield chunk;
						}
					}
				}
				for (const attributionChunk of attributionTracker.observe(chunk)) {
					recorder.record(attributionChunk);
					yield attributionChunk;
				}
				yield chunk;
			}
		} catch (error) {
			executionError = error;
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			if (turn && executionId) {
				const record = recorder.getMessageRecord();
				const cancelled =
					turn.options.abortSignal?.aborted ||
					(!receivedFinish && !recorder.suspended && record.error === null);
				await this.finalizeExecution({
					executionId,
					executionStarted,
					executionError,
					onExecutionRecorded,
					params: {
						...turn.recording,
						record: cancelled ? { ...record, finishReason: 'cancelled', error: null } : record,
						hitlStatus: recorder.suspended
							? 'suspended'
							: turn.type === 'resume' && executionStarted
								? 'resumed'
								: undefined,
					},
				});
				await config.onSettled?.(recorder.suspended);
			}
		}
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
