import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

export interface TriggerEvaluationResult {
	hasTrigger: boolean;
	issues: string[];
	triggerNodes: string[];
}

const isTriggerNode = (nodeType: INodeTypeDescription) => nodeType.group.includes('trigger');

export function evaluateTrigger(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): TriggerEvaluationResult {
	const issues: string[] = [];
	const triggerNodes: string[] = [];

	// Check if workflow has nodes
	if (!workflow.nodes || workflow.nodes.length === 0) {
		issues.push('Workflow has no nodes');
		return { hasTrigger: false, issues, triggerNodes };
	}

	// Find all trigger nodes
	for (const node of workflow.nodes) {
		const nodeType = nodeTypes.find((type) => type.name === node.type);

		if (!nodeType) {
			// Node type not found - already reported in connection evaluator
			continue;
		}

		if (isTriggerNode(nodeType)) {
			triggerNodes.push(node.name);
		}
	}

	// Check if at least one trigger exists
	const hasTrigger = triggerNodes.length > 0;

	if (!hasTrigger) {
		issues.push('Workflow must have at least one trigger node to start execution');
	}

	return {
		hasTrigger,
		issues,
		triggerNodes,
	};
}
