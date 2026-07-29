import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { createNodeTypeMaps, getNodeTypeForNode } from '@/validation/utils/node-type-map';

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

	const { nodeTypeMap, nodeTypesByName } = createNodeTypeMaps(nodeTypes);

	// Group nodes by type for counting
	const nodeCountByType = new Map<string, number>();

	for (const node of workflow.nodes) {
		const currentCount = nodeCountByType.get(node.type) ?? 0;
		nodeCountByType.set(node.type, currentCount + 1);
	}

	// For maxNodes validation, we check each unique node type
	// We use the first occurrence's version to look up the node type
	const checkedTypes = new Set<string>();

	for (const node of workflow.nodes) {
		if (checkedTypes.has(node.type)) {
			continue;
		}
		checkedTypes.add(node.type);

		const nodeType = getNodeTypeForNode(node, nodeTypeMap, nodeTypesByName);

		if (!nodeType?.maxNodes) {
			continue;
		}

		const count = nodeCountByType.get(node.type) ?? 0;

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
