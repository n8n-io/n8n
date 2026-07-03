import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import { defineComponent, shallowRef, type ShallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { disposeNDVStore, injectNDVStore, useNDVStore } from './ndv.store';

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

	it('keeps NDV state isolated per workflow document id', () => {
		const storeA = useNDVStore(createWorkflowDocumentId('wf-a'));
		const storeB = useNDVStore(createWorkflowDocumentId('wf-b'));

		expect(storeA).not.toBe(storeB);

		storeA.setActiveNodeName('Node A', 'other');

		expect(storeA.activeNodeName).toBe('Node A');
		expect(storeB.activeNodeName).toBeNull();
		// Re-deriving by the same id returns the same scoped instance.
		expect(useNDVStore(createWorkflowDocumentId('wf-a')).activeNodeName).toBe('Node A');
	});

	describe('injectNDVStore', () => {
		function renderWithProvidedStore(provided?: ShallowRef<WorkflowDocumentStore | null>) {
			let injected!: ReturnType<typeof injectNDVStore>;
			const comp = defineComponent({
				setup() {
					injected = injectNDVStore();
					return () => null;
				},
			});
			const wrapper = mount(comp, {
				global: {
					provide: provided ? { [WorkflowDocumentStoreKey as symbol]: provided } : {},
				},
			});
			return { injected, unmount: () => wrapper.unmount() };
		}

		it('resolves the workflow-scoped NDV store from the provided document store', () => {
			const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId('wf-1'));

			const { injected } = renderWithProvidedStore(shallowRef(documentStore));

			expect(injected.value).toBe(useNDVStore(createWorkflowDocumentId('wf-1')));
		});

		it('throws when accessed with no workflow document loaded', () => {
			const { injected } = renderWithProvidedStore(shallowRef(null));

			expect(() => injected.value).toThrowError(/without an active workflow document store/);
		});

		it('throws when no workflow document store is provided at all', () => {
			expect(() => renderWithProvidedStore()).toThrowError(/Could not resolve/);
		});
	});
});
