import type { IExecutionResponse } from '@n8n/db';
import type { IDataObject, INode } from 'n8n-workflow';
import {
	CHAT_TRIGGER_NODE_TYPE,
	CHAT_WAIT_USER_REPLY,
	RESPOND_TO_WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

/**
 * Returns the message to be sent of the last executed node
 */
export function getMessage(execution: IExecutionResponse) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
	if (typeof lastNodeExecuted !== 'string') return undefined;

	const runIndex = execution.data.resultData.runData[lastNodeExecuted].length - 1;
	const nodeExecutionData =
		execution.data.resultData.runData[lastNodeExecuted][runIndex]?.data?.main?.[0];
	return nodeExecutionData?.[0] ? nodeExecutionData[0].sendMessage : undefined;
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
 * Returns the message to be sent of the last executed node
 * Chek for specific keys in the json of item that could contain the message
 * or return the stringified json
 */
export function prepareMessageFromLastNode(execution: IExecutionResponse) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
	if (typeof lastNodeExecuted !== 'string') return '';

	const nodeExecutionData = execution.data.resultData.runData[lastNodeExecuted][0]?.data?.main?.[0];
	const json = nodeExecutionData?.[0] ? nodeExecutionData[0].json : {};
	let textMessage = json.output ?? json.text ?? json.message ?? '';
	if (typeof textMessage !== 'string') {
		textMessage = JSON.stringify(textMessage);
	}
	if (!textMessage && Object.keys(json).length) {
		textMessage = JSON.stringify(json, null, 2);
	}
	return textMessage;
}

/**
 * Returns true if th chat trigger node's response mode is 'responseNode'
 */
export function isResponseNodeMode(execution: IExecutionResponse) {
	const chatTrigger = execution.workflowData.nodes.find(
		(node) => node.type === CHAT_TRIGGER_NODE_TYPE,
	);

	if (!chatTrigger) return false;

	return (chatTrigger.parameters?.options as IDataObject)?.responseMode === 'responseNode';
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

	return false;
}
