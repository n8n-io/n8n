import type { INodeParameters, NodeParameterValueType } from 'n8n-workflow';

import { MAX_WORKFLOW_LENGTH_TOKENS } from '@/constants';
import type { SimpleWorkflow } from '@/types';
import { estimateTokenCountFromString } from '@/utils/token-usage';

const MAX_PARAMETER_VALUE_LENGTH_THRESHOLDS = [10000, 5000, 2000, 1000];

function trimParameterValue(
	value: NodeParameterValueType,
	threshold: number,
): NodeParameterValueType {
	const valueStr = JSON.stringify(value);
	if (valueStr.length > threshold) {
		if (typeof value === 'string') {
			return '[Large value omitted]';
		} else if (Array.isArray(value)) {
			return '[Large array omitted]';
		} else if (typeof value === 'object' && value !== null) {
			return '[Large object omitted]';
		}
	}

	return value;
}

function simplifyWorkflowWithThreshold(
	workflow: SimpleWorkflow,
	threshold: number,
): SimpleWorkflow {
	const simplifiedWorkflow = { ...workflow };
	if (simplifiedWorkflow.nodes) {
		simplifiedWorkflow.nodes = simplifiedWorkflow.nodes.map((node) => {
			const simplifiedNode = { ...node };

			// Map parameters and replace large values with a placeholder
			if (simplifiedNode.parameters) {
				const simplifiedParameters: INodeParameters = {};
				for (const [key, value] of Object.entries(simplifiedNode.parameters)) {
					simplifiedParameters[key] = trimParameterValue(value, threshold);
				}
				simplifiedNode.parameters = simplifiedParameters;
			}

			return simplifiedNode;
		});
	}

	return simplifiedWorkflow;
}

export function trimWorkflowJSON(workflow: SimpleWorkflow): SimpleWorkflow {
	// Try progressively more aggressive trimming thresholds
	for (const threshold of MAX_PARAMETER_VALUE_LENGTH_THRESHOLDS) {
		console.log(`Simplifying workflow with threshold: ${threshold}`);

		const simplified = simplifyWorkflowWithThreshold(workflow, threshold);
		const workflowStr = JSON.stringify(simplified);
		const estimatedTokens = estimateTokenCountFromString(workflowStr);

		console.log(`Estimated tokens after simplification: ${estimatedTokens}`);

		// If the workflow fits within the token limit, return it
		if (estimatedTokens <= MAX_WORKFLOW_LENGTH_TOKENS) {
			return simplified;
		}
	}

	// If even the most aggressive trimming doesn't fit, return the most trimmed version
	return simplifyWorkflowWithThreshold(
		workflow,
		MAX_PARAMETER_VALUE_LENGTH_THRESHOLDS[MAX_PARAMETER_VALUE_LENGTH_THRESHOLDS.length - 1],
	);
}
