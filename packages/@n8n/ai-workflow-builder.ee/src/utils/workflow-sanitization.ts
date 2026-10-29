import type { IConnection, IConnections } from 'n8n-workflow';
import { isUsableObjectKey } from 'n8n-workflow';

import type { SimpleWorkflow } from '../types/workflow';

/**
 * A connection can only be kept if both of its node-name and connection-type fields can be
 * own keys of an object. Traversal helpers invert the graph and key the result by these two
 * fields, so an unusable value there is as bad as an unusable key in the stored map — and a
 * stored payload can name a target that has no node entry at all.
 */
function isUsableConnection(connection: IConnection): boolean {
	return isUsableObjectKey(connection.node) && isUsableObjectKey(connection.type);
}

/**
 * Remove nodes whose name cannot be an own key of a plain object, together with every
 * connection that references them or that is itself keyed by such a name.
 *
 * The builder keys its connection maps by node name. A name such as `__proto__` resolves
 * to an inherited slot instead of an own key, so a node with that name can never take part
 * in a valid graph. The write paths guard their own keys; this runs once when a stored
 * workflow enters builder state, so no later step has to reason about the name at all.
 */
export function sanitizeWorkflowForBuilder(workflow: SimpleWorkflow): SimpleWorkflow {
	const nodes = workflow.nodes ?? [];

	// Set when anything is dropped, so an untouched workflow is returned as-is.
	let changed = false;

	const keptNodes = nodes.filter((node) => {
		if (isUsableObjectKey(node.name)) return true;
		changed = true;
		return false;
	});

	const connections: IConnections = {};

	for (const [sourceName, nodeConnections] of Object.entries(workflow.connections ?? {})) {
		if (!isUsableObjectKey(sourceName)) {
			changed = true;
			continue;
		}

		const keptTypes: IConnections[string] = {};

		for (const [connectionType, outputs] of Object.entries(nodeConnections)) {
			if (!isUsableObjectKey(connectionType) || !Array.isArray(outputs)) {
				changed = true;
				continue;
			}

			keptTypes[connectionType] = outputs.map((outputConnections) => {
				if (!Array.isArray(outputConnections)) return outputConnections;

				const kept = outputConnections.filter(isUsableConnection);
				if (kept.length !== outputConnections.length) changed = true;
				return kept;
			});
		}

		connections[sourceName] = keptTypes;
	}

	if (!changed) return workflow;

	return {
		...workflow,
		nodes: keptNodes,
		connections,
	};
}
