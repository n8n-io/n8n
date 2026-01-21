import type { IExecutionResponse } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import {
	CHAT_WAIT_USER_REPLY,
	CHAT_NODE_TYPE,
	RESPOND_TO_WEBHOOK_NODE_TYPE,
	SEND_AND_WAIT_OPERATION,
	CHAT_TOOL_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
} from 'n8n-workflow';

const AI_TOOL = 'ai_tool';

/**
 * Returns the message to be sent of the last executed node
 */
export function getMessage(execution: IExecutionResponse) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
	if (typeof lastNodeExecuted !== 'string') return undefined;

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
	return execution.workflowData?.nodes?.find((node) => node.name === lastNodeExecuted);
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

/**
 * Check if the chat trigger has `responseMode` set to `responseNodes` and the
 * workflow is missing chat nodes connected to the trigger.
 * @param execution
 * @returns true if the workflow is missing chat nodes and `responseMode` is
 * `responseNodes`
 */
export function workflowIsMissingChatNodes(execution: IExecutionResponse) {
	const chatTriggerNode = execution.workflowData?.nodes?.find(
		(node) => node.type === CHAT_TRIGGER_NODE_TYPE,
	);
	if (!chatTriggerNode) {
		return false;
	}

	const options = chatTriggerNode.parameters?.options as {
		responseMode: string;
	};
	if (options?.responseMode !== 'responseNodes') {
		return false;
	}

	const responseNodes = execution.workflowData?.nodes?.filter(
		(node) =>
			node.type === CHAT_NODE_TYPE ||
			node.type === CHAT_TOOL_NODE_TYPE ||
			node.type === RESPOND_TO_WEBHOOK_NODE_TYPE,
	);
	return !responseNodes?.length;
}
