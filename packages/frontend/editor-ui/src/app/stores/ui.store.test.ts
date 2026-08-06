import { createPinia, setActivePinia } from 'pinia';
import { useUIStore } from '@/app/stores/ui.store';

describe('UI Store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
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

	describe('modalStateById', () => {
		const MODAL_KEY = 'someFeatureModal';

		it('should resolve an unregistered key to a closed state instead of undefined', () => {
			const uiStore = useUIStore();
			uiStore.modalsById = {};

			expect(uiStore.modalStateById[MODAL_KEY]).toEqual({ open: false });
		});

		it('should return the stored state for a registered key', () => {
			const uiStore = useUIStore();
			uiStore.modalsById = {};
			uiStore.registerModal(MODAL_KEY, { open: false, mode: 'edit' });

			expect(uiStore.modalStateById[MODAL_KEY]).toEqual({ open: false, mode: 'edit' });
		});

		it('should reflect a key registered after the first read', () => {
			const uiStore = useUIStore();
			uiStore.modalsById = {};
			expect(uiStore.modalStateById[MODAL_KEY].open).toBe(false);

			uiStore.registerModal(MODAL_KEY, { open: true });

			expect(uiStore.modalStateById[MODAL_KEY].open).toBe(true);
		});
	});

	describe('isModalActiveById', () => {
		const MODAL_KEY = 'someFeatureModal';

		it('should report an unregistered key as inactive instead of undefined', () => {
			const uiStore = useUIStore();
			uiStore.modalsById = {};

			expect(uiStore.isModalActiveById[MODAL_KEY]).toBe(false);
		});

		it('should still report only the topmost open modal as active', () => {
			const uiStore = useUIStore();
			uiStore.modalsById = {};
			uiStore.registerModal('first');
			uiStore.registerModal('second');

			uiStore.openModal('first');
			uiStore.openModal('second');

			expect(uiStore.isModalActiveById.second).toBe(true);
			expect(uiStore.isModalActiveById.first).toBe(false);
		});
	});
});
