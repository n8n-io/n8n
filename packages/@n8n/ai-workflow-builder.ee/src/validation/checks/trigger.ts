import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { createNodeTypeMaps, getNodeTypeForNode } from '@/validation/utils/node-type-map';

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
		return violations;
	}

	const { nodeTypeMap, nodeTypesByName } = createNodeTypeMaps(nodeTypes);

	for (const node of workflow.nodes) {
		const nodeType = getNodeTypeForNode(node, nodeTypeMap, nodeTypesByName);

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
