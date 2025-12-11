import type { INodeUi, IWorkflowDb } from '@/Interface';
import { ref } from 'vue';
import { mapLegacyConnectionsToCanvasConnections } from '@/features/workflows/canvas/canvas.utils';

export function useDeserializeWorkflow(workflow: IWorkflowDb) {
	const {
		nodes,
		connections,
		settings,
		tags,
		pinData,
		id,
		name,
		description,
		active,
		isArchived,
		createdAt,
		updatedAt,
		sharedWithProjects,
		homeProject,
		scopes,
		versionId,
		activeVersionId,
		usedCredentials,
		meta,
		parentFolder,
		activeVersion,
	} = workflow;

	const nodesById = ref(
		nodes.reduce<Record<string, INodeUi>>((acc, node) => {
			acc[node.id] = node;
			return acc;
		}, {}),
	);
	const nodeIds = ref(Object.keys(nodesById.value));

	const connectionsById = ref(mapLegacyConnectionsToCanvasConnections(connections, nodes));
	const connectionsIds = ref(Object.keys(connectionsById.value));

	return {
		nodesById,
		nodeIds,
		connectionsById,
		connectionsIds,
		settings: ref(settings),
		tags: ref(tags),
		pinData: ref(pinData),
		id: ref(id),
		name: ref(name),
		description: ref(description),
		active: ref(active),
		isArchived: ref(isArchived),
		createdAt: ref(createdAt),
		updatedAt: ref(updatedAt),
		sharedWithProjects: ref(sharedWithProjects),
		homeProject: ref(homeProject),
		scopes: ref(scopes),
		versionId: ref(versionId),
		activeVersionId: ref(activeVersionId),
		usedCredentials: ref(usedCredentials),
		meta: ref(meta),
		parentFolder: ref(parentFolder),
		activeVersion: ref(activeVersion),
	};
}
