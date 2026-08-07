import { createPinia, setActivePinia } from 'pinia';
import { modalRegistry } from '@n8n/frontend-module-sdk';

import { listenForModalChanges, useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';

describe('UI Store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		modalRegistry.clear();
	});

	describe('markStateDirty', () => {
		it('should mark state as dirty and set hasUnsavedWorkflowChanges when type is workflow', () => {
			const uiStore = useUIStore();

			uiStore.markStateDirty('workflow');

			expect(uiStore.stateIsDirty).toBe(true);
			expect(uiStore.hasUnsavedWorkflowChanges).toBe(true);
		});

		it('should mark state as dirty but not set hasUnsavedWorkflowChanges when type is metadata', () => {
			const uiStore = useUIStore();

			uiStore.markStateDirty('metadata');

			expect(uiStore.stateIsDirty).toBe(true);
			expect(uiStore.hasUnsavedWorkflowChanges).toBe(false);
		});

		it('should default to workflow type when no type is provided', () => {
			const uiStore = useUIStore();

			uiStore.markStateDirty();

			expect(uiStore.stateIsDirty).toBe(true);
			expect(uiStore.hasUnsavedWorkflowChanges).toBe(true);
		});

		it('should increment dirtyStateSetCount each time it is called', () => {
			const uiStore = useUIStore();
			const initialCount = uiStore.dirtyStateSetCount;

			uiStore.markStateDirty('metadata');
			expect(uiStore.dirtyStateSetCount).toBe(initialCount + 1);

			uiStore.markStateDirty('workflow');
			expect(uiStore.dirtyStateSetCount).toBe(initialCount + 2);
		});

		it('should not override hasUnsavedWorkflowChanges once set to true', () => {
			const uiStore = useUIStore();

			uiStore.markStateDirty('workflow');
			expect(uiStore.hasUnsavedWorkflowChanges).toBe(true);

			uiStore.markStateDirty('metadata');
			expect(uiStore.hasUnsavedWorkflowChanges).toBe(true);
		});
	});

	describe('markStateClean', () => {
		it('should mark state as clean', () => {
			const uiStore = useUIStore();

			uiStore.markStateDirty('workflow');
			expect(uiStore.stateIsDirty).toBe(true);

			uiStore.markStateClean();
			expect(uiStore.stateIsDirty).toBe(false);
		});

		it('should clear hasUnsavedWorkflowChanges when marking state clean', () => {
			const uiStore = useUIStore();

			uiStore.markStateDirty('workflow');
			expect(uiStore.hasUnsavedWorkflowChanges).toBe(true);

			uiStore.markStateClean();
			expect(uiStore.hasUnsavedWorkflowChanges).toBe(false);
		});
	});

	describe('modalsById', () => {
		const MODAL_KEY = 'someFeatureModal';

		it('should resolve an unregistered key to a closed state instead of undefined', () => {
			const uiStore = useUIStore();

			expect(uiStore.modalsById[MODAL_KEY]).toEqual({ open: false });
		});

		it('should resolve a registered key to the state it was registered with', () => {
			const uiStore = useUIStore();
			modalRegistry.register({
				key: MODAL_KEY,
				component: {},
				initialState: { open: false, mode: 'edit' },
			});

			expect(uiStore.modalsById[MODAL_KEY]).toEqual({ open: false, mode: 'edit' });
		});

		it('should reflect a key registered after the first read', () => {
			const uiStore = useUIStore();
			expect(uiStore.modalsById[MODAL_KEY].open).toBe(false);

			modalRegistry.register({
				key: MODAL_KEY,
				component: {},
				initialState: { open: true },
			});

			expect(uiStore.modalsById[MODAL_KEY].open).toBe(true);
		});

		it('should stop resolving a key once its definition is unregistered', () => {
			const uiStore = useUIStore();
			modalRegistry.register({
				key: MODAL_KEY,
				component: {},
				initialState: { open: false, mode: 'edit' },
			});
			expect(uiStore.modalsById[MODAL_KEY].mode).toBe('edit');

			modalRegistry.unregister(MODAL_KEY);

			expect(uiStore.modalsById[MODAL_KEY]).toEqual({ open: false });
		});

		it('should keep runtime state out of the definitions it resolves over', () => {
			const uiStore = useUIStore();
			modalRegistry.register({
				key: MODAL_KEY,
				component: {},
				initialState: { open: false, mode: 'edit' },
			});

			uiStore.openModalWithData({ name: MODAL_KEY, data: { foo: 'bar' } });

			// The definition's `mode` survives; only what was written is stored.
			expect(uiStore.modalsById[MODAL_KEY]).toEqual({
				open: true,
				mode: 'edit',
				data: { foo: 'bar' },
			});
			expect(uiStore.modalRuntimeStateById[MODAL_KEY]).toEqual({
				open: true,
				data: { foo: 'bar' },
			});
		});

		it('should materialize state lazily — an untouched modal has none', () => {
			const uiStore = useUIStore();
			modalRegistry.register({ key: MODAL_KEY, component: {} });

			expect(uiStore.modalRuntimeStateById).toEqual({});

			uiStore.openModal(MODAL_KEY);

			expect(Object.keys(uiStore.modalRuntimeStateById)).toEqual([MODAL_KEY]);
		});

		it('should open a key that was never registered', () => {
			const uiStore = useUIStore();
			// dataTable builds per-row keys at runtime, so registration cannot be mandatory.
			const perRowKey = `${MODAL_KEY}-row-42`;

			uiStore.openModal(perRowKey);

			expect(uiStore.modalsById[perRowKey].open).toBe(true);
			expect(uiStore.isModalActiveById[perRowKey]).toBe(true);

			uiStore.closeModal(perRowKey);

			expect(uiStore.modalsById[perRowKey].open).toBe(false);
		});

		it('should resolve shell-owned keys without anything registering them', () => {
			const uiStore = useUIStore();

			expect(uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY]).toMatchObject({
				open: false,
				mode: '',
				activeId: null,
			});
		});
	});

	describe('isModalActiveById', () => {
		const MODAL_KEY = 'someFeatureModal';

		it('should report an unregistered key as inactive instead of undefined', () => {
			const uiStore = useUIStore();

			expect(uiStore.isModalActiveById[MODAL_KEY]).toBe(false);
		});

		it('should still report only the topmost open modal as active', () => {
			const uiStore = useUIStore();

			uiStore.openModal('first');
			uiStore.openModal('second');

			expect(uiStore.isModalActiveById.second).toBe(true);
			expect(uiStore.isModalActiveById.first).toBe(false);
		});
	});

	describe('listenForModalChanges', () => {
		const MODAL_KEY = 'someFeatureModal';

		// Filters `$onAction` on literal action names, so it breaks silently — with no
		// type error — if opening or closing stops going through a store action.
		it('should still fire for open and close', () => {
			const uiStore = useUIStore();
			const onModalOpened = vi.fn();
			const onModalClosed = vi.fn();
			listenForModalChanges({ store: uiStore, onModalOpened, onModalClosed });

			uiStore.openModal(MODAL_KEY);
			expect(onModalOpened).toHaveBeenCalledWith(MODAL_KEY);

			uiStore.openModalWithData({ name: MODAL_KEY, data: {} });
			expect(onModalOpened).toHaveBeenCalledTimes(2);

			uiStore.closeModal(MODAL_KEY);
			expect(onModalClosed).toHaveBeenCalledWith(MODAL_KEY);
		});
	});
});
