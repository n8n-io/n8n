import {
	createDelegateSubAgentTool,
	INLINE_SUB_AGENT_ID,
	type InlineSubAgentProviderToolsResolver,
	type ModelConfig,
	type SubAgentTaskDifficulty,
} from '@n8n/agents';
import type { SubAgentRunPolicy, SubAgentSource } from '@n8n/api-types';
import { OperationalError } from 'n8n-workflow';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';

import { decodeAgentSandboxHostMetadata } from '../agent-sandbox-principal';
import { formatSubAgentToolOutput } from './format-sub-agent-tool-output';
import type { SubAgentRunContext, SubAgentRunner } from './sub-agent-runner';

export interface CreateN8nDelegateSubAgentToolOptions extends SubAgentRunContext {
	runner: SubAgentRunner;
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
			if (request.subAgentId === INLINE_SUB_AGENT_ID) {
				return await helpers.runInlineSubAgent(request);
			}

			const selectedSource = selectSubAgentSource({
				sourcesById,
				subAgentId: request.subAgentId,
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

			const result = await runner.run(
				{
					goal: request.goal,
					source: selectedSource,
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
				},
			);

			return formatSubAgentToolOutput(result);
		},
		resumeSubAgent: async (request, helpers) => {
			if (request.subAgentId === INLINE_SUB_AGENT_ID) {
				return {
					status: 'failed',
					taskPath: request.taskPath,
					answer: '',
					error: 'Inline sub-agent resumes must be handled by the parent Agent runtime.',
				};
			}
			if (request.childThreadId === undefined || request.resumeContext === undefined) {
				return {
					status: 'failed',
					taskPath: request.taskPath,
					answer: '',
					error: 'Configured sub-agent checkpoint metadata is missing or invalid.',
				};
			}

			const result = await runner.resumeForeground(request, {
				...runContext,
				...(request.parentExecutionCounter !== undefined
					? { executionCounter: request.parentExecutionCounter }
					: {}),
				...(request.parentAbortSignal !== undefined
					? { abortSignal: request.parentAbortSignal }
					: {}),
				...(request.parentTelemetry !== undefined ? { telemetry: request.parentTelemetry } : {}),
				onChunk: helpers.emitChunk,
			});

			return formatSubAgentToolOutput(result);
		},
		cancelSubAgent: async (request) => {
			if (request.subAgentId === INLINE_SUB_AGENT_ID) {
				throw new Error(
					'Inline sub-agent cancellation must be handled by the parent Agent runtime.',
				);
			}
			if (request.resumeContext === undefined) {
				throw new Error('Configured sub-agent checkpoint metadata is missing or invalid.');
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
}): SubAgentSource | undefined {
	const { sourcesById, subAgentId } = options;
	if (subAgentId === INLINE_SUB_AGENT_ID) return undefined;
	return sourcesById?.[subAgentId];
}
