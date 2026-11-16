import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

/** The workflow's home project, from the open document or the list cache. */
export function useWorkflowHomeProjectId(workflowId: MaybeRefOrGetter<string>) {
	const workflowsListStore = useWorkflowsListStore();
	const documentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(toValue(workflowId))),
	);

	return computed(() => {
		const id = toValue(workflowId);
		return (
			documentStore.value.homeProject?.id ?? workflowsListStore.getWorkflowById(id)?.homeProject?.id
		);
	});
}
