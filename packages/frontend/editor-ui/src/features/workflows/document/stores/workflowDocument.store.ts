/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { IWorkflowDb } from '@/Interface';
import { defineStore } from 'pinia';
import { useDeserializeWorkflow } from '../composables/useDeserializeWorkflow';
import { unref, type MaybeRef } from 'vue';

const workflowDocuments = new Map<string, ReturnType<typeof createWorkflowDocumentStore>>();

const createWorkflowDocumentStore = (id: string) =>
	defineStore(`workflowDocument/${id}`, () => {
		const {
			nodesById,
			nodeIds,
			connectionsById,
			connectionsIds,
			settings,
			tags,
			pinData,
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
		} = useDeserializeWorkflow({
			id,
			name: '',
			description: '',
			active: false,
			isArchived: false,
			createdAt: '',
			updatedAt: '',
			nodes: [],
			connections: {},
			versionId: '1',
			activeVersionId: '1',
		});

		function initialize(workflow: IWorkflowDb) {
			const serializedWorkflow = useDeserializeWorkflow(workflow);

			nodesById.value = serializedWorkflow.nodesById.value;
			nodeIds.value = serializedWorkflow.nodeIds.value;
			connectionsById.value = serializedWorkflow.connectionsById.value;
			connectionsIds.value = serializedWorkflow.connectionsIds.value;
			settings.value = serializedWorkflow.settings.value;
			tags.value = serializedWorkflow.tags.value;
			pinData.value = serializedWorkflow.pinData.value;
			name.value = serializedWorkflow.name.value;
			description.value = serializedWorkflow.description.value;
			active.value = serializedWorkflow.active.value;
			isArchived.value = serializedWorkflow.isArchived.value;
			createdAt.value = serializedWorkflow.createdAt.value;
			updatedAt.value = serializedWorkflow.updatedAt.value;
			sharedWithProjects.value = serializedWorkflow.sharedWithProjects.value;
			homeProject.value = serializedWorkflow.homeProject.value;
			scopes.value = serializedWorkflow.scopes.value;
			versionId.value = serializedWorkflow.versionId.value;
			activeVersionId.value = serializedWorkflow.activeVersionId.value;
			usedCredentials.value = serializedWorkflow.usedCredentials.value;
			meta.value = serializedWorkflow.meta.value;
			parentFolder.value = serializedWorkflow.parentFolder.value;
			activeVersion.value = serializedWorkflow.activeVersion.value;
		}

		return {
			initialize,
			nodesById,
			nodeIds,
			connectionsById,
			connectionsIds,
			settings,
			tags,
			pinData,
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
		};
	});

export const useWorkflowDocument = (idRef: MaybeRef<string>) => {
	const id = unref(idRef);

	if (!workflowDocuments.has(id)) {
		workflowDocuments.set(id, createWorkflowDocumentStore(id));
	}

	return workflowDocuments.get(id)!;
};
