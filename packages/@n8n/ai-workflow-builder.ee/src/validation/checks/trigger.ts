import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { ProgrammaticViolation, SingleEvaluatorResult } from '../types';

export interface TriggerEvaluationResult extends SingleEvaluatorResult {
	hasTrigger: boolean;
	triggerNodes: string[];
}

const isTriggerNode = (nodeType: INodeTypeDescription) => nodeType.group.includes('trigger');

export function validateTrigger(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): ProgrammaticViolation[] {
	const violations: ProgrammaticViolation[] = [];
	const triggerNodes: string[] = [];

	if (!workflow.nodes || workflow.nodes.length === 0) {
		violations.push({
			name: 'workflow-has-no-nodes',
			type: 'critical',
			description: 'Workflow has no nodes',
			pointsDeducted: 50,
		});

		return violations;
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
			name: 'workflow-has-no-trigger',
			type: 'critical',
			description: 'Workflow must have at least one trigger node to start execution',
			pointsDeducted: 50,
		});
	}

	return violations;
}
