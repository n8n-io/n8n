import { getChildNodes, NodeConnectionTypes } from 'n8n-workflow';

import { createNodeTypeMaps, getNodeTypeForNode } from '@/validation/utils/node-type-map';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

export const hasStartNode: BinaryCheck = {
	name: 'has_start_node',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		if (!workflow.nodes || workflow.nodes.length === 0) {
			return { pass: false, comment: 'Workflow has no nodes' };
		}

		const connections = workflow.connections ?? {};
		const { nodeTypeMap, nodeTypesByName } = createNodeTypeMaps(ctx.nodeTypes);

		for (const node of workflow.nodes) {
			const nodeType = getNodeTypeForNode(node, nodeTypeMap, nodeTypesByName);
			if (!nodeType?.group.includes('trigger')) continue;

			const children = getChildNodes(connections, node.name, NodeConnectionTypes.Main, 1);
			if (children.length > 0) {
				return { pass: true };
			}
		}

		return { pass: false, comment: 'No trigger has a downstream node connected' };
	},
};
