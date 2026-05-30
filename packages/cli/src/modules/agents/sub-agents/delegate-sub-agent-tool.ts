import {
	createDelegateSubAgentTool,
	filterLlmMessages,
	type DelegateSubAgentToolOutput,
	type SubAgentTaskPath,
} from '@n8n/agents';
import type { SubAgentRunPolicy, SubAgentSource } from '@n8n/api-types';
import pLimit from 'p-limit';

import type {
	SubAgentForegroundRunContext,
	SubAgentForegroundResult,
	SubAgentForegroundRunner,
} from './sub-agent-foreground-runner';

/** Fallback when the caller does not configure a per-run concurrency cap. */
const DEFAULT_SUB_AGENT_CONCURRENCY = 3;

export interface CreateN8nDelegateSubAgentToolOptions extends SubAgentForegroundRunContext {
	runner: SubAgentForegroundRunner;
	sourcesById: Record<string, SubAgentSource>;
	availableSubAgents?: Array<{ id: string; name: string; description?: string }>;
	parentTaskPath?: SubAgentTaskPath;
	policy?: SubAgentRunPolicy;
	/** Max child runs allowed to execute concurrently for this delegate tool instance. */
	concurrency?: number;
}

export function createN8nDelegateSubAgentTool(options: CreateN8nDelegateSubAgentToolOptions) {
	const {
		runner,
		sourcesById,
		availableSubAgents,
		parentTaskPath,
		policy,
		concurrency,
		...runContext
	} = options;

	// One gate per delegate tool instance (i.e. per parent run) — same lifetime as
	// the SDK's per-parent childCounts map — so a wide fan-out can't spawn every
	// child agent at once. Independent of maxChildren (total) and toolCallConcurrency.
	const limit = pLimit(Math.max(1, concurrency ?? DEFAULT_SUB_AGENT_CONCURRENCY));

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
				return {
					status: 'failed',
					answer:
						'No subagent matched this request. Provide subAgentId when multiple configured subagents are available.',
				};
			}

			const result = await limit(
				async () =>
					await runner.runForeground(
						{
							taskName: request.taskName,
							goal: request.goal,
							source: selectedSource,
							contextMode: 'fresh',
							executionMode: 'foreground',
							...(request.context !== undefined ? { context: request.context } : {}),
							...(request.expectedOutput !== undefined
								? { expectedOutput: request.expectedOutput }
								: {}),
							...(policy !== undefined ? { policy } : {}),
							...(request.parentRunId !== undefined ? { parentRunId: request.parentRunId } : {}),
							...(request.parentThreadId !== undefined
								? { parentThreadId: request.parentThreadId }
								: {}),
							...(request.parentResourceId !== undefined
								? { parentResourceId: request.parentResourceId }
								: {}),
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
							...(request.parentAbortSignal !== undefined
								? { abortSignal: request.parentAbortSignal }
								: {}),
						},
					),
			);

			return formatSubAgentToolOutput(result);
		},
	});
}

function selectSubAgentSource(options: {
	sourcesById: Record<string, SubAgentSource>;
	subAgentId?: string;
}): SubAgentSource | undefined {
	const { sourcesById, subAgentId } = options;
	if (subAgentId) return sourcesById?.[subAgentId];

	const sources = Object.values(sourcesById);
	return sources.length === 1 ? sources[0] : undefined;
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
		const text = messages[i]?.content
			.filter((content) => content.type === 'text')
			.map((content) => content.text)
			.join('\n')
			.trim();
		if (text) return text;
	}

	return undefined;
}

function stringifyError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
