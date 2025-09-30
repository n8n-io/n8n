import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { Violation } from '../../types/evaluation';
import type { SingleEvaluatorResult } from '../../types/test-result';
import { isTool } from '../../utils/is-tool';
import { calcSingleEvaluatorScore } from '../../utils/score';

/**
 * Checks if a value contains $fromAI or $fromAi reference
 */
function containsFromAi(value: unknown): boolean {
	if (typeof value !== 'string') {
		return false;
	}

	// Check for $fromAI or $fromAi patterns (case-insensitive variations)
	return /\$from[Aa][Ii]\(.+\)/.test(value);
}

/**
 * Recursively checks if any parameter contains $fromAI
 */
function parametersContainFromAi(parameters: Record<string, unknown>): boolean {
	for (const value of Object.values(parameters)) {
		if (containsFromAi(value)) {
			return true;
		}

		// Check nested objects
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			if (parametersContainFromAi(value as Record<string, unknown>)) {
				return true;
			}
		}

		// Check arrays
		if (Array.isArray(value)) {
			for (const item of value) {
				if (containsFromAi(item)) {
					return true;
				}
				// Check nested objects in arrays
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

/**
 * Evaluates that non-tool nodes do not use $fromAI in their parameters.
 * $fromAI is specifically designed for tool nodes to receive dynamic parameters from AI agents.
 */
export function evaluateFromAi(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult {
	const violations: Violation[] = [];

	// Check if workflow has nodes
	if (!workflow.nodes || workflow.nodes.length === 0) {
		return { violations, score: 0 };
	}

	// Check each node for improper $fromAI usage
	for (const node of workflow.nodes) {
		// Find node type
		const nodeType = nodeTypes.find((type) => type.name === node.type);
		if (!nodeType) {
			continue;
		}

		// Skip tool nodes - they are allowed to use $fromAI
		if (isTool(nodeType)) {
			continue;
		}

		// Check if non-tool node uses $fromAI
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
