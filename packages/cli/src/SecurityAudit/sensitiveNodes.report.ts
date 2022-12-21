import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { RISKS, SENSITIVE_NODE_TYPES } from './constants';
import type { FlaggedLocation } from './types';

export async function reportSensitiveNodes(workflows: WorkflowEntity[]) {
	const locations = workflows.reduce<FlaggedLocation[]>((acc, workflow) => {
		if (!workflow.active) return acc;

		workflow.nodes.forEach((node) => {
			if (SENSITIVE_NODE_TYPES.includes(node.type)) {
				acc.push({
					workflowId: workflow.id.toString(),
					workflowName: workflow.name,
					nodeId: node.id,
					nodeName: node.name,
					nodeType: node.type,
				});
			}
		});

		return acc;
	}, []);

	if (locations.length === 0) return null;

	return {
		risk: RISKS.SENSITIVE_NODES,
		description:
			'These active workflows contain a node that is potentially dangerous because of all the functionality it exposes to the user, which may lead to exploits such as remote code execution. Consider replacing sensitive nodes with other nodes where possible, and also preventing the instance from loading some node types with the `NODES_EXCLUDE` environment variable.',
		locations,
	};
}
