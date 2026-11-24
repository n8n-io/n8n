import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia, getActivePinia } from 'pinia';
import { defineComponent, nextTick, shallowRef, type ShallowRef } from 'vue';
import { mount } from '@vue/test-utils';
import {
	runDataDisplayModeRegistry,
	type RunDataDisplayModeContribution,
} from '@n8n/frontend-module-sdk';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { disposeNDVStore, injectNDVStore, useNDVStore } from './ndv.store';
import {
	LOCAL_STORAGE_NDV_INPUT_PANEL_DISPLAY_MODE,
	LOCAL_STORAGE_NDV_OUTPUT_PANEL_DISPLAY_MODE,
} from './ndv.constants';

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

	describe('panel display mode', () => {
		const map: RunDataDisplayModeContribution = {
			id: 'map',
			label: () => 'Map',
			icon: 'globe',
			component: defineComponent({ render: () => null }),
			canRender: () => true,
		};

		const createStore = () => useNDVStore(createWorkflowDocumentId('wf-display-mode'));

		beforeEach(() => {
			localStorage.clear();
			runDataDisplayModeRegistry.clear();
		});

		it('returns a stored built-in mode', () => {
			localStorage.setItem(LOCAL_STORAGE_NDV_OUTPUT_PANEL_DISPLAY_MODE, 'json');

			expect(createStore().outputPanelDisplayMode).toBe('json');
		});

		it.each([
			['a rollback removed the mode', 'map'],
			['the mode was renamed', 'map-legacy'],
		])('falls back to the pane default when %s, and keeps the stored id', async (_, storedId) => {
			localStorage.setItem(LOCAL_STORAGE_NDV_INPUT_PANEL_DISPLAY_MODE, storedId);
			localStorage.setItem(LOCAL_STORAGE_NDV_OUTPUT_PANEL_DISPLAY_MODE, storedId);

			const store = createStore();

			expect(store.inputPanelDisplayMode).toBe('schema');
			expect(store.outputPanelDisplayMode).toBe('table');
			// A write-back would land on the next tick
			await nextTick();
			expect(localStorage.getItem(LOCAL_STORAGE_NDV_INPUT_PANEL_DISPLAY_MODE)).toBe(storedId);
			expect(localStorage.getItem(LOCAL_STORAGE_NDV_OUTPUT_PANEL_DISPLAY_MODE)).toBe(storedId);
		});

		it('follows the registry when a selected mode is unregistered and registered again', async () => {
			runDataDisplayModeRegistry.register(map);
			const store = createStore();
			store.setPanelDisplayMode({ pane: 'output', mode: 'map' });
			expect(store.outputPanelDisplayMode).toBe('map');
			// useLocalStorage writes in a watcher
			await nextTick();

			runDataDisplayModeRegistry.unregister('map');
			expect(store.outputPanelDisplayMode).toBe('table');
			await nextTick();
			expect(localStorage.getItem(LOCAL_STORAGE_NDV_OUTPUT_PANEL_DISPLAY_MODE)).toBe('map');

			runDataDisplayModeRegistry.register(map);
			expect(store.outputPanelDisplayMode).toBe('map');
		});
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
