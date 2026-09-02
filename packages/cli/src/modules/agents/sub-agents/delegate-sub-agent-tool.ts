import {
	createDelegateSubAgentTool,
	generateResultToDelegateSubAgentOutput,
	INLINE_SUB_AGENT_ID,
	type DelegateSubAgentToolOutput,
	type InlineSubAgentProviderToolsResolver,
	type ModelConfig,
	type SubAgentTaskDifficulty,
} from '@n8n/agents';
import type { SubAgentRunPolicy, SubAgentSource } from '@n8n/api-types';
import { OperationalError, UserError } from 'n8n-workflow';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';

import { decodeAgentSandboxHostMetadata } from '../agent-sandbox-principal';
import type {
	SubAgentForegroundRunContext,
	SubAgentForegroundResult,
	SubAgentForegroundRunner,
} from './sub-agent-foreground-runner';

export interface CreateN8nDelegateSubAgentToolOptions extends SubAgentForegroundRunContext {
	runner: SubAgentForegroundRunner;
	sourcesById: Record<string, SubAgentSource>;
	availableSubAgents?: Array<{ id: string; name: string; useWhen?: string }>;
	policy?: SubAgentRunPolicy;
	inlineSubAgentModelsByDifficulty?: Partial<Record<SubAgentTaskDifficulty, ModelConfig>>;
	resolveInlineSubAgentProviderTools?: InlineSubAgentProviderToolsResolver;
}

export function createN8nDelegateSubAgentTool(options: CreateN8nDelegateSubAgentToolOptions) {
	const {
		runner,
		sourcesById,
		availableSubAgents,
		policy,
		inlineSubAgentModelsByDifficulty,
		resolveInlineSubAgentProviderTools,
		...runContext
	} = options;

	return createDelegateSubAgentTool({
		...(availableSubAgents !== undefined ? { availableSubAgents } : {}),
		...(policy !== undefined ? { policy } : {}),
		...(inlineSubAgentModelsByDifficulty !== undefined ? { inlineSubAgentModelsByDifficulty } : {}),
		...(resolveInlineSubAgentProviderTools !== undefined
			? { resolveInlineSubAgentProviderTools }
			: {}),
		shouldRetrySubAgentResumeError,
		runSubAgent: async (request, helpers) => {
			const isSelfDelegation = request.subAgentId === INLINE_SUB_AGENT_ID;
			const selectedSource = selectSubAgentSource({
				sourcesById,
				subAgentId: request.subAgentId,
				parentAgentId: runContext.parentAgentId,
			});
			if (!selectedSource) {
				return {
					status: 'failed',
					taskPath: request.taskPath,
					answer: '',
					error: `No configured subagent matched "${request.subAgentId}". Use "inline" for an inline sub-agent, or pass one of the configured subagent IDs.`,
				};
			}
			const parentSandboxScope = decodeAgentSandboxHostMetadata(request.parentHostMetadata);

			const result = await runner.runForeground(
				{
					goal: request.goal,
					source: selectedSource,
					executionMode: 'foreground',
					...(request.context !== undefined ? { context: request.context } : {}),
					...(request.expectedOutput !== undefined
						? { expectedOutput: request.expectedOutput }
						: {}),
					...(policy !== undefined ? { policy } : {}),
					...(request.parentThreadId !== undefined
						? { parentThreadId: request.parentThreadId }
						: {}),
					...(request.parentResourceId !== undefined
						? { parentResourceId: request.parentResourceId }
						: {}),
					...(parentSandboxScope?.projectId === runContext.projectId
						? { parentSandboxPrincipalHash: parentSandboxScope.principalHash }
						: {}),
					taskPath: request.taskPath,
				},
				{
					...runContext,
					...(request.parentExecutionCounter !== undefined
						? { executionCounter: request.parentExecutionCounter }
						: {}),
					...(request.parentAbortSignal !== undefined
						? { abortSignal: request.parentAbortSignal }
						: {}),
					...(request.parentTelemetry !== undefined ? { telemetry: request.parentTelemetry } : {}),
					onChunk: helpers.emitChunk,
					...(isSelfDelegation && request.difficulty !== undefined
						? { selfDelegationDifficulty: request.difficulty }
						: {}),
				},
			);

			return formatSubAgentToolOutput(result);
		},
		resumeSubAgent: async (request, helpers) => {
			if (request.childThreadId === undefined || request.resumeContext === undefined) {
				return {
					status: 'failed',
					taskPath: request.taskPath,
					answer: '',
					error: 'Configured sub-agent checkpoint metadata is missing or invalid.',
				};
			}

			const context = {
				...runContext,
				...(request.parentExecutionCounter !== undefined
					? { executionCounter: request.parentExecutionCounter }
					: {}),
				...(request.parentAbortSignal !== undefined
					? { abortSignal: request.parentAbortSignal }
					: {}),
				...(request.parentTelemetry !== undefined ? { telemetry: request.parentTelemetry } : {}),
				onChunk: helpers.emitChunk,
				...(request.subAgentId === INLINE_SUB_AGENT_ID && request.difficulty !== undefined
					? { selfDelegationDifficulty: request.difficulty }
					: {}),
			};
			const result =
				request.subAgentId === INLINE_SUB_AGENT_ID
					? await runner.resumeForeground(
							request,
							context,
							resolveExpectedSourceAgentId(request.subAgentId, runContext.parentAgentId),
						)
					: await runner.resumeForeground(request, context);

			return formatSubAgentToolOutput(result);
		},
		cancelSubAgent: async (request) => {
			if (request.resumeContext === undefined) {
				throw new Error('Configured sub-agent checkpoint metadata is missing or invalid.');
			}
			if (request.subAgentId === INLINE_SUB_AGENT_ID) {
				await runner.cancelForeground(
					request,
					resolveExpectedSourceAgentId(request.subAgentId, runContext.parentAgentId),
				);
				return;
			}
			await runner.cancelForeground(request);
		},
	});
}

function shouldRetrySubAgentResumeError(error: unknown): boolean {
	if (error instanceof OperationalError) return true;
	if (!(error instanceof ResponseError)) return false;
	return [408, 425, 429, 502, 503, 504].includes(error.httpStatusCode);
}

function selectSubAgentSource(options: {
	sourcesById: Record<string, SubAgentSource>;
	subAgentId: string;
	parentAgentId?: string;
}): SubAgentSource | undefined {
	const { sourcesById, subAgentId, parentAgentId } = options;
	if (subAgentId === INLINE_SUB_AGENT_ID) {
		return { agentId: resolveExpectedSourceAgentId(subAgentId, parentAgentId) };
	}
	return sourcesById?.[subAgentId];
}

function resolveExpectedSourceAgentId(subAgentId: string, parentAgentId?: string): string {
	if (subAgentId !== INLINE_SUB_AGENT_ID) return subAgentId;
	if (!parentAgentId) {
		throw new UserError('Inline sub-agent parent Agent identity is missing');
	}
	return parentAgentId;
}

export function formatSubAgentToolOutput(
	result: SubAgentForegroundResult,
): DelegateSubAgentToolOutput {
	const output = generateResultToDelegateSubAgentOutput(
		result.taskPath,
		result.result,
		result.threadId,
	);
	return {
		...output,
		...(output.status === 'suspended' && result.resumeContext !== undefined
			? { resumeContext: result.resumeContext }
			: {}),
	};
}
