/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { IWorkflowDb } from '@/Interface';
import { defineStore } from 'pinia';
import { useDeserializeWorkflow } from './composables/useDeserializeWorkflow';

const workflowDocuments = new Map<string, ReturnType<typeof createWorkflowDocumentStore>>();

const createWorkflowDocumentStore = (id: string) =>
	defineStore(`workflowDocument/${id}`, () => {
		const { nodesById, nodeIds, connectionsById, connectionsIds } = useDeserializeWorkflow({
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

		function applyDocumentUpdate() {
			// switch (update) {
			// 	case 'addNode':
			// 		break;
			// }
		}

		function initialize(workflow: IWorkflowDb) {
			const serializedWorkflow = useDeserializeWorkflow(workflow);

			nodesById.value = serializedWorkflow.nodesById.value;
			nodeIds.value = serializedWorkflow.nodeIds.value;
			connectionsById.value = serializedWorkflow.connectionsById.value;
			connectionsIds.value = serializedWorkflow.connectionsIds.value;
		}

		return {
			initialize,
		};
	});

export const useWorkflowDocument = (id: string) => {
	if (!workflowDocuments.has(id)) {
		workflowDocuments.set(id, createWorkflowDocumentStore(id));
	}

	return workflowDocuments.get(id)!;
};
