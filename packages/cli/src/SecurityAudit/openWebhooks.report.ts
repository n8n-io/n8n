/* eslint-disable @typescript-eslint/no-use-before-define */
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { WEBHOOK_NODE_TYPE, WEBHOOK_VALIDATOR_NODE_TYPES } from './constants';
import type { INode } from 'n8n-workflow';
import type { FlaggedLocation } from './types';

export async function reportOpenWebhooks(workflows: WorkflowEntity[]) {
	const locations = workflows.reduce<FlaggedLocation[]>((acc, workflow) => {
		if (!workflow.active) return acc;

		workflow.nodes.forEach((node) => {
			if (
				node.type === WEBHOOK_NODE_TYPE &&
				node.parameters.authentication === undefined &&
				!hasValidatorChild(node, workflow)
			) {
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
		risk: 'Open webhooks',
		description:
			'These active workflows contain at least one Webhook node whose "Authentication" field is "None" and not directly connected to an If or Switch node to validate the payload. Leaving webhooks unprotected allows your workflow to be called by any third party who finds the webhook URL. Consider adding authentication to the workflow or validating the payload.',
		locations,
	};
}

function hasValidatorChild(node: INode, workflow: WorkflowEntity) {
	const childNodeNames = workflow.connections[node.name]?.main[0].map((i) => i.node);

	if (!childNodeNames) return false;

	return childNodeNames.some((name) =>
		workflow.nodes.find((n) => n.name === name && WEBHOOK_VALIDATOR_NODE_TYPES.includes(n.type)),
	);
}
