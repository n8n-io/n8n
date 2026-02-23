import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { ProgrammaticViolation } from '../types';

export function validateNodes(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): ProgrammaticViolation[] {
	const violations: ProgrammaticViolation[] = [];

	if (!workflow.nodes || workflow.nodes.length === 0) {
		violations.push({
			name: 'workflow-has-no-nodes',
			type: 'critical',
			description: 'Workflow has no nodes',
			pointsDeducted: 50,
		});

		return violations;
	}

	const nodeCountByType = new Map<string, number>();

	for (const node of workflow.nodes) {
		const currentCount = nodeCountByType.get(node.type) ?? 0;
		nodeCountByType.set(node.type, currentCount + 1);
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
