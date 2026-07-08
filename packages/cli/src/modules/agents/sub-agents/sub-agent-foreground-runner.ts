import {
	assertSubAgentTaskPath,
	DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
	renderDelegateSubAgentPrompt,
	type AgentExecutionCounter,
	type AgentMessage,
	type CredentialProvider,
	type GenerateResult,
	type SubAgentTaskPath,
} from '@n8n/agents';
import type { ResolvedSubAgentSource, SubAgentSpawnRequest } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { AgentExecutionService } from '../agent-execution.service';
import { buildAgentConfigurationTelemetryFromConfig } from '../agent-telemetry';
import type { MessageRecord } from '../execution-recorder';
import { ExecutionRecorder } from '../execution-recorder';
import { streamAgentChunks } from '../utils/agent-stream';
import { SubAgentSourceResolver } from './sub-agent-source-resolver';

export interface SubAgentForegroundRunContext {
	projectId: string;
	/** Saved n8n agent id of the delegating parent agent, used to link the child session back. */
	parentAgentId?: string;
	credentialProvider: CredentialProvider;
	executionCounter?: AgentExecutionCounter;
	/** Parent run's abort signal — cancelling the parent cancels this child. */
	abortSignal?: AbortSignal;
	/**
	 * Interactive n8n user of the delegating parent run; used to filter the
	 * sub-agent's node/workflow tools by their access. Absent when the parent
	 * is a published/integration run.
	 */
	user?: User;
}

export interface SubAgentForegroundResult {
	taskPath: SubAgentTaskPath;
	/** The child run's memory/session thread id, so callers can link or continue it. */
	threadId: string;
	status: 'completed' | 'failed';
	result: GenerateResult;
}

@Service()
export class SubAgentForegroundRunner {
	constructor(
		private readonly sourceResolver: SubAgentSourceResolver,
		private readonly agentExecutionService: AgentExecutionService,
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

		const runtimeSource = await this.sourceResolver.resolveForRuntime(request.source, {
			projectId: context.projectId,
		});

		// A delegated run is a fresh conversation, so it gets an ordinary thread id
		// (a uuid) — exactly like any other agent run, with no special structure.
		// The parent linkage is persisted as columns on the session record
		// (origin / parentThreadId / parentAgentId), never encoded into the id.
		// The same id is shared by the SDK memory thread and the session record so
		// title sync, recall, and deletion all resolve to the same thread, and it is
		// returned on the result so a caller can re-supply it to continue the thread.
		const threadId = uuid();
		// Inherit the parent's episodic-memory scope. When the parent has none,
		// isolate this run to its own thread rather than widening to the project.
		const resourceId = request.parentResourceId ?? threadId;

		const reconstructionService = await getReconstructionService();
		const { agent } = await reconstructionService.reconstructFromResolvedSource({
			config: runtimeSource.source.config,
			memoryOwnerAgentId: runtimeSource.source.sourceId,
			projectId: context.projectId,
			credentialProvider: context.credentialProvider,
			toolDescriptors: runtimeSource.toolDescriptors,
			toolCodeByName: runtimeSource.toolCodeByName,
			skills: runtimeSource.skills,
			runtimeProfile: 'sub-agent',
			parentAgentIdForDelegation: context.parentAgentId,
			user: context.user,
		});

		// Abort the child when the parent run is cancelled.
		const abortSignal = context.abortSignal;

		const prompt = renderDelegateSubAgentPrompt(request);
		try {
			const resultStream = await agent.stream(prompt, {
				...(abortSignal !== undefined ? { abortSignal } : {}),
				persistence: {
					resourceId,
					threadId,
				},
				executionCounter: context.executionCounter,
			});
			const recorder = new ExecutionRecorder();
			let structuredOutput: unknown;
			let childSuspended = false;

			for await (const value of streamAgentChunks(resultStream.stream)) {
				recorder.record(value);
				if (value.type === 'tool-call-suspended') {
					childSuspended = true;
				}
				if (value.type === 'finish' && value.structuredOutput !== undefined) {
					structuredOutput = value.structuredOutput;
				}
			}

			const messageRecord = recorder.getMessageRecord();
			await this.recordSubAgentExecution({
				runtimeSource: runtimeSource.source,
				projectId: context.projectId,
				threadId,
				parentThreadId: request.parentThreadId,
				parentAgentId: context.parentAgentId,
				taskPath,
				prompt,
				record: messageRecord,
			});
			if (childSuspended) {
				return {
					taskPath,
					threadId,
					status: 'failed',
					result: {
						runId: resultStream.runId,
						messages: [],
						finishReason: 'error',
						error: DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
						getState: () => {
							throw new Error('getState is not implemented for sub-agent foreground runner');
						},
					},
				};
			}

			const result = buildGenerateResultFromRecord(
				resultStream.runId,
				messageRecord,
				structuredOutput,
			);

			return {
				taskPath,
				threadId,
				status:
					result.finishReason === 'error' || result.error !== undefined ? 'failed' : 'completed',
				result,
			};
		} finally {
			// Each delegation builds its own child agent, so release it here:
			// dispose the runtime's background tasks and disconnect any MCP
			// transports instead of leaking them per delegated run.
			await agent.close().catch((error) => {
				this.logger.warn('Failed to close subagent after run', {
					taskPath,
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
		taskPath: SubAgentTaskPath;
		prompt: string;
		record: MessageRecord;
	}): Promise<void> {
		const {
			runtimeSource,
			projectId,
			threadId,
			parentThreadId,
			parentAgentId,
			taskPath,
			prompt,
			record,
		} = params;

		try {
			await this.agentExecutionService.recordMessage({
				threadId,
				agentId: runtimeSource.sourceId,
				agentName: runtimeSource.config.name,
				projectId,
				userMessage: prompt,
				record,
				source: 'subagent',
				threadMetadata: {
					...(parentThreadId !== undefined ? { parentThreadId } : {}),
					...(parentAgentId !== undefined ? { parentAgentId } : {}),
				},
				telemetry: {
					runType: 'production',
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
		'../agent-runtime-reconstruction.service'
	);
	return Container.get(AgentRuntimeReconstructionService);
}

function buildGenerateResultFromRecord(
	runId: string,
	record: MessageRecord,
	structuredOutput: unknown,
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
		getState: () => {
			throw new Error('getState is not implemented for sub-agent foreground runner');
		},
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
