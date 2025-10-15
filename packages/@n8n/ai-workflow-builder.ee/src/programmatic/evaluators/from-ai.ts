import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { SingleEvaluatorResult } from '../types';
import { isTool } from '../utils/is-tool';
import { calcSingleEvaluatorScore } from '../utils/score';

function containsFromAi(value: unknown): boolean {
	if (typeof value !== 'string') {
		return false;
	}

	return /\$from[Aa][Ii]\(.+\)/.test(value);
}

function parametersContainFromAi(parameters: Record<string, unknown>): boolean {
	for (const value of Object.values(parameters)) {
		if (containsFromAi(value)) {
			return true;
		}

		if (value && typeof value === 'object' && !Array.isArray(value)) {
			if (parametersContainFromAi(value as Record<string, unknown>)) {
				return true;
			}
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				if (containsFromAi(item)) {
					return true;
				}

				if (item && typeof item === 'object') {
					if (parametersContainFromAi(item as Record<string, unknown>)) {
						return true;
					}
				}
			}
		}
	}

	return false;
}

export function evaluateFromAi(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult {
	const violations: SingleEvaluatorResult['violations'] = [];

	if (!workflow.nodes || workflow.nodes.length === 0) {
		return { violations, score: 0 };
	}

	for (const node of workflow.nodes) {
		const nodeType = nodeTypes.find((type) => type.name === node.type);
		if (!nodeType) {
			continue;
		}

		if (isTool(nodeType)) {
			continue;
		}

		if (node.parameters && parametersContainFromAi(node.parameters)) {
			violations.push({
				type: 'major',
				description: `Non-tool node "${node.name}" (${node.type}) uses $fromAI in its parameters. $fromAI is only for tool nodes connected to AI agents.`,
				pointsDeducted: 20,
			});
		}
	}

	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
