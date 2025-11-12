import { NodeConnectionType, WorkflowJSON } from './types';
import { WorkflowNode } from './nodes';
import { Workflow } from './workflow';

/**
 * Create a workflow from existing JSON
 */
export function fromJSON(json: WorkflowJSON): Workflow {
	const wf = new Workflow({
		name: json.name,
		meta: json.meta,
	});

	// Add settings and other properties
	if (json.settings) wf.settings(json.settings);
	if (json.staticData) wf.staticData(json.staticData);
	if (json.active !== undefined) wf.active(json.active);

	// Create nodes
	const nodeMap = new Map<string, WorkflowNode<any>>();
	for (const nodeData of json.nodes) {
		const node = wf
			.node(nodeData.name)
			.type(nodeData.type as any)
			.parameters(nodeData.parameters)
			.position(nodeData.position[0], nodeData.position[1]);

		if (nodeData.id) node.id(nodeData.id);
		if (nodeData.typeVersion) node.version(nodeData.typeVersion);
		if (nodeData.disabled) node.disabled(nodeData.disabled);
		if (nodeData.notes) node.notes(nodeData.notes, nodeData.notesInFlow);
		if (nodeData.webhookId) node.webhookId(nodeData.webhookId);
		if (nodeData.credentials) node.credentials(nodeData.credentials);
		if (nodeData.retryOnFail) {
			node.retryOnFail(nodeData.retryOnFail, nodeData.maxTries, nodeData.waitBetweenTries);
		}
		if (nodeData.alwaysOutputData) node.alwaysOutputData(nodeData.alwaysOutputData);
		if (nodeData.executeOnce) node.executeOnce(nodeData.executeOnce);
		if (nodeData.continueOnFail) node.continueOnFail(nodeData.continueOnFail);

		nodeMap.set(nodeData.name, node);
	}

	// Create connections
	for (const [sourceName, typeConnections] of Object.entries(json.connections)) {
		const sourceNode = nodeMap.get(sourceName);
		if (!sourceNode) continue;

		for (const [sourceType, indexArrays] of Object.entries(typeConnections)) {
			indexArrays.forEach((connections, sourceIndex) => {
				if (!connections) return;
				for (const conn of connections) {
					const destNode = nodeMap.get(conn.node);
					if (!destNode) continue;

					wf.addConnection(
						sourceNode,
						destNode,
						sourceType as NodeConnectionType,
						sourceIndex,
						conn.type,
						conn.index,
					);
				}
			});
		}
	}

	// Add pin data
	if (json.pinData) {
		for (const [nodeName, data] of Object.entries(json.pinData)) {
			wf.pinData(nodeName, data);
		}
	}

	return wf;
}
