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
	const nodeCountByType = new Map<string, number>();

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

		const currentCount = nodeCountByType.get(node.type) ?? 0;
		nodeCountByType.set(node.type, currentCount + 1);
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

	for (const [nodeTypeName, count] of nodeCountByType) {
		const nodeType = nodeTypes.find((type) => type.name === nodeTypeName);

		if (!nodeType?.maxNodes) {
			continue;
		}

		if (count > nodeType.maxNodes) {
			violations.push({
				name: 'workflow-exceeds-max-nodes-limit',
				type: 'critical',
				description: `Workflow can only have ${nodeType.maxNodes} ${nodeType.displayName} node(s), but found ${count}`,
				pointsDeducted: 50,
			});
		}
	}

	return violations;
}
