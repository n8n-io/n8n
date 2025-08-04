'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getMessage = getMessage;
exports.getLastNodeExecuted = getLastNodeExecuted;
exports.shouldResumeImmediately = shouldResumeImmediately;
const n8n_workflow_1 = require('n8n-workflow');
function getMessage(execution) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
	if (typeof lastNodeExecuted !== 'string') return undefined;
	const runIndex = execution.data.resultData.runData[lastNodeExecuted].length - 1;
	const nodeExecutionData =
		execution.data.resultData.runData[lastNodeExecuted][runIndex]?.data?.main?.[0];
	return nodeExecutionData?.[0] ? nodeExecutionData[0].sendMessage : undefined;
}
function getLastNodeExecuted(execution) {
	const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
	if (typeof lastNodeExecuted !== 'string') return undefined;
	return execution.workflowData?.nodes?.find((node) => node.name === lastNodeExecuted);
}
function shouldResumeImmediately(lastNode) {
	if (lastNode?.type === n8n_workflow_1.RESPOND_TO_WEBHOOK_NODE_TYPE) {
		return true;
	}
	if (lastNode?.parameters?.[n8n_workflow_1.CHAT_WAIT_USER_REPLY] === false) {
		return true;
	}
	const options = lastNode?.parameters?.options;
	if (options && options[n8n_workflow_1.CHAT_WAIT_USER_REPLY] === false) {
		return true;
	}
	return false;
}
//# sourceMappingURL=utils.js.map
