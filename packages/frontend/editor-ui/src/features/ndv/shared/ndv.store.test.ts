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

	it('keeps state isolated between stores keyed by different workflow ids', () => {
		const storeA = useNDVStore(createWorkflowDocumentId('workflow-a'));
		const storeB = useNDVStore(createWorkflowDocumentId('workflow-b'));

		storeA.setActiveNodeName('Node from A', 'other');
		storeA.draggableStartDragging('mapping', 'value-from-a');

		expect(storeA.activeNodeName).toBe('Node from A');
		expect(storeA.draggable.isDragging).toBe(true);
		expect(storeA.draggable.data).toBe('value-from-a');

		expect(storeB.activeNodeName).toBeNull();
		expect(storeB.draggable.isDragging).toBe(false);
		expect(storeB.draggable.data).toBe('');

		storeB.setActiveNodeName('Node from B', 'other');
		expect(storeA.activeNodeName).toBe('Node from A');
		expect(storeB.activeNodeName).toBe('Node from B');
	});
});
