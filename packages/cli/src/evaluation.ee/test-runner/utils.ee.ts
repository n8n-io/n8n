import type {
	NodeParameterValueType,
	INodeParameterResourceLocator,
	IRunData,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

type TokenUsageValues = {
	completionTokens: number;
	promptTokens: number;
	totalTokens: number;
};

type TokenUsageInfo = Record<`${string}__${number}` | 'total', TokenUsageValues>;

function isRlcValue(value: NodeParameterValueType): value is INodeParameterResourceLocator {
	return Boolean(
		typeof value === 'object' && value && 'value' in value && '__rl' in value && value.__rl,
	);
}

export function checkNodeParameterNotEmpty(value: NodeParameterValueType) {
	if (value === undefined || value === null || value === '') {
		return false;
	}

	if (isRlcValue(value)) {
		return checkNodeParameterNotEmpty(value.value);
	}

	return true;
}

export function extractTokenUsage(executionRunData: IRunData) {
	const result: TokenUsageInfo = {
		total: {
			completionTokens: 0,
			promptTokens: 0,
			totalTokens: 0,
		},
	};

	const extractFromNode = (nodeName: string, nodeData: INodeExecutionData, index: number) => {
		function isValidTokenInfo(data: unknown): data is TokenUsageValues {
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
		if (nodeData[0]?.data?.[NodeConnectionTypes.AiLanguageModel]) {
			for (const [index, node] of nodeData.entries()) {
				const modelNodeExecutionData = node.data?.[NodeConnectionTypes.AiLanguageModel]?.[0]?.[0];
				if (modelNodeExecutionData) {
					extractFromNode(nodeName, modelNodeExecutionData, index);
				}
			}
		}
	}

	return result;
}
