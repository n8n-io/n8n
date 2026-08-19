import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	isNodeConnectionType,
	isSafeObjectProperty,
	makeGetNodeTypeForGrouping,
	validateWorkflowGroups,
	type IConnections,
	type INode,
	type INodeConnections,
} from 'n8n-workflow';

import type { ValidationWarning } from './workflow-validation-warnings';
import type { InstanceAiContext } from '../../types';

export const NODE_GROUP_DROPPED_CODE = 'NODE_GROUP_DROPPED';

function toValidationNodes(nodes: WorkflowJSON['nodes']): INode[] {
	return nodes.map((node) => ({
		id: node.id,
		name: node.name ?? '',
		type: node.type,
		typeVersion: node.typeVersion,
		position: node.position,
		parameters: {},
	}));
}

function toWorkflowConnections(connections: WorkflowJSON['connections']): IConnections {
	const bySourceNode: IConnections = {};

	for (const [sourceNode, byType] of Object.entries(connections ?? {})) {
		if (!isSafeObjectProperty(sourceNode)) continue;

		const nodeConnections: INodeConnections = {};
		for (const [connectionType, outputs] of Object.entries(byType)) {
			if (!isSafeObjectProperty(connectionType)) continue;

			// SDK connection types are plain strings. Re-key known values into
			// n8n-workflow's type union and skip unsafe object keys from raw JSON.
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
 * Drops every group that breaks the structural grouping rules, mutating
 * `json.nodeGroups`, and returns one informational warning per dropped group.
 */
export function dropInvalidNodeGroups(
	json: WorkflowJSON,
	context: InstanceAiContext,
): ValidationWarning[] {
	if (!json.nodeGroups?.length) return [];

	const result = validateWorkflowGroups({
		nodes: toValidationNodes(json.nodes ?? []),
		connectionsBySourceNode: toWorkflowConnections(json.connections),
		nodeGroups: json.nodeGroups,
		getNodeType: context.nodeTypesProvider
			? makeGetNodeTypeForGrouping(context.nodeTypesProvider)
			: null,
	});

	if (result.valid) return [];

	const firstViolationByGroupId = new Map<string, (typeof result.violations)[number]>();
	for (const violation of result.violations) {
		if (!firstViolationByGroupId.has(violation.groupId)) {
			firstViolationByGroupId.set(violation.groupId, violation);
		}
	}

	const droppedGroupIds = new Set(firstViolationByGroupId.keys());
	json.nodeGroups = json.nodeGroups.filter((group) => !droppedGroupIds.has(group.id));

	return Array.from(firstViolationByGroupId.values()).map((violation) => ({
		code: NODE_GROUP_DROPPED_CODE,
		severity: 'informational',
		message: `Node group "${violation.groupName}" was removed from the saved workflow: ${violation.message}`,
	}));
}
