import {
	dropInvalidWorkflowGroups,
	isNodeConnectionType,
	isSafeObjectProperty,
	type GetNodeTypeForGrouping,
	type IConnections,
	type INode,
	type INodeConnections,
	type WorkflowGroupViolation,
} from 'n8n-workflow';

import type { WorkflowJSON } from '../types/base';

/**
 * LOSSY: Bridges the SDK's connections to `n8n-workflow`'s `IConnections`.
 * Unknown connection types are skipped; this is for graph traversal and group
 * validation, not for preserving arbitrary serialized data.
 *
 * The SDK and engine declare duplicate but formally separate connection types
 * (the SDK types `IConnection.type` as plain `string`), so values are re-keyed
 * through the `isNodeConnectionType` guard. Serializer output only ever carries
 * known connection types; if an unknown one slips through, that connection is
 * skipped here and the save path still rejects the workflow.
 *
 * Node names and connection types come from submitted code, so source keys,
 * target keys, and connection-type keys that resolve to object internals
 * (`__proto__`, `constructor`, ...) are skipped — assigning them onto a plain
 * object would mutate its prototype instead of creating an own property,
 * silently corrupting the re-keyed connections.
 */
export function toEngineConnections(connections: WorkflowJSON['connections']): IConnections {
	const bySourceNode: IConnections = {};
	for (const [sourceNode, byType] of Object.entries(connections ?? {})) {
		if (!isSafeObjectProperty(sourceNode)) continue;
		const nodeConnections: INodeConnections = {};
		for (const [connectionType, outputs] of Object.entries(byType)) {
			if (!isSafeObjectProperty(connectionType)) continue;
			nodeConnections[connectionType] = outputs.map(
				(outputConnections) =>
					outputConnections?.flatMap((connection) =>
						isNodeConnectionType(connection.type) && isSafeObjectProperty(connection.node)
							? [{ ...connection, type: connection.type }]
							: [],
					) ?? null,
			);
		}
		bySourceNode[sourceNode] = nodeConnections;
	}
	return bySourceNode;
}

/**
 * Maps SDK nodes to the minimal `INode` shape group validation reads:
 * id/name/type/typeVersion. Parameters are never read, so an empty object is
 * passed instead of bridging SDK and engine parameter types.
 */
export function toGroupValidationNodes(nodes: WorkflowJSON['nodes']): INode[] {
	return nodes.map((node) => ({
		id: node.id,
		name: node.name ?? '',
		type: node.type,
		typeVersion: node.typeVersion,
		position: node.position,
		parameters: {},
	}));
}

/** Drops invalid groups from SDK `WorkflowJSON`, returning their violations. Mutates `json.nodeGroups`. */
export function dropInvalidWorkflowJsonGroups(
	json: WorkflowJSON,
	getNodeType: GetNodeTypeForGrouping | null,
	shouldDrop?: (violation: WorkflowGroupViolation) => boolean,
): WorkflowGroupViolation[] {
	if (!json.nodeGroups?.length) return [];

	const validationWorkflow = {
		nodes: toGroupValidationNodes(json.nodes ?? []),
		connections: toEngineConnections(json.connections),
		nodeGroups: json.nodeGroups,
	};
	const violations = dropInvalidWorkflowGroups(validationWorkflow, getNodeType, shouldDrop);
	json.nodeGroups = validationWorkflow.nodeGroups;

	return violations;
}
