import {
	GEN_AI_ATTR,
	GEN_AI_OPERATION,
	pickGenAiAttributes,
	type GenAiSpanAttributes,
} from '@n8n/ai-utilities/gen-ai';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	NodeConnectionTypes,
	getParentNodes,
	mapConnectionsByDestination,
} from 'n8n-workflow';
import type { IConnections, INode, IRunData, ITaskData } from 'n8n-workflow';

export function buildNodeGenAiAttributes(
	node: INode,
	taskData: ITaskData,
	runData: IRunData,
	connections: IConnections,
): GenAiSpanAttributes | undefined {
	if (node.type !== AGENT_LANGCHAIN_NODE_TYPE) {
		const attributes = pickGenAiAttributes(taskData.metadata?.tracing);
		return attributes[GEN_AI_ATTR.OPERATION_NAME] ? attributes : undefined;
	}

	return {
		[GEN_AI_ATTR.OPERATION_NAME]: GEN_AI_OPERATION.INVOKE_AGENT,
		[GEN_AI_ATTR.AGENT_NAME]: node.name,
		[GEN_AI_ATTR.AGENT_ID]: node.id,
		...summarizeChatCalls(node.name, runData, connections),
	};
}

function summarizeChatCalls(
	agentName: string,
	runData: IRunData,
	connections: IConnections,
): GenAiSpanAttributes {
	const agentRunIndex = (runData[agentName]?.length ?? 1) - 1;
	const chatModelNames = getParentNodes(
		mapConnectionsByDestination(connections),
		agentName,
		NodeConnectionTypes.AiLanguageModel,
		1,
	);

	let firstCall: { executionIndex: number; attributes: GenAiSpanAttributes } | undefined;
	let inputTokens = 0;
	let outputTokens = 0;
	let reportedCalls = 0;
	let missingCalls = 0;

	for (const task of chatModelNames.flatMap((name) => runData[name] ?? [])) {
		const source = task?.source?.[0];
		if (source?.previousNode !== agentName) continue;
		if ((source.previousNodeRun ?? 0) !== agentRunIndex) continue;

		const attributes = pickGenAiAttributes(task.metadata?.tracing);
		if (attributes[GEN_AI_ATTR.OPERATION_NAME] !== GEN_AI_OPERATION.CHAT) continue;

		if (!firstCall || task.executionIndex < firstCall.executionIndex) {
			firstCall = { executionIndex: task.executionIndex, attributes };
		}

		const callInputTokens = attributes[GEN_AI_ATTR.USAGE_INPUT_TOKENS];
		const callOutputTokens = attributes[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS];
		if (callInputTokens === undefined || callOutputTokens === undefined) {
			missingCalls++;
			continue;
		}
		inputTokens += callInputTokens;
		outputTokens += callOutputTokens;
		reportedCalls++;
	}

	if (!firstCall) return {};

	return {
		[GEN_AI_ATTR.PROVIDER_NAME]: firstCall.attributes[GEN_AI_ATTR.PROVIDER_NAME],
		[GEN_AI_ATTR.REQUEST_MODEL]: firstCall.attributes[GEN_AI_ATTR.REQUEST_MODEL],
		[GEN_AI_ATTR.RESPONSE_MODEL]: firstCall.attributes[GEN_AI_ATTR.RESPONSE_MODEL],
		...(reportedCalls > 0 && {
			[GEN_AI_ATTR.USAGE_INPUT_TOKENS]: inputTokens,
			[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS]: outputTokens,
		}),
		...(missingCalls > 0 && { [GEN_AI_ATTR.USAGE_REPORTED]: false }),
	};
}
