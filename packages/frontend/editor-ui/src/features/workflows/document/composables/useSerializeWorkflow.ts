import type { IWorkflowDb } from '@/Interface';
import type { IConnections } from 'n8n-workflow';
import { unref } from 'vue';
import { parseCanvasConnectionHandleString } from '@/features/workflows/canvas/canvas.utils';
import type { useDeserializeWorkflow } from './useDeserializeWorkflow';

export function useSerializeWorkflow(
	workflow: ReturnType<typeof useDeserializeWorkflow>,
): IWorkflowDb {
	// Convert nodesById to array
	const nodes = Object.values(unref(workflow.nodesById));

	// Convert canvas connections to legacy connections
	const connections: IConnections = {};
	const connectionsById = unref(workflow.connectionsById);

	Object.values(connectionsById).forEach((connection) => {
		const sourceNode = unref(workflow.nodesById)[connection.source];
		const targetNode = unref(workflow.nodesById)[connection.target];

		if (!sourceNode || !targetNode) return;

		const { type: sourceType, index: sourceIndex } = parseCanvasConnectionHandleString(
			connection.sourceHandle,
		);
		const { type: targetType, index: targetIndex } = parseCanvasConnectionHandleString(
			connection.targetHandle,
		);

		const sourceNodeName = sourceNode.name;
		const targetNodeName = targetNode.name;

		// Initialize connection structure if needed
		if (!connections[sourceNodeName]) {
			connections[sourceNodeName] = {};
		}
		if (!connections[sourceNodeName][sourceType]) {
			connections[sourceNodeName][sourceType] = [];
		}

		connections[sourceNodeName][sourceType][sourceIndex] ??= [];

		// Add the connection
		connections[sourceNodeName][sourceType][sourceIndex].push({
			node: targetNodeName,
			type: targetType,
			index: targetIndex,
		});
	});

	return {
		id: unref(workflow.id),
		name: unref(workflow.name),
		description: unref(workflow.description),
		active: unref(workflow.active),
		isArchived: unref(workflow.isArchived),
		createdAt: unref(workflow.createdAt),
		updatedAt: unref(workflow.updatedAt),
		nodes,
		connections,
		settings: unref(workflow.settings),
		tags: unref(workflow.tags),
		pinData: unref(workflow.pinData),
		sharedWithProjects: unref(workflow.sharedWithProjects),
		homeProject: unref(workflow.homeProject),
		scopes: unref(workflow.scopes),
		versionId: unref(workflow.versionId),
		activeVersionId: unref(workflow.activeVersionId),
		usedCredentials: unref(workflow.usedCredentials),
		meta: unref(workflow.meta),
		parentFolder: unref(workflow.parentFolder),
		activeVersion: unref(workflow.activeVersion),
	};
}
