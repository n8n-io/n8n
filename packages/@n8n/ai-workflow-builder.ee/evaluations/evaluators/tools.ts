import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { Violation } from '../types/evaluation';
import type { SingleEvaluatorResult } from '../types/test-result';
import { calcSingleEvaluatorScore } from '../utils/score';

function isTool(nodeType: INodeTypeDescription): boolean {
	return nodeType.codex?.subcategories?.AI?.includes('Tools') ?? false;
}

export function evaluateTools(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult {
	const violations: Violation[] = [];

	// Check if workflow has nodes
	if (!workflow.nodes || workflow.nodes.length === 0) {
		return { violations, score: 0 };
	}

	// Find all agent nodes and check their prompts
	for (const node of workflow.nodes) {
		// Find node type
		const nodeType = nodeTypes.find((type) => type.name === node.type);
		if (!nodeType) {
			continue;
		}

		// Check if this is a tool
		if (isTool(nodeType)) {
			// Check if the tool node has required parameters set
			if (!node.parameters || Object.keys(node.parameters).length === 0) {
				violations.push({
					type: 'major',
					description: `Tool node "${node.name}" has no parameters set.`,
					pointsDeducted: 20,
				});
			}
		}
	}

	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
