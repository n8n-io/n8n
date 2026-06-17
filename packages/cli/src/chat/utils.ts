import { TOOL_EXECUTOR_NODE_NAME } from '@n8n/constants';
import type { IExecutionResponse } from '@n8n/db';
import type { ChatNodeMessage, IExecuteData, INode, Workflow } from 'n8n-workflow';
import {
	CHAT_WAIT_USER_REPLY,
	CHAT_NODE_TYPE,
	RESPOND_TO_WEBHOOK_NODE_TYPE,
	SEND_AND_WAIT_OPERATION,
	CHAT_TOOL_NODE_TYPE,
} from 'n8n-workflow';

const AI_TOOL = 'ai_tool';

/**
 * Redirects execution from PartialExecutionToolExecutor to the actual tool node
 * it wraps (stored in the executor's `node` parameter).
 *
 * - Clears runNodeFilter/destinationNode so downstream nodes (e.g. AI Agent)
 *   are not blocked by the original partial-execution constraints.
 * - Forces runIndex=0 to merge into the preserveInputOverride placeholder,
 *   keeping inputOverride ($fromAI params) visible on the resumed run.
 *
 * Returns the resolved tool node, or null if not applicable.
 */
export function redirectIfToolExecutor(
	execution: IExecutionResponse,
	executionData: IExecuteData,
	workflow: Workflow,
): INode | null {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
	if (lastNodeExecuted !== TOOL_EXECUTOR_NODE_NAME) return null;

	const toolNodeName = executionData.node.parameters?.node as string | undefined;
	const toolNode = toolNodeName ? workflow.getNode(toolNodeName) : null;
	if (!toolNode) return null;

	executionData.node = toolNode;
	execution.data.resultData.lastNodeExecuted = toolNode.name;
	executionData.runIndex = 0;

	if (execution.data.startData) {
		execution.data.startData.runNodeFilter = undefined;
		execution.data.startData.destinationNode = undefined;
	}

	return toolNode;
}

/** Normalises originalDestinationNode to a node name (V0 = string, V1 = object). */
function getOriginalDestinationNodeName(
	startData: IExecutionResponse['data']['startData'],
): string | undefined {
	const dest = startData?.originalDestinationNode;
	if (!dest) return undefined;
	return typeof dest === 'string' ? dest : dest.nodeName;
}

/** Returns sendMessage from the most recent ai_tool run of a node, if present. */
function getSendMessageFromToolNode(
	nodeRuns: IExecutionResponse['data']['resultData']['runData'][string],
): ChatNodeMessage | undefined {
	const lastRun = nodeRuns[nodeRuns.length - 1];
	const aiToolBranches = lastRun?.data?.[AI_TOOL];

	if (!Array.isArray(aiToolBranches)) return undefined;

	for (const branch of aiToolBranches) {
		if (Array.isArray(branch) && branch[0]?.sendMessage) {
			return branch[0].sendMessage;
		}
	}

	return undefined;
}

/**
 * Finds sendMessage when PartialExecutionToolExecutor is the last executed node.
 * The message lives in the connected tool node's ai_tool run data, not in the
 * executor's own output. Targets originalDestinationNode first, then scans all
 * ai_tool outputs as a fallback.
 */
function getToolExecutorSendMessage(executionData: IExecutionResponse['data']) {
	const { startData, resultData } = executionData;
	const { runData } = resultData;

	const toolNodeName = getOriginalDestinationNodeName(startData);
	if (toolNodeName && runData[toolNodeName]) {
		return getSendMessageFromToolNode(runData[toolNodeName]);
	}

	// Fallback: scan all nodes with ai_tool output (only tool nodes produce it)
	for (const [nodeName, nodeRuns] of Object.entries(runData)) {
		if (nodeName === TOOL_EXECUTOR_NODE_NAME) continue;
		const message = getSendMessageFromToolNode(nodeRuns);
		if (message) return message;
	}

	return undefined;
}

/**
 * Returns the message to be sent of the last executed node
 */
export function getMessage(execution: IExecutionResponse) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
	if (typeof lastNodeExecuted !== 'string') return undefined;

	// PartialExecutionToolExecutor is a virtual node not saved in the workflow,
	// so its sendMessage must be retrieved from the connected tool node's run data.
	if (lastNodeExecuted === TOOL_EXECUTOR_NODE_NAME) {
		return getToolExecutorSendMessage(execution.data);
	}

	const runIndex = execution.data.resultData.runData[lastNodeExecuted].length - 1;
	const data = execution.data.resultData.runData[lastNodeExecuted][runIndex]?.data;
	const outputs = data?.main ?? data?.[AI_TOOL];

	// Check all main output branches for a message
	if (outputs && Array.isArray(outputs)) {
		for (const branch of outputs) {
			if (branch && Array.isArray(branch) && branch.length > 0 && branch[0].sendMessage) {
				return branch[0].sendMessage;
			}
		}
	}

	return undefined;
}

/**
 * Returns the last node executed
 */
export function getLastNodeExecuted(execution: IExecutionResponse) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
	if (typeof lastNodeExecuted !== 'string') return undefined;

	const node = execution.workflowData?.nodes?.find((node) => node.name === lastNodeExecuted);
	if (node) return node;

	// For the virtual PartialExecutionToolExecutor node (not saved in workflowData),
	// returns a synthetic node so session.nodeWaitingForChatResponse is set correctly
	// and the message is not re-sent on every poll interval.
	if (lastNodeExecuted === TOOL_EXECUTOR_NODE_NAME) {
		return {
			name: TOOL_EXECUTOR_NODE_NAME,
			type: '@n8n/n8n-nodes-langchain.toolExecutor',
			parameters: {},
			id: '',
			typeVersion: 1,
			position: [0, 0],
			disabled: false,
		} satisfies INode;
	}

	return undefined;
}

/**
 * Check if execution should be resumed immediately after receivng a message
 */
export function shouldResumeImmediately(lastNode: INode) {
	if (lastNode?.type === RESPOND_TO_WEBHOOK_NODE_TYPE) {
		return true;
	}

	if (lastNode?.parameters?.[CHAT_WAIT_USER_REPLY] === false) {
		return true;
	}

	const options = lastNode?.parameters?.options as {
		[CHAT_WAIT_USER_REPLY]?: boolean;
	};

	if (options && options[CHAT_WAIT_USER_REPLY] === false) {
		return true;
	}

	const operation = lastNode?.parameters?.operation;
	const isChatNode = lastNode?.type === CHAT_NODE_TYPE || lastNode?.type === CHAT_TOOL_NODE_TYPE;
	if (isChatNode && operation && operation !== SEND_AND_WAIT_OPERATION) {
		return true;
	}

	return false;
}

export function getLastNodeMessage(execution: IExecutionResponse, lastNode: INode) {
	if (lastNode.type !== CHAT_NODE_TYPE) return '';

	const message =
		execution.data?.resultData?.runData?.[lastNode.name]?.[0]?.data?.main?.[0]?.[0]?.sendMessage;

	return (message as string) ?? '';
}
