import { defineStore, getActivePinia, type StoreGeneric } from 'pinia';
import { STORES } from '@n8n/stores';
import { ref, readonly, inject } from 'vue';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';

// Pinia internal type - _s is the store registry Map
type PiniaInternal = ReturnType<typeof getActivePinia> & {
	_s: Map<string, StoreGeneric>;
};

export type WorkflowDocumentId = `${string}@${string}`;

export function createWorkflowDocumentId(
	workflowId: string,
	version: string = 'latest',
): WorkflowDocumentId {
	return `${workflowId}@${version}`;
}

type Action<N, P> = { name: N; payload: P };

type SetTagsAction = Action<'setTags', { tags: string[] }>;
type AddTagsAction = Action<'addTags', { tags: string[] }>;
type RemoveTagAction = Action<'removeTag', { tagId: string }>;

type WorkflowDocumentAction = SetTagsAction | AddTagsAction | RemoveTagAction;

/**
 * Gets the store ID for a workflow document store.
 */
export function getWorkflowDocumentStoreId(id: string) {
	return `${STORES.WORKFLOW_DOCUMENTS}/${id}`;
}

/**
 * Creates a workflow document store for a specific workflow ID.
 *
 * Note: We use a factory function rather than a module-level cache because
 * Pinia store instances must be tied to the active Pinia instance. A module-level
 * cache would cause test isolation issues where stale store references persist
 * across test runs with different Pinia instances.
 *
 * Pinia internally handles store deduplication per-instance via the store ID.
 */
export function useWorkflowDocumentStore(id: WorkflowDocumentId) {
	return defineStore(getWorkflowDocumentStoreId(id), () => {
		const [workflowId, workflowVersion] = id.split('@');

		/**
		 * Tags
		 */

		const tags = ref<string[]>([]);

		function setTags(newTags: string[]) {
			onChange({ name: 'setTags', payload: { tags: newTags } });
		}

		function addTags(newTags: string[]) {
			onChange({ name: 'addTags', payload: { tags: newTags } });
		}

		function removeTag(tagId: string) {
			onChange({ name: 'removeTag', payload: { tagId } });
		}

		/**
		 * Handle actions in a CRDT like manner
		 */

		function onChange(action: WorkflowDocumentAction) {
			if (action.name === 'setTags') {
				tags.value = action.payload.tags;
			} else if (action.name === 'addTags') {
				const uniqueTags = new Set([...tags.value, ...action.payload.tags]);
				tags.value = Array.from(uniqueTags);
			} else if (action.name === 'removeTag') {
				tags.value = tags.value.filter((tag) => tag !== action.payload.tagId);
			}
		}

		return {
			workflowId,
			workflowVersion,
			tags: readonly(tags),
			setTags,
			addTags,
			removeTag,
		};
	})();
}

/**
 * Disposes a workflow document store by ID.
 * Call this when a workflow document is unloaded (e.g., when navigating away from NodeView).
 *
 * This removes the store from Pinia's internal registry, freeing memory and preventing
 * stale stores from accumulating over time.
 */
export function disposeWorkflowDocumentStore(id: string) {
	const pinia = getActivePinia() as PiniaInternal;
	if (!pinia) return;

	const storeId = getWorkflowDocumentStoreId(id);

	// Check if the store exists in the Pinia state
	if (pinia.state.value[storeId]) {
		// Get the store instance
		const store = pinia._s.get(storeId);
		if (store) {
			store.$dispose();
		}
		// Remove from Pinia's state
		delete pinia.state.value[storeId];
	}
}

/**
 * Injects the workflow document store from the current component tree.
 * Returns null if not within a component context that has provided the store.
 *
 * Use this in composables/stores that need to interact with the current workflow's
 * document store but may be called outside of the NodeView tree.
 */
export function injectWorkflowDocumentStore() {
	const storeRef = inject(WorkflowDocumentStoreKey, null);
	return storeRef?.value ?? null;
}
