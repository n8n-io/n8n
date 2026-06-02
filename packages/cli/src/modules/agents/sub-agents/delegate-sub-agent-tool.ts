import {
	createDelegateSubAgentTool,
	generateResultToDelegateSubAgentOutput,
	INLINE_SUB_AGENT_ID,
	type DelegateSubAgentToolOutput,
	type SubAgentTaskPath,
} from '@n8n/agents';
import type { SubAgentRunPolicy, SubAgentSource } from '@n8n/api-types';

import type {
	SubAgentForegroundRunContext,
	SubAgentForegroundResult,
	SubAgentForegroundRunner,
} from './sub-agent-foreground-runner';

export interface CreateN8nDelegateSubAgentToolOptions extends SubAgentForegroundRunContext {
	runner: SubAgentForegroundRunner;
	sourcesById: Record<string, SubAgentSource>;
	availableSubAgents?: Array<{ id: string; name: string; description?: string }>;
	parentTaskPath?: SubAgentTaskPath;
	policy?: SubAgentRunPolicy;
}

export function createN8nDelegateSubAgentTool(options: CreateN8nDelegateSubAgentToolOptions) {
	const { runner, sourcesById, availableSubAgents, parentTaskPath, policy, ...runContext } =
		options;

	return createDelegateSubAgentTool({
		...(availableSubAgents !== undefined ? { availableSubAgents } : {}),
		...(parentTaskPath !== undefined ? { parentTaskPath } : {}),
		...(policy !== undefined ? { policy } : {}),
		runSubAgent: async (request) => {
			const selectedSource = selectSubAgentSource({
				sourcesById,
				subAgentId: request.subAgentId,
			});
			if (!selectedSource) {
				const error =
					request.subAgentId === INLINE_SUB_AGENT_ID
						? 'Inline sub-agent execution is available only after the delegate tool is registered on an Agent.'
						: `No configured subagent matched "${request.subAgentId}". Use "inline" for an inline sub-agent, or pass one of the configured subagent IDs.`;
				return {
					status: 'failed',
					answer: '',
					error,
				};
			}

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
					taskPath: request.taskPath,
				},
				{
					...runContext,
					...(request.parentAbortSignal !== undefined
						? { abortSignal: request.parentAbortSignal }
						: {}),
				},
			);

			return formatSubAgentToolOutput(result);
		},
	});
}

function selectSubAgentSource(options: {
	sourcesById: Record<string, SubAgentSource>;
	subAgentId: string;
}): SubAgentSource | undefined {
	const { sourcesById, subAgentId } = options;
	if (subAgentId === INLINE_SUB_AGENT_ID) return undefined;
	return sourcesById?.[subAgentId];
}

export function formatSubAgentToolOutput(
	result: SubAgentForegroundResult,
): DelegateSubAgentToolOutput {
	return generateResultToDelegateSubAgentOutput(result.taskPath, result.result, result.threadId);
}
