import { TOOL_EXECUTOR_NODE_NAME } from '@n8n/constants';
import type { IExecutionResponse } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import {
	CHAT_WAIT_USER_REPLY,
	CHAT_NODE_TYPE,
	RESPOND_TO_WEBHOOK_NODE_TYPE,
	SEND_AND_WAIT_OPERATION,
	CHAT_TOOL_NODE_TYPE,
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
