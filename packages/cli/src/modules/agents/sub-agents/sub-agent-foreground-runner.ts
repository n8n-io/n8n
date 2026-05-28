import {
	assertSubAgentPolicyAllowsChild,
	assertSubAgentPolicyAllowsChildCount,
	assertSubAgentTaskPath,
	createChildSubAgentTaskPath,
	type AgentExecutionCounter,
	type AgentMessage,
	type CredentialProvider,
	type GenerateResult,
	type SubAgentTaskPath,
} from '@n8n/agents';
import { randomUUID } from 'node:crypto';
import { Logger } from '@n8n/backend-common';
import type { ResolvedSubAgentSource, SubAgentSpawnRequest } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

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
	childCount?: number;
	credentialProvider: CredentialProvider;
	createToolExecutor(toolCodeByName: Record<string, string>): ToolExecutor;
	createMemoryFactory(memoryOwnerAgentId: string): MemoryFactory;
	resolveTool?: ToolResolver;
	executionCounter?: AgentExecutionCounter;
}

export interface SubAgentForegroundResult {
	taskPath: SubAgentTaskPath;
	source: ResolvedSubAgentSource;
	status: 'completed' | 'failed';
	startedAt: number;
	finishedAt: number;
	durationMs: number;
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
		if (request.executionMode !== undefined && request.executionMode !== 'foreground') {
			throw new UserError('Foreground sub-agent runner only supports foreground execution mode');
		}

		if (request.contextMode !== undefined && request.contextMode !== 'fresh') {
			throw new UserError('Foreground sub-agent runner only supports fresh context mode');
		}

		const parentTaskPath = request.parentTaskPath;
		if (parentTaskPath !== undefined) {
			assertSubAgentTaskPath(parentTaskPath);
		}

		assertSubAgentPolicyAllowsChild(parentTaskPath, request.policy);
		assertSubAgentPolicyAllowsChildCount(context.childCount ?? 0, request.policy);

		const taskPath = createChildSubAgentTaskPath(parentTaskPath, request.taskName);
		const runtimeSource = await this.sourceResolver.resolveForRuntime(request.source, {
			projectId: context.projectId,
		});

		const toolExecutor = context.createToolExecutor(runtimeSource.toolCodeByName);
		const memoryScopeId = createSubAgentMemoryScopeId(request.parentRunId, taskPath);
		const agent = await buildFromJson(runtimeSource.source.config, runtimeSource.toolDescriptors, {
			toolExecutor,
			credentialProvider: context.credentialProvider,
			resolveTool: context.resolveTool,
			skills: runtimeSource.skills,
			memoryFactory: createSubAgentMemoryFactory(runtimeSource.source, context),
		});

		const abortController = request.policy?.timeoutMs ? new AbortController() : undefined;
		const timeout = request.policy?.timeoutMs
			? setTimeout(() => abortController?.abort(), request.policy.timeoutMs)
			: undefined;

		const startedAt = Date.now();
		const prompt = renderSubAgentPrompt(request);
		try {
			const resultStream = await agent.stream(prompt, {
				abortSignal: abortController?.signal,
				persistence: {
					resourceId: request.parentRunId ?? taskPath,
					threadId: memoryScopeId,
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

			const finishedAt = Date.now();
			const messageRecord = recorder.getMessageRecord();
			await this.recordSubAgentExecution({
				runtimeSource: runtimeSource.source,
				projectId: context.projectId,
				parentRunId: request.parentRunId,
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
				source: runtimeSource.source,
				status:
					result.finishReason === 'error' || result.error !== undefined ? 'failed' : 'completed',
				startedAt,
				finishedAt,
				durationMs: finishedAt - startedAt,
				result,
			};
		} finally {
			if (timeout) clearTimeout(timeout);
		}
	}

	private async recordSubAgentExecution(params: {
		runtimeSource: ResolvedSubAgentSource;
		projectId: string;
		parentRunId?: string;
		taskPath: SubAgentTaskPath;
		prompt: string;
		record: MessageRecord;
	}): Promise<void> {
		const { runtimeSource, projectId, parentRunId, taskPath, prompt, record } = params;
		if (runtimeSource.type !== 'n8n-agent' || !runtimeSource.sourceId) return;

		try {
			await this.agentExecutionService.recordMessage({
				threadId: randomUUID(),
				agentId: runtimeSource.sourceId,
				agentName: runtimeSource.config.name,
				projectId,
				userMessage: prompt,
				record,
				source: 'subagent',
				threadMetadata: {
					origin: 'subagent',
					...(parentRunId !== undefined ? { parentRunId } : {}),
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
		if (source.type !== 'n8n-agent' || !source.sourceId) {
			throw new UserError('Sub-agent memory is only supported for saved n8n agents');
		}

		return await context.createMemoryFactory(source.sourceId)(params);
	};
}

export function renderSubAgentPrompt(request: SubAgentSpawnRequest): string {
	const sections = [`Goal:\n${request.goal}`];

	if (request.context) {
		sections.push(`Context:\n${request.context}`);
	}

	if (request.expectedOutput) {
		sections.push(`Expected output:\n${request.expectedOutput}`);
	}

	return sections.join('\n\n');
}

export function createSubAgentMemoryScopeId(
	parentRunId: string | undefined,
	taskPath: SubAgentTaskPath,
): string {
	return `subagent:${parentRunId ?? 'adhoc'}:${taskPath}`;
}
