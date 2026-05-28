import {
	assertSubAgentPolicyAllowsChild,
	assertSubAgentPolicyAllowsChildCount,
	assertSubAgentTaskPath,
	createChildSubAgentTaskPath,
	type AgentExecutionCounter,
	type CredentialProvider,
	type GenerateResult,
	type SubAgentTaskPath,
} from '@n8n/agents';
import type { ResolvedSubAgentSource, SubAgentSpawnRequest } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

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

export const PREDEFINED_SUB_AGENT_INSTRUCTIONS = `\
You are a focused subagent working on a specific delegated task.

You start with fresh context. Use only the task, context, and expected output provided to you.

Complete the task thoroughly but concisely. Return:
- The answer or result
- Key findings or decisions
- Any uncertainty, missing context, or issues encountered`;

@Service()
export class SubAgentForegroundRunner {
	constructor(private readonly sourceResolver: SubAgentSourceResolver) {}

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
		try {
			const result = await agent.generate(renderSubAgentPrompt(request), {
				abortSignal: abortController?.signal,
				persistence: {
					resourceId: request.parentRunId ?? taskPath,
					threadId: memoryScopeId,
				},
				executionCounter: context.executionCounter,
			});
			const finishedAt = Date.now();

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
