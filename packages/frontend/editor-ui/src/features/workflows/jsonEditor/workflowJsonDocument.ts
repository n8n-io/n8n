import type { WorkflowData } from '@n8n/rest-api-client/api/workflows';
import type { INode } from 'n8n-workflow';

import type { WorkflowJson } from './workflowJson.types';

// Identity keys first, so a node is easy to spot when the panel scrolls to it.
function orderNodeKeys({ name, type, typeVersion, position, id, ...rest }: INode): INode {
	return { name, type, typeVersion, position, id, ...rest };
}

export function orderWorkflowJson({
	name,
	nodes,
	connections,
	pinData,
	settings,
}: WorkflowJson): WorkflowJson {
	return { name, nodes: nodes.map(orderNodeKeys), connections, pinData, settings };
}

export function toWorkflowJson(data: WorkflowData): WorkflowJson {
	return orderWorkflowJson({
		name: data.name,
		nodes: data.nodes,
		connections: data.connections,
		pinData: data.pinData ?? {},
		settings: data.settings,
	});
}

export const stringifyWorkflowJson = (json: WorkflowJson): string => JSON.stringify(json, null, 2);
