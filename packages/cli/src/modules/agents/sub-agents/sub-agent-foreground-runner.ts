import {
	assertSubAgentTaskPath,
	renderDelegateSubAgentPrompt,
	type AgentExecutionCounter,
	type AgentMessage,
	type CredentialProvider,
	type GenerateResult,
	type SubAgentTaskPath,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { ResolvedSubAgentSource, SubAgentSpawnRequest } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { AgentExecutionService } from '../agent-execution.service';
import { ExecutionRecorder } from '../execution-recorder';
import type { MessageRecord } from '../execution-recorder';
import {
	buildFromJson,
	type MemoryFactory,
	type ToolExecutor,
	type ToolResolver,
} from '../json-config/from-json-config';
import { SubAgentSourceResolver } from './sub-agent-source-resolver';

export interface SubAgentForegroundRunContext {
	projectId: string;
	/** Saved n8n agent id of the delegating parent agent, used to link the child session back. */
	parentAgentId?: string;
	credentialProvider: CredentialProvider;
	createToolExecutor(toolCodeByName: Record<string, string>): ToolExecutor;
	createMemoryFactory(memoryOwnerAgentId: string): MemoryFactory;
	resolveTool?: ToolResolver;
	executionCounter?: AgentExecutionCounter;
	/** Parent run's abort signal — cancelling the parent cancels this child. */
	abortSignal?: AbortSignal;
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

		if (request.contextMode !== undefined && request.contextMode !== 'fresh') {
			throw new UserError('Foreground sub-agent runner only supports fresh context mode');
		}

		// The SDK delegate tool already assigned this delegation's task path and
		// enforced the depth/fan-out policy before invoking the runner. Just
		// validate the forwarded shape — don't recompute it or re-run the gates.
		const taskPath = request.taskPath;
		assertSubAgentTaskPath(taskPath);

		const runtimeSource = await this.sourceResolver.resolveForRuntime(request.source, {
			projectId: context.projectId,
		});

		const toolExecutor = context.createToolExecutor(runtimeSource.toolCodeByName);
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
		const agent = await buildFromJson(runtimeSource.source.config, runtimeSource.toolDescriptors, {
			toolExecutor,
			credentialProvider: context.credentialProvider,
			resolveTool: context.resolveTool,
			skills: runtimeSource.skills,
			memoryFactory: createSubAgentMemoryFactory(runtimeSource.source, context),
		});

		const timeoutController = request.policy?.timeoutMs ? new AbortController() : undefined;
		const timeout = timeoutController
			? setTimeout(() => timeoutController.abort(), request.policy?.timeoutMs)
			: undefined;
		// Abort the child when the parent run is cancelled or the timeout fires.
		const abortSignal = combineAbortSignals(context.abortSignal, timeoutController?.signal);

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

			const reader = resultStream.stream.getReader();
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					recorder.record(value);
					if (value.type === 'finish' && value.structuredOutput !== undefined) {
						structuredOutput = value.structuredOutput;
					}
				}
			} finally {
				reader.releaseLock();
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
			if (timeout) clearTimeout(timeout);
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
					origin: 'subagent',
					...(parentThreadId !== undefined ? { parentThreadId } : {}),
					...(parentAgentId !== undefined ? { parentAgentId } : {}),
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

function createSubAgentMemoryFactory(
	source: ResolvedSubAgentSource,
	context: SubAgentForegroundRunContext,
): MemoryFactory {
	return async (params) => {
		return await context.createMemoryFactory(source.sourceId)(params);
	};
}

/** Merge up to two abort signals: cancellation of either cancels the child run. */
function combineAbortSignals(
	a: AbortSignal | undefined,
	b: AbortSignal | undefined,
): AbortSignal | undefined {
	const signals = [a, b].filter((signal): signal is AbortSignal => signal !== undefined);
	if (signals.length <= 1) return signals[0];
	return AbortSignal.any(signals);
}
