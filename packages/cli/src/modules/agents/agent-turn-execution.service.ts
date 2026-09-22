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

import { AgentExecutionRecordingError } from './agent-execution-recording.error';
import { AgentChatExecutionService } from './agent-chat-execution.service';
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
	previewChat?: boolean;
	automaticPreviewContinuation?: boolean;
	onExecutionStarted?: (executionId: string, sessionId: string) => void;
	onExecutionRecorded?: (executionId: string) => void;
	onSettled?: (suspended: boolean) => Promise<void>;
}

interface TurnExecutionState {
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

	async getSessionMode(threadId: string): Promise<'new' | 'existing'> {
		return await this.agentExecutionService.getSessionMode(threadId);
	}

	async *execute(config: ExecuteTurnConfig): AsyncGenerator<StreamChunk> {
		let executionId: string | undefined;
		let turn: AgentTurnRequest | undefined;
		let previewControl: PreviewExecutionControl | undefined;
		const state: TurnExecutionState = { executionStarted: false, receivedFinish: false };
		const recorder = this.createRecorder(
			config.toolRegistry,
			() => executionId,
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
			const recordStart = async () => {
				preparedTurn.options.abortSignal?.throwIfAborted();
				const id = await this.startExecution(
					{
						...preparedTurn.recording,
						...(config.backgroundJobSignal
							? { initialTimeline: structuredClone(recorder.getMessageRecord().timeline) }
							: {}),
					},
					recorder.startedAt,
				);
				executionId = id;
				preparedTurn.options.abortSignal?.throwIfAborted();
				return id;
			};
			const startAcceptedTurn = async (id: string) => {
				if (previewControl) {
					this.chatExecutionService.register(
						{
							...config.context,
							userId: previewControl.userId,
							executionId: id,
						},
						previewControl.controller,
					);
					previewControl.detachRequest();
				}
				config.onExecutionStarted?.(id, config.context.threadId);
				preparedTurn.options.abortSignal?.throwIfAborted();
				return await this.startTurn(preparedTurn, config, recorder, state);
			};
			let stream: ReadableStream<StreamChunk>;
			if (previewControl && config.automaticPreviewContinuation && preparedTurn.type === 'resume') {
				stream = await this.chatExecutionService.admitAutomaticContinuation(
					config.context.threadId,
					config.context.agentId,
					preparedTurn.options.runId,
					async () => await startAcceptedTurn(await recordStart()),
				);
			} else {
				executionId = previewControl
					? await this.chatExecutionService.admit(config.context.threadId, recordStart)
					: await recordStart();
				stream = await startAcceptedTurn(executionId);
			}
			yield* this.streamTurn(stream, preparedTurn, config, recorder, state);
		} catch (error) {
			state.executionError = error;
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			previewControl?.detachRequest();
			if (turn && executionId) {
				await this.settleTurn(turn, config, recorder, executionId, state);
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
		options: { previewChat?: boolean; automaticContinuationRunId?: string } = {},
	): Promise<void> {
		const recorder = this.createRecorder();
		recorder.record({ type: 'error', error: executionError });
		recorder.record({ type: 'finish', finishReason: 'error' });
		const recordStart = async () =>
			await this.startExecution(params, recorder.startedAt, executionError);
		const recordFailure = async (executionId: string) => {
			await this.finalizeExecution({
				executionId,
				executionStarted: false,
				executionError,
				onExecutionRecorded,
				params: { ...params, record: recorder.getMessageRecord() },
			});
		};
		if (options.previewChat && options.automaticContinuationRunId) {
			await this.chatExecutionService.admitAutomaticContinuation(
				params.threadId,
				params.agentId,
				options.automaticContinuationRunId,
				async () => await recordFailure(await recordStart()),
			);
		} else {
			const executionId = options.previewChat
				? await this.chatExecutionService.admit(params.threadId, recordStart)
				: await recordStart();
			await recordFailure(executionId);
		}
	}
}
