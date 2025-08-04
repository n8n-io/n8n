'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.checkNodeParameterNotEmpty = checkNodeParameterNotEmpty;
exports.extractTokenUsage = extractTokenUsage;
const n8n_workflow_1 = require('n8n-workflow');
function isRlcValue(value) {
	return Boolean(
		typeof value === 'object' && value && 'value' in value && '__rl' in value && value.__rl,
	);
}
function checkNodeParameterNotEmpty(value) {
	if (value === undefined || value === null || value === '') {
		return false;
	}
	if (isRlcValue(value)) {
		return checkNodeParameterNotEmpty(value.value);
	}
	return true;
}
function extractTokenUsage(executionRunData) {
	const result = {
		total: {
			completionTokens: 0,
			promptTokens: 0,
			totalTokens: 0,
		},
	};
	const extractFromNode = (nodeName, nodeData, index) => {
		function isValidTokenInfo(data) {
			return (
				typeof data === 'object' &&
				data !== null &&
				'completionTokens' in data &&
				'promptTokens' in data &&
				'totalTokens' in data &&
				typeof data.completionTokens === 'number' &&
				typeof data.promptTokens === 'number' &&
				typeof data.totalTokens === 'number'
			);
		}
		const tokenInfo = nodeData.json?.tokenUsage ?? nodeData.json?.tokenUsageEstimate;
		if (tokenInfo && isValidTokenInfo(tokenInfo)) {
			result[`${nodeName}__${index}`] = {
				completionTokens: tokenInfo.completionTokens,
				promptTokens: tokenInfo.promptTokens,
				totalTokens: tokenInfo.totalTokens,
			};
			result.total.completionTokens += tokenInfo.completionTokens;
			result.total.promptTokens += tokenInfo.promptTokens;
			result.total.totalTokens += tokenInfo.totalTokens;
		}
	};
	for (const [nodeName, nodeData] of Object.entries(executionRunData)) {
		if (nodeData[0]?.data?.[n8n_workflow_1.NodeConnectionTypes.AiLanguageModel]) {
			for (const [index, node] of nodeData.entries()) {
				const modelNodeExecutionData =
					node.data?.[n8n_workflow_1.NodeConnectionTypes.AiLanguageModel]?.[0]?.[0];
				if (modelNodeExecutionData) {
					extractFromNode(nodeName, modelNodeExecutionData, index);
				}
			}
		}
	}
	return result;
}
//# sourceMappingURL=utils.ee.js.map
