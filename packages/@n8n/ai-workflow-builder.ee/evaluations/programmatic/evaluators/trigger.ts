import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { Violation } from '../../types/evaluation';
import type { SingleEvaluatorResult } from '../../types/test-result';
import { calcSingleEvaluatorScore } from '../../utils/score';

export interface TriggerEvaluationResult extends SingleEvaluatorResult {
	hasTrigger: boolean;
	triggerNodes: string[];
}

const isTriggerNode = (nodeType: INodeTypeDescription) => nodeType.group.includes('trigger');

export function evaluateTrigger(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): TriggerEvaluationResult {
	const violations: Violation[] = [];
	const triggerNodes: string[] = [];

	// Check if workflow has nodes
	if (!workflow.nodes || workflow.nodes.length === 0) {
		violations.push({ type: 'critical', description: 'Workflow has no nodes', pointsDeducted: 50 });
		return { hasTrigger: false, violations, triggerNodes, score: 0 };
	}

	// Find all trigger nodes
	for (const node of workflow.nodes) {
		const nodeType = nodeTypes.find((type) => type.name === node.type);

		if (!nodeType) {
			continue;
		}

		if (isTriggerNode(nodeType)) {
			triggerNodes.push(node.name);
		}
	}

	// Check if at least one trigger exists
	const hasTrigger = triggerNodes.length > 0;

	if (!hasTrigger) {
		violations.push({
			type: 'critical',
			description: 'Workflow must have at least one trigger node to start execution',
			pointsDeducted: 50,
		});
	}

	return {
		hasTrigger,
		violations,
		triggerNodes,
		score: calcSingleEvaluatorScore({ violations }),
	};
}
