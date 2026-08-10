import {
	assertSubAgentTaskPath,
	deriveSubAgentTelemetry,
	renderDelegateSubAgentPrompt,
	type AgentExecutionCounter,
	type AgentMessage,
	type BuiltTelemetry,
	type CredentialProvider,
	type DelegateSubAgentCancelRequest,
	type DelegateSubAgentResumeRequest,
	type GenerateResult,
	type JSONValue,
	type SerializableAgentState,
	type StreamChunk,
	type StreamResult,
	type SubAgentTaskPath,
} from '@n8n/agents';
import type { ResolvedSubAgentSource, SubAgentSpawnRequest } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError, UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { AgentRunTelemetryType } from '@/interfaces';

import { AgentExecutionService } from '../agent-execution.service';
import type { AgentRuntimeInstrumentation } from '../agent-runtime-instrumentation';
import { buildAgentConfigurationTelemetryFromConfig } from '../agent-telemetry';
import type { MessageRecord } from '../execution-recorder';
import { ExecutionRecorder } from '../execution-recorder';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { WorkflowToolExecutionMode } from '../tools/workflow-tool-factory';
import { streamAgentChunks } from '../utils/agent-stream';
import { SubAgentSourceResolver } from './sub-agent-source-resolver';

export interface SubAgentForegroundRunContext {
	projectId: string;
	/** Saved n8n agent id of the delegating parent agent, used to link the child session back. */
	parentAgentId?: string;
	credentialProvider: CredentialProvider;
	/**
	 * Telemetry classification inherited from the delegating parent run. A
	 * sub-agent always runs its own published snapshot, so classifying by that
	 * alone would report `production` for every delegation — including ones made
	 * while the parent is being tested in the builder preview.
	 */
	runType: AgentRunTelemetryType;
	/** Workflow execution classification inherited from the parent runtime. */
	workflowToolExecutionMode?: WorkflowToolExecutionMode;
	executionCounter?: AgentExecutionCounter;
	/** Parent run's abort signal — cancelling the parent cancels this child. */
	abortSignal?: AbortSignal;
	/**
	 * Parent's live, resolved telemetry, forwarded per-request. Derived (via
	 * `deriveSubAgentTelemetry`) into the child's own telemetry so it shares the
	 * parent's tracer and nests under the parent's delegate-tool-call span.
	 */
	telemetry?: BuiltTelemetry;
	/**
	 * Interactive n8n user of the delegating parent run; used to filter the
	 * sub-agent's node/workflow tools by their access. Absent when the parent
	 * is a published/integration run.
	 */
	user?: User;
	/**
	 * Runtime instrumentation of the delegating parent run. Threaded into the
	 * child's reconstruction so delegated runs share the parent's seams
	 * (model fetch, MCP fetch, tool execution contexts).
	 */
	instrumentation?: AgentRuntimeInstrumentation;
	/** Optional callback to forward child stream chunks to the parent chat. */
	onChunk?: (chunk: StreamChunk) => void;
}

export interface SubAgentForegroundResult {
	taskPath: SubAgentTaskPath;
	/** The child run's memory/session thread id, so callers can link or continue it. */
	threadId: string;
	status: 'completed' | 'failed' | 'suspended';
	result: GenerateResult;
	/** Opaque, checkpoint-safe host context required to reconstruct this child exactly. */
	resumeContext?: JSONValue;
}

type ForegroundOperation = {
	taskPath: SubAgentTaskPath;
} & (
	| { type: 'run'; request: SubAgentSpawnRequest }
	| {
			type: 'resume';
			request: DelegateSubAgentResumeRequest;
			source: { agentId: string; versionId: string };
			threadId: string;
	  }
);

@Service()
export class SubAgentForegroundRunner {
	constructor(
		private readonly sourceResolver: SubAgentSourceResolver,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly logger: Logger,
	) {}

	async runForeground(
		request: SubAgentSpawnRequest,
		context: SubAgentForegroundRunContext,
	): Promise<SubAgentForegroundResult> {
		// Background execution (dispatch, return a receipt, reconcile the result
		// later) is not yet implemented. Tracked in AGENT-186:
		// https://linear.app/n8n/issue/AGENT-186
		if (request.executionMode !== undefined && request.executionMode !== 'foreground') {
			throw new UserError('Foreground sub-agent runner only supports foreground execution mode');
		}

		// The SDK delegate tool already assigned this delegation's task path and
		// enforced the depth/fan-out policy before invoking the runner. Just
		// validate the forwarded shape — don't recompute it or re-run the gates.
		const taskPath = request.taskPath;
		assertSubAgentTaskPath(taskPath);
		return await this.executeForeground({ type: 'run', request, taskPath }, context);
	}

	async resumeForeground(
		request: DelegateSubAgentResumeRequest,
		context: SubAgentForegroundRunContext,
	): Promise<SubAgentForegroundResult> {
		assertSubAgentTaskPath(request.taskPath);
		if (request.childThreadId === undefined || request.resumeContext === undefined) {
			throw new UserError('Configured sub-agent checkpoint metadata is missing or invalid');
		}
		const pinnedSource = parseResumeContext(request.resumeContext, request.subAgentId);
		return await this.executeForeground(
			{
				type: 'resume',
				request,
				taskPath: request.taskPath,
				source: pinnedSource,
				threadId: request.childThreadId,
			},
			context,
		);
	}

	async cancelForeground(request: DelegateSubAgentCancelRequest): Promise<void> {
		assertSubAgentTaskPath(request.taskPath);
		if (request.resumeContext === undefined) {
			throw new UserError('Configured sub-agent checkpoint metadata is missing or invalid');
		}
		const pinnedSource = parseResumeContext(request.resumeContext, request.subAgentId);
		await this.checkpointStorage.delete(request.childRunId, pinnedSource.agentId);
	}

	private async executeForeground(
		operation: ForegroundOperation,
		context: SubAgentForegroundRunContext,
	): Promise<SubAgentForegroundResult> {
		const runtimeSource = await this.sourceResolver.resolveForRuntime(
			operation.type === 'run' ? operation.request.source : operation.source,
			{ projectId: context.projectId },
		);

		// A delegated run uses the same fresh id for SDK memory and its session record.
		const threadId = operation.type === 'run' ? uuid() : operation.threadId;
		const resourceId =
			operation.type === 'run' ? (operation.request.parentResourceId ?? threadId) : threadId;
		const reconstructionService = await getReconstructionService();
		const childConfig =
			context.instrumentation?.transformDelegatedAgentConfig?.(runtimeSource.source.config, {
				subAgentId: runtimeSource.source.sourceId,
			}) ?? runtimeSource.source.config;
		const { agent } = await reconstructionService.reconstructFromResolvedSource({
			config: childConfig,
			memoryOwnerAgentId: runtimeSource.source.sourceId,
			projectId: context.projectId,
			credentialProvider: context.credentialProvider,
			toolDescriptors: runtimeSource.toolDescriptors,
			toolCodeByName: runtimeSource.toolCodeByName,
			skills: runtimeSource.skills,
			runtimeProfile: 'sub-agent',
			runType: context.runType,
			workflowToolExecutionMode: context.workflowToolExecutionMode,
			parentAgentIdForDelegation: context.parentAgentId,
			user: context.user,
			instrumentation: context.instrumentation,
		});

		const telemetry = deriveSubAgentTelemetry(context.telemetry);
		const userMessage =
			operation.type === 'run' ? renderDelegateSubAgentPrompt(operation.request) : null;
		let executionId: string | undefined;
		const recorder = new ExecutionRecorder(undefined, (timeline) => {
			if (executionId) {
				this.agentExecutionService.recordTimelineSnapshot({
					projectId: context.projectId,
					agentId: runtimeSource.source.sourceId,
					threadId,
					executionId,
					timeline,
				});
			}
		});
		const startedAt = recorder.startedAt;
		let recorded = false;
		try {
			const executionOptions = {
				...(context.abortSignal !== undefined ? { abortSignal: context.abortSignal } : {}),
				...(telemetry !== undefined ? { telemetry } : {}),
				executionCounter: context.executionCounter,
			};
			const resultStream =
				operation.type === 'run'
					? await agent.stream(userMessage ?? '', {
							...executionOptions,
							persistence: {
								resourceId,
								threadId,
								delegated: true,
							},
						})
					: await agent.resume('stream', operation.request.resumeData, {
							...executionOptions,
							runId: operation.request.childRunId,
							toolCallId: operation.request.childToolCallId,
						});
			try {
				const currentExecutionId = await this.agentExecutionService.startExecutionRecording(
					{
						threadId,
						agentId: runtimeSource.source.sourceId,
						agentName: runtimeSource.source.config.name,
						projectId: context.projectId,
						userMessage,
						source: 'subagent',
						threadMetadata: {
							parentThreadId: operation.request.parentThreadId,
							parentAgentId: context.parentAgentId,
						},
						telemetry: {
							runType: context.runType,
							configuration: buildAgentConfigurationTelemetryFromConfig(
								runtimeSource.source.config,
							),
						},
					},
					startedAt,
				);
				executionId = currentExecutionId;
			} catch (error) {
				this.logger.warn('Failed to start subagent execution recording', {
					agentId: runtimeSource.source.sourceId,
					taskPath: operation.taskPath,
					error: error instanceof Error ? error.message : String(error),
				});
			}
			const { messageRecord, result } = await consumeAgentStream(
				resultStream,
				recorder,
				context.onChunk,
			);
			const suspended = result.pendingSuspend !== undefined && result.pendingSuspend.length > 0;
			const hitlStatus = suspended
				? 'suspended'
				: operation.type === 'resume'
					? 'resumed'
					: undefined;
			await this.recordSubAgentExecution({
				runtimeSource: runtimeSource.source,
				projectId: context.projectId,
				threadId,
				parentThreadId: operation.request.parentThreadId,
				parentAgentId: context.parentAgentId,
				runType: context.runType,
				taskPath: operation.taskPath,
				userMessage,
				record: messageRecord,
				executionId,
				...(hitlStatus !== undefined ? { hitlStatus } : {}),
			});
			recorded = true;

			return {
				taskPath: operation.taskPath,
				threadId,
				status: suspended
					? 'suspended'
					: result.finishReason === 'error' || result.error !== undefined
						? 'failed'
						: 'completed',
				result,
				...(suspended ? { resumeContext: createResumeContext(runtimeSource.source) } : {}),
			};
		} catch (error) {
			if (!recorded) {
				recorder.record({ type: 'error', error });
				recorder.record({ type: 'finish', finishReason: 'error' });
				await this.recordSubAgentExecution({
					runtimeSource: runtimeSource.source,
					projectId: context.projectId,
					threadId,
					parentThreadId: operation.request.parentThreadId,
					parentAgentId: context.parentAgentId,
					runType: context.runType,
					taskPath: operation.taskPath,
					userMessage,
					record: recorder.getMessageRecord(),
					executionId,
					...(operation.type === 'resume' ? { hitlStatus: 'resumed' as const } : {}),
				});
			}
			throw error;
		} finally {
			await agent.close().catch((error) => {
				this.logger.warn(`Failed to close subagent after ${operation.type}`, {
					taskPath: operation.taskPath,
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}
	}

	private async recordSubAgentExecution(params: {
		runtimeSource: ResolvedSubAgentSource;
		projectId: string;
		/** Unified thread id, shared with the SDK memory thread. */
		threadId: string;
		parentThreadId?: string;
		parentAgentId?: string;
		runType: AgentRunTelemetryType;
		taskPath: SubAgentTaskPath;
		userMessage: string | null;
		record: MessageRecord;
		executionId?: string;
		hitlStatus?: 'suspended' | 'resumed';
	}): Promise<void> {
		const {
			runtimeSource,
			projectId,
			threadId,
			parentThreadId,
			parentAgentId,
			runType,
			taskPath,
			userMessage,
			record,
			executionId,
			hitlStatus,
		} = params;

		if (!executionId) return;
		try {
			await this.agentExecutionService.finalizeExecution(executionId, {
				threadId,
				agentId: runtimeSource.sourceId,
				agentName: runtimeSource.config.name,
				projectId,
				userMessage,
				record,
				...(hitlStatus !== undefined ? { hitlStatus } : {}),
				source: 'subagent',
				threadMetadata: {
					...(parentThreadId !== undefined ? { parentThreadId } : {}),
					...(parentAgentId !== undefined ? { parentAgentId } : {}),
				},
				telemetry: {
					runType,
					configuration: buildAgentConfigurationTelemetryFromConfig(runtimeSource.config),
				},
			});
		} catch (error) {
			this.logger.warn('Failed to record subagent execution', {
				agentId: runtimeSource.sourceId,
				taskPath,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

/**
 * Lazy resolution avoids a circular DI dependency: AgentRuntimeReconstructionService
 * injects SubAgentForegroundRunner into the delegate tool, while this runner needs
 * reconstruction only when a configured sub-agent run starts.
 */
async function getReconstructionService() {
	// eslint-disable-next-line import-x/no-cycle
	const { AgentRuntimeReconstructionService } = await import(
		'../agent-runtime-reconstruction.service.js'
	);
	return Container.get(AgentRuntimeReconstructionService);
}

async function consumeAgentStream(
	resultStream: StreamResult,
	recorder: ExecutionRecorder,
	onChunk?: (chunk: StreamChunk) => void,
): Promise<{ messageRecord: MessageRecord; result: GenerateResult }> {
	const pendingSuspend: NonNullable<GenerateResult['pendingSuspend']> = [];
	let structuredOutput: unknown;

	for await (const value of streamAgentChunks(resultStream.stream)) {
		recorder.record(value);
		onChunk?.(value);
		if (value.type === 'tool-call-suspended') {
			pendingSuspend.push({
				runId: value.runId,
				toolCallId: value.toolCallId,
				toolName: value.toolName,
				input: value.input,
				suspendPayload: value.suspendPayload,
				...(value.resumeSchema !== undefined ? { resumeSchema: value.resumeSchema } : {}),
			});
		}
		if (value.type === 'finish' && value.structuredOutput !== undefined) {
			structuredOutput = value.structuredOutput;
		}
	}

	const messageRecord = recorder.getMessageRecord();
	return {
		messageRecord,
		result: buildGenerateResultFromRecord(
			resultStream.runId,
			messageRecord,
			structuredOutput,
			() => resultStream.getState(),
			pendingSuspend,
		),
	};
}

function createResumeContext(runtimeSource: ResolvedSubAgentSource): JSONValue {
	if (runtimeSource.versionId === undefined) {
		throw new UnexpectedError('Resolved sub-agent source is missing its published version');
	}
	return { agentId: runtimeSource.sourceId, versionId: runtimeSource.versionId };
}

function parseResumeContext(
	resumeContext: JSONValue,
	subAgentId: string,
): { agentId: string; versionId: string } {
	if (
		!isRecord(resumeContext) ||
		typeof resumeContext.agentId !== 'string' ||
		resumeContext.agentId.length === 0 ||
		resumeContext.agentId !== subAgentId ||
		typeof resumeContext.versionId !== 'string' ||
		resumeContext.versionId.length === 0
	) {
		throw new UserError('Configured sub-agent resume context is missing or invalid');
	}
	return { agentId: resumeContext.agentId, versionId: resumeContext.versionId };
}

function buildGenerateResultFromRecord(
	runId: string,
	record: MessageRecord,
	structuredOutput: unknown,
	getState: () => SerializableAgentState,
	pendingSuspend: NonNullable<GenerateResult['pendingSuspend']> = [],
): GenerateResult {
	const messages = createAssistantMessages(record.assistantResponse);
	const finishReason = toKnownFinishReason(record.finishReason);
	const result: GenerateResult = {
		runId,
		messages,
		...(record.model !== null ? { model: record.model } : {}),
		...(finishReason !== undefined ? { finishReason } : {}),
		...(record.usage !== null
			? {
					usage: {
						...record.usage,
						...(record.totalCost !== null ? { cost: record.totalCost } : {}),
					},
				}
			: {}),
		...(structuredOutput !== undefined ? { structuredOutput } : {}),
		...(record.error !== null ? { error: record.error } : {}),
		...(pendingSuspend.length > 0 ? { pendingSuspend } : {}),
		getState,
	};
	return result;
}

function createAssistantMessages(text: string): AgentMessage[] {
	if (!text.trim()) return [];

	return [
		{
			role: 'assistant',
			content: [{ type: 'text', text }],
		},
	];
}

function toKnownFinishReason(
	value: string,
): NonNullable<GenerateResult['finishReason']> | undefined {
	if (
		value === 'stop' ||
		value === 'length' ||
		value === 'content-filter' ||
		value === 'tool-calls' ||
		value === 'error' ||
		value === 'other' ||
		value === 'max-iterations'
	) {
		return value;
	}
	return undefined;
}
