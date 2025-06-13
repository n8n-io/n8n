import type { IExecutionResponse } from '@n8n/db';
import type { IDataObject, INode } from 'n8n-workflow';
import { CHAT_TRIGGER_NODE_TYPE, RESPOND_TO_WEBHOOK_NODE_TYPE } from 'n8n-workflow';

export function getMessage(execution: IExecutionResponse) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
	const runIndex = execution.data.resultData.runData[lastNodeExecuted].length - 1;
	const nodeExecutionData =
		execution.data.resultData.runData[lastNodeExecuted][runIndex]?.data?.main?.[0];
	return nodeExecutionData?.[0] ? nodeExecutionData[0].sendMessage : undefined;
}

export function getLastNodeExecuted(execution: IExecutionResponse) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
	return execution.workflowData.nodes.find((node) => node.name === lastNodeExecuted);
}

export function prepareMessageFromLastNode(execution: IExecutionResponse) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
	const nodeExecutionData = execution.data.resultData.runData[lastNodeExecuted][0]?.data?.main?.[0];
	const json = nodeExecutionData?.[0] ? nodeExecutionData[0].json : {};

	let textMessage = json.output ?? json.text ?? json.message ?? '';
	if (typeof textMessage !== 'string') {
		textMessage = JSON.stringify(textMessage);
	}

	return textMessage;
}

export function isResponseNodeMode(execution: IExecutionResponse) {
	const chatTrigger = execution.workflowData.nodes.find(
		(node) => node.type === CHAT_TRIGGER_NODE_TYPE,
	);

	if (!chatTrigger) return false;

	return (chatTrigger.parameters.options as IDataObject)?.responseMode === 'responseNode';
}

export function shouldResumeImmediately(lastNode: INode) {
	if (lastNode?.type === RESPOND_TO_WEBHOOK_NODE_TYPE) {
		return true;
	}

	const waitResponseFromChat = (lastNode?.parameters?.options as IDataObject)?.waitResponseFromChat;

	if (waitResponseFromChat === false) {
		return true;
	}

	return false;
}
