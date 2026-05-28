import {
	createDelegateSubAgentTool,
	filterLlmMessages,
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
	source: SubAgentSource;
	parentTaskPath?: SubAgentTaskPath;
	policy?: SubAgentRunPolicy;
}

export function createN8nDelegateSubAgentTool(options: CreateN8nDelegateSubAgentToolOptions) {
	const { runner, source, parentTaskPath, policy, ...runContext } = options;

	return createDelegateSubAgentTool({
		...(parentTaskPath !== undefined ? { parentTaskPath } : {}),
		...(policy !== undefined ? { policy } : {}),
		runSubAgent: async (request) => {
			const result = await runner.runForeground(
				{
					taskName: request.taskName,
					goal: request.goal,
					source,
					contextMode: 'fresh',
					executionMode: 'foreground',
					...(request.context !== undefined ? { context: request.context } : {}),
					...(request.expectedOutput !== undefined
						? { expectedOutput: request.expectedOutput }
						: {}),
					...(policy !== undefined ? { policy } : {}),
					...(request.parentRunId !== undefined ? { parentRunId: request.parentRunId } : {}),
					...(request.parentToolCallId !== undefined
						? { parentToolCallId: request.parentToolCallId }
						: {}),
					...(request.parentTaskPath !== undefined
						? { parentTaskPath: request.parentTaskPath }
						: {}),
				},
				{
					...runContext,
					childCount: request.childCount,
				},
			);

			return formatSubAgentToolOutput(result);
		},
	});
}

export function formatSubAgentToolOutput(
	result: SubAgentForegroundResult,
): DelegateSubAgentToolOutput {
	return {
		status: result.status,
		taskPath: result.taskPath,
		runId: result.result.runId,
		answer: getLastAssistantText(result) ?? '',
		...(result.result.structuredOutput !== undefined
			? { structuredOutput: result.result.structuredOutput }
			: {}),
		...(result.result.usage !== undefined
			? {
					usage: {
						promptTokens: result.result.usage.promptTokens,
						completionTokens: result.result.usage.completionTokens,
						totalTokens: result.result.usage.totalTokens,
						...(result.result.usage.cost !== undefined ? { cost: result.result.usage.cost } : {}),
					},
				}
			: {}),
		...(result.result.finishReason !== undefined
			? { finishReason: result.result.finishReason }
			: {}),
		...(result.result.error !== undefined ? { error: stringifyError(result.result.error) } : {}),
	};
}

function getLastAssistantText(result: SubAgentForegroundResult): string | undefined {
	const messages = filterLlmMessages(result.result.messages);
	for (let i = messages.length - 1; i >= 0; i--) {
		const text = messages[i]?.content.find((content) => content.type === 'text');
		if (text?.type === 'text') return text.text;
	}

	return undefined;
}

function stringifyError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
