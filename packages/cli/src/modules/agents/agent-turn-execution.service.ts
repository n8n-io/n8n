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
		const recorder = this.createRecorder(
			toolRegistry,
			() => executionId,
			config.context,
			backgroundJobSignal,
		);

		try {
			turn = await config.prepare();
			const result =
				turn.type === 'start'
					? await agentInstance.stream(turn.input, turn.options)
					: await agentInstance.resume('stream', turn.resumeData, turn.options);
			if (turn.type === 'resume') {
				recorder.recordHitlResponse(turn.options.toolCallId, turn.resumeData);
			}

			// Keep SDK startup independent of execution-history storage.
			executionId = await this.tryStartExecution(
				{
					...turn.recording,
					...(backgroundJobSignal
						? { initialTimeline: structuredClone(recorder.getMessageRecord().timeline) }
						: {}),
				},
				recorder.startedAt,
				turn.type === 'resume'
					? 'Failed to start resumed agent execution recording'
					: 'Failed to start agent execution recording',
			);
			const attributionTracker = createAttributionTracker(config.mcpServerAttributions);
			for await (const value of streamAgentChunks(result.stream)) {
				const chunk = config.includeHitlToolDetails
					? withApprovalToolDetails(value, toolRegistry)
					: value;
				recorder.record(chunk);
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
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			if (turn) {
				const record = recorder.getMessageRecord();
				await this.persistRecordedExecution({
					executionId,
					onExecutionRecorded,
					failureMessage:
						turn.type === 'resume'
							? 'Failed to record resumed agent execution'
							: 'Failed to record agent execution',
					params: {
						...turn.recording,
						record: turn.options.abortSignal?.aborted
							? { ...record, finishReason: 'cancelled', error: null }
							: record,
						hitlStatus: recorder.suspended
							? 'suspended'
							: turn.type === 'resume'
								? 'resumed'
								: undefined,
					},
				});
			}
			await config.onSettled?.(recorder.suspended);
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

	async tryStartExecution(
		params: StartExecutionParams,
		startedAt: Date,
		failureMessage: string,
	): Promise<string | undefined> {
		try {
			return await this.agentExecutionService.startExecutionRecording(params, startedAt);
		} catch (error) {
			this.logger.warn(failureMessage, {
				agentId: params.agentId,
				threadId: params.threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	async persistRecordedExecution(args: {
		executionId?: string;
		onExecutionRecorded?: (executionId: string) => void;
		params: RecordMessageParams;
		failureMessage: string;
	}): Promise<void> {
		const { executionId, onExecutionRecorded, params, failureMessage } = args;
		if (!executionId) return;
		try {
			const recordedId = await this.agentExecutionService.finalizeExecution(executionId, params);
			onExecutionRecorded?.(recordedId);
		} catch (error) {
			this.logger.warn(failureMessage, {
				agentId: params.agentId,
				threadId: params.threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
