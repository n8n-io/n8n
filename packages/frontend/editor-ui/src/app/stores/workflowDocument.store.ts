import { defineStore, getActivePinia, type StoreGeneric } from 'pinia';
import { STORES } from '@n8n/stores';
import { inject } from 'vue';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useWorkflowDocumentActive } from './workflowDocument/useWorkflowDocumentActive';
import { useWorkflowDocumentHomeProject } from './workflowDocument/useWorkflowDocumentHomeProject';
import { useWorkflowDocumentChecksum } from './workflowDocument/useWorkflowDocumentChecksum';
import { useWorkflowDocumentMeta } from './workflowDocument/useWorkflowDocumentMeta';
import { useWorkflowDocumentPinData } from './workflowDocument/useWorkflowDocumentPinData';
import { useWorkflowDocumentScopes } from './workflowDocument/useWorkflowDocumentScopes';
import { useWorkflowDocumentSettings } from './workflowDocument/useWorkflowDocumentSettings';
import { useWorkflowDocumentTags } from './workflowDocument/useWorkflowDocumentTags';
import { useWorkflowDocumentIsArchived } from './workflowDocument/useWorkflowDocumentIsArchived';
import { useWorkflowDocumentTimestamps } from './workflowDocument/useWorkflowDocumentTimestamps';
import { useWorkflowDocumentParentFolder } from './workflowDocument/useWorkflowDocumentParentFolder';
import { useWorkflowDocumentUsedCredentials } from './workflowDocument/useWorkflowDocumentUsedCredentials';
import { useWorkflowDocumentNodes } from './workflowDocument/useWorkflowDocumentNodes';
import { useWorkflowDocumentViewport } from './workflowDocument/useWorkflowDocumentViewport';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

export {
	getPinDataSize,
	pinDataToExecutionData,
} from './workflowDocument/useWorkflowDocumentPinData';

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

		const workflowDocumentActive = useWorkflowDocumentActive();
		const workflowDocumentHomeProject = useWorkflowDocumentHomeProject();
		const workflowDocumentChecksum = useWorkflowDocumentChecksum();
		const workflowDocumentMeta = useWorkflowDocumentMeta();
		const workflowDocumentTags = useWorkflowDocumentTags();
		const workflowDocumentIsArchived = useWorkflowDocumentIsArchived();
		const workflowDocumentPinData = useWorkflowDocumentPinData();
		const workflowDocumentScopes = useWorkflowDocumentScopes();
		const workflowDocumentTimestamps = useWorkflowDocumentTimestamps();
		const workflowDocumentSettings = useWorkflowDocumentSettings();
		const workflowDocumentParentFolder = useWorkflowDocumentParentFolder();
		const workflowDocumentUsedCredentials = useWorkflowDocumentUsedCredentials();
		const workflowDocumentViewport = useWorkflowDocumentViewport();
		const nodeTypesStore = useNodeTypesStore();
		const { onStateDirty, ...workflowDocumentNodes } = useWorkflowDocumentNodes({
			getNodeType: (typeName, version) => nodeTypesStore.getNodeType(typeName, version),
		});

		// --- Cross-cut orchestration ---
		// Each composable is self-contained and unaware of its siblings. This
		// store is where cross-concern side effects are wired. When adding new
		// composables (e.g. connections), check workflowsStore for hidden
		// cross-cuts that need to surface here. Known future ones:
		//   - removeNode → unpinNodeData (currently in workflowsStore.removeNode)
		//   - removeAllNodes → removeAllConnections (when connections composable exists)

		onStateDirty(() => useUIStore().markStateDirty());

		function removeAllNodes() {
			workflowDocumentNodes.removeAllNodes();
			workflowDocumentPinData.setPinData({});
		}

		return {
			workflowId,
			workflowVersion,
			...workflowDocumentActive,
			...workflowDocumentHomeProject,
			...workflowDocumentChecksum,
			...workflowDocumentIsArchived,
			...workflowDocumentMeta,
			...workflowDocumentSettings,
			...workflowDocumentTags,
			...workflowDocumentPinData,
			...workflowDocumentScopes,
			...workflowDocumentTimestamps,
			...workflowDocumentParentFolder,
			...workflowDocumentUsedCredentials,
			...workflowDocumentViewport,
			...workflowDocumentNodes,
			removeAllNodes,
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
	return inject(WorkflowDocumentStoreKey, null);
}
