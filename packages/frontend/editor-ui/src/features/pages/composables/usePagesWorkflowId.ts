import { computed, type ComputedRef } from 'vue';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

import { useIsPageModuleActive } from './useIsPageModuleActive';

/**
 * Reads the id of the open workflow when pages can link to it.
 * The id is `undefined` until the workflow is saved, and when the page module is off.
 */
export function usePagesWorkflowId(): ComputedRef<string | undefined> {
	const isPageModuleActive = useIsPageModuleActive();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();

	return computed(() => {
		const workflowId = isPageModuleActive.value
			? workflowDocumentStore.value.workflowId
			: undefined;
		const isSaved = workflowId !== undefined && Boolean(workflowsStore.isWorkflowSaved[workflowId]);
		return isSaved ? workflowId : undefined;
	});
}
