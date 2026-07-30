import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	isNodeConnectionType,
	isSafeObjectProperty,
	validateWorkflowGroups,
	type IConnections,
	type INode,
	type INodeConnections,
	type WorkflowGroupViolation,
} from 'n8n-workflow';

import type { NodeTypes } from '@/node-types';
import { makeGetNodeTypeForGrouping } from '@/workflow-helpers';

/**
 * Bridges the SDK's connections to `n8n-workflow`'s `IConnections`. The two
 * declare duplicate but formally separate connection types (the SDK types
 * `IConnection.type` as plain `string`), so the values are re-keyed through the
 * `isNodeConnectionType` guard. Serializer output only ever carries known
 * connection types; if an unknown one ever slips through, that connection is
 * skipped here and the save path still rejects the workflow.
 *
 * Node names and connection types come from submitted code, so keys that
 * resolve to object internals (`__proto__`, `constructor`, ...) are skipped —
 * assigning them onto a plain object would mutate its prototype instead of
 * creating an own property, silently corrupting the re-keyed connections.
 */
function toWorkflowConnections(connections: WorkflowJSON['connections']): IConnections {
	const bySourceNode: IConnections = {};
	for (const [sourceNode, byType] of Object.entries(connections ?? {})) {
		if (!isSafeObjectProperty(sourceNode)) continue;
		const nodeConnections: INodeConnections = {};
		for (const [connectionType, outputs] of Object.entries(byType)) {
			if (!isSafeObjectProperty(connectionType)) continue;
			nodeConnections[connectionType] = outputs.map(
				(outputConnections) =>
					outputConnections?.flatMap((connection) =>
						isNodeConnectionType(connection.type) ? [{ ...connection, type: connection.type }] : [],
					) ?? null,
			);
		}
		bySourceNode[sourceNode] = nodeConnections;
	}
	return bySourceNode;
}

/**
 * Runs the shared node-group validation (`validateWorkflowGroups`) on parsed
 * SDK workflow JSON and returns ALL violations. The save path throws only the
 * first violation (`validateWorkflowNodeGroups`); reporting the full list here
 * lets agents fix every group problem in a single round trip.
 */
export function collectNodeGroupViolations(
	workflowJson: WorkflowJSON,
	nodeTypes: NodeTypes,
): WorkflowGroupViolation[] {
	if ((workflowJson.nodeGroups?.length ?? 0) === 0) return [];

	// The group validator only reads id/name/type (+ typeVersion via
	// getNodeType); map the SDK's NodeJSON (optional name/parameters)
	// to the INode shape it expects. Parameters are never read, so an
	// empty object is passed instead of bridging the parameter types.
	const groupValidationNodes: INode[] = workflowJson.nodes.map((node) => ({
		id: node.id,
		name: node.name ?? '',
		type: node.type,
		typeVersion: node.typeVersion,
		position: node.position,
		parameters: {},
	}));

	const result = validateWorkflowGroups({
		nodes: groupValidationNodes,
		connectionsBySourceNode: toWorkflowConnections(workflowJson.connections),
		nodeGroups: workflowJson.nodeGroups,
		getNodeType: makeGetNodeTypeForGrouping(nodeTypes),
	});

	return result.valid ? [] : result.violations;
}
