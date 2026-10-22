import {
	GEN_AI_ATTR,
	GEN_AI_OPERATION,
	pickGenAiAttributes,
	type GenAiSpanAttributes,
} from '@n8n/ai-utilities/gen-ai';
import { AGENT_LANGCHAIN_NODE_TYPE } from 'n8n-workflow';
import type { INode, IRunData, ITaskData } from 'n8n-workflow';

export function buildNodeGenAiAttributes(
	node: INode,
	taskData: ITaskData,
	runData: IRunData,
): GenAiSpanAttributes | undefined {
	if (node.type !== AGENT_LANGCHAIN_NODE_TYPE) {
		const attributes = pickGenAiAttributes(taskData.metadata?.tracing);
		return attributes[GEN_AI_ATTR.OPERATION_NAME] ? attributes : undefined;
	}

	const agentRunIndex = (runData[node.name]?.length ?? 1) - 1;
	const chatCalls = findChatCalls(runData, node.name, agentRunIndex);
	const [firstCall] = chatCalls;

	return {
		[GEN_AI_ATTR.OPERATION_NAME]: GEN_AI_OPERATION.INVOKE_AGENT,
		[GEN_AI_ATTR.AGENT_NAME]: node.name,
		[GEN_AI_ATTR.AGENT_ID]: node.id,
		[GEN_AI_ATTR.PROVIDER_NAME]: firstCall?.[GEN_AI_ATTR.PROVIDER_NAME],
		[GEN_AI_ATTR.REQUEST_MODEL]: firstCall?.[GEN_AI_ATTR.REQUEST_MODEL],
		[GEN_AI_ATTR.RESPONSE_MODEL]: firstCall?.[GEN_AI_ATTR.RESPONSE_MODEL],
		...sumUsage(chatCalls),
	};
}

function findChatCalls(
	runData: IRunData,
	agentName: string,
	agentRunIndex: number,
): GenAiSpanAttributes[] {
	const calls: { executionIndex: number; attributes: GenAiSpanAttributes }[] = [];

	for (const tasks of Object.values(runData)) {
		for (const task of tasks ?? []) {
			const source = task?.source?.[0];
			if (source?.previousNode !== agentName) continue;
			if ((source.previousNodeRun ?? 0) !== agentRunIndex) continue;

			const attributes = pickGenAiAttributes(task.metadata?.tracing);
			if (attributes[GEN_AI_ATTR.OPERATION_NAME] !== GEN_AI_OPERATION.CHAT) continue;

			calls.push({ executionIndex: task.executionIndex, attributes });
		}
	}

	return calls
		.sort((a, b) => a.executionIndex - b.executionIndex)
		.map(({ attributes }) => attributes);
}

function sumUsage(chatCalls: GenAiSpanAttributes[]): GenAiSpanAttributes {
	const reportedCalls = chatCalls.filter(
		(call) =>
			call[GEN_AI_ATTR.USAGE_INPUT_TOKENS] !== undefined &&
			call[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS] !== undefined,
	);
	const usageReported = reportedCalls.length < chatCalls.length ? false : undefined;
	if (reportedCalls.length === 0) return { [GEN_AI_ATTR.USAGE_REPORTED]: usageReported };

	return {
		[GEN_AI_ATTR.USAGE_INPUT_TOKENS]: sumOf(reportedCalls, GEN_AI_ATTR.USAGE_INPUT_TOKENS),
		[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS]: sumOf(reportedCalls, GEN_AI_ATTR.USAGE_OUTPUT_TOKENS),
		[GEN_AI_ATTR.USAGE_REPORTED]: usageReported,
	};
}

function sumOf(
	calls: GenAiSpanAttributes[],
	key: typeof GEN_AI_ATTR.USAGE_INPUT_TOKENS | typeof GEN_AI_ATTR.USAGE_OUTPUT_TOKENS,
): number {
	return calls.reduce((total, call) => total + (call[key] ?? 0), 0);
}
