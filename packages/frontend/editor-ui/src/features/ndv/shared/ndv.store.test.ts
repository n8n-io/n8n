import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { disposeNDVStore, useNDVStore } from './ndv.store';

describe('ndv.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('disposeNDVStore disposes the instance and clears scoped state', () => {
		const ndvStoreId = createWorkflowDocumentId('test-wf');
		const ndvStore = useNDVStore(ndvStoreId);
		const pinia = getActivePinia();
		const disposeSpy = vi.spyOn(ndvStore, '$dispose');

		ndvStore.setActiveNodeName('Stale node', 'other');

		expect(pinia?.state.value[ndvStore.$id]).toBeDefined();

		disposeNDVStore(ndvStore);

		expect(disposeSpy).toHaveBeenCalledOnce();
		expect(pinia?.state.value[ndvStore.$id]).toBeUndefined();

		const recreatedNDVStore = useNDVStore(ndvStoreId);

		expect(recreatedNDVStore).not.toBe(ndvStore);
		expect(recreatedNDVStore.activeNodeName).toBeNull();
	});
});
