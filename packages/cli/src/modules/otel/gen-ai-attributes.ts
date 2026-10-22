import {
	GEN_AI_ATTR,
	N8N_USAGE_REPORTED_ATTR,
	isGenAiAttributeKey,
	type GenAiAttributes,
} from '@n8n/ai-utilities/gen-ai';
import pick from 'lodash/pick';
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
): GenAiAttributes | undefined {
	if (node.type === AGENT_LANGCHAIN_NODE_TYPE) {
		return {
			[GEN_AI_ATTR.OPERATION_NAME]: 'invoke_agent',
			[GEN_AI_ATTR.AGENT_NAME]: node.name,
			[GEN_AI_ATTR.AGENT_ID]: node.id,
			...summarizeChatCalls(node.name, runData, connections),
		};
	}

	const attributes = pickGenAiAttributes(taskData.metadata?.tracing);
	return attributes[GEN_AI_ATTR.OPERATION_NAME] ? attributes : undefined;
}

function pickGenAiAttributes(tracing: GenAiAttributes = {}): GenAiAttributes {
	return Object.fromEntries(Object.entries(tracing).filter(([key]) => isGenAiAttributeKey(key)));
}

function summarizeChatCalls(
	agentName: string,
	runData: IRunData,
	connections: IConnections,
): GenAiAttributes {
	const agentRunIndex = (runData[agentName]?.length ?? 1) - 1;
	const chatModelNames = getParentNodes(
		mapConnectionsByDestination(connections),
		agentName,
		NodeConnectionTypes.AiLanguageModel,
		1,
	);

	let firstCall: { executionIndex: number; attributes: GenAiAttributes } | undefined;
	let inputTokens = 0;
	let outputTokens = 0;
	let reportedCalls = 0;
	let isUsageMissing = false;

	for (const task of chatModelNames.flatMap((name) => runData[name] ?? [])) {
		const source = task?.source?.[0];
		if (source?.previousNode !== agentName) continue;
		if ((source.previousNodeRun ?? 0) !== agentRunIndex) continue;

		const attributes = pickGenAiAttributes(task.metadata?.tracing);
		if (attributes[GEN_AI_ATTR.OPERATION_NAME] !== 'chat') continue;

		if (!firstCall || task.executionIndex < firstCall.executionIndex) {
			firstCall = { executionIndex: task.executionIndex, attributes };
		}

		const callInputTokens = attributes[GEN_AI_ATTR.USAGE_INPUT_TOKENS];
		const callOutputTokens = attributes[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS];
		if (typeof callInputTokens === 'number' && typeof callOutputTokens === 'number') {
			inputTokens += callInputTokens;
			outputTokens += callOutputTokens;
			reportedCalls++;
		} else {
			isUsageMissing = true;
		}
	}

	if (!firstCall) return {};

	return {
		...pick(firstCall.attributes, [
			GEN_AI_ATTR.PROVIDER_NAME,
			GEN_AI_ATTR.REQUEST_MODEL,
			GEN_AI_ATTR.RESPONSE_MODEL,
		]),
		...(reportedCalls > 0 && {
			[GEN_AI_ATTR.USAGE_INPUT_TOKENS]: inputTokens,
			[GEN_AI_ATTR.USAGE_OUTPUT_TOKENS]: outputTokens,
		}),
		...(isUsageMissing && { [N8N_USAGE_REPORTED_ATTR]: false }),
	};
}
