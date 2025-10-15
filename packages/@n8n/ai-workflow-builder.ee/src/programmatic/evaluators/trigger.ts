import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { SingleEvaluatorResult } from '../types';
import { calcSingleEvaluatorScore } from '../utils/score';

export interface TriggerEvaluationResult extends SingleEvaluatorResult {
	hasTrigger: boolean;
	triggerNodes: string[];
}

const isTriggerNode = (nodeType: INodeTypeDescription) => nodeType.group.includes('trigger');

export function evaluateTrigger(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): TriggerEvaluationResult {
	const violations: SingleEvaluatorResult['violations'] = [];
	const triggerNodes: string[] = [];

	if (!workflow.nodes || workflow.nodes.length === 0) {
		violations.push({
			type: 'critical',
			description: 'Workflow has no nodes',
			pointsDeducted: 50,
		});
		return { hasTrigger: false, violations, triggerNodes, score: 0 };
	}

	for (const node of workflow.nodes) {
		const nodeType = nodeTypes.find((type) => type.name === node.type);

		if (!nodeType) {
			continue;
		}

		if (isTriggerNode(nodeType)) {
			triggerNodes.push(node.name);
		}
	}

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
