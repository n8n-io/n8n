import { createPinia, setActivePinia } from 'pinia';
import { modalRegistry } from '@n8n/frontend-module-sdk';

import type { ModalState } from '@/Interface';
import {
	IMPORT_CURL_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
} from '@/app/constants';
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
			expect(uiStore.modalStateById[MODAL_KEY]).toEqual({
				open: true,
				data: { foo: 'bar' },
			});
		});

		it('should materialize state lazily — an untouched modal has none', () => {
			const uiStore = useUIStore();
			modalRegistry.register({ key: MODAL_KEY, component: {} });

			expect(uiStore.modalStateById).toEqual({});

			uiStore.openModal(MODAL_KEY);

			expect(Object.keys(uiStore.modalStateById)).toEqual([MODAL_KEY]);
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

		// Runtime state is scoped to the lifetime of the definition it accumulated
		// under. Registered keys and ad-hoc ones are told apart by the registry
		// itself: only a key that was in it can be taken out of it.
		describe('when a definition is unregistered', () => {
			const register = (initialState?: ModalState) =>
				modalRegistry.register({ key: MODAL_KEY, component: {}, initialState });

			it('should forget the runtime state that accumulated under it', () => {
				const uiStore = useUIStore();
				register({ open: false, mode: 'edit' });
				uiStore.openModalWithData({ name: MODAL_KEY, data: { secret: 'shhh' } });

				modalRegistry.unregister(MODAL_KEY);

				expect(uiStore.modalsById[MODAL_KEY]).toEqual({ open: false });
				expect(uiStore.modalStateById[MODAL_KEY]).toBeUndefined();
			});

			it('should not reopen with stale data when the key is registered again', () => {
				const uiStore = useUIStore();
				register({ open: false, mode: 'edit' });
				uiStore.openModalWithData({ name: MODAL_KEY, data: { secret: 'shhh' } });

				modalRegistry.unregister(MODAL_KEY);
				register({ open: false, mode: 'edit' });

				expect(uiStore.modalsById[MODAL_KEY]).toEqual({ open: false, mode: 'edit' });
			});

			it('should drop it from the modal stack so nothing counts as open', () => {
				const uiStore = useUIStore();
				register();
				uiStore.openModal(MODAL_KEY);
				expect(uiStore.isAnyModalOpen).toBe(true);

				modalRegistry.unregister(MODAL_KEY);

				expect(uiStore.isAnyModalOpen).toBe(false);
				expect(uiStore.isModalActiveById[MODAL_KEY]).toBe(false);
			});

			it('should leave an ad-hoc key alone — it never had a definition to lose', () => {
				const uiStore = useUIStore();
				// dataTable's per-row keys are opened without ever being registered, so
				// nothing about them may hinge on the registry.
				const perRowKey = `${MODAL_KEY}-row-42`;
				register();
				uiStore.openModalWithData({ name: perRowKey, data: { rowId: '42' } });

				modalRegistry.unregister(MODAL_KEY);
				modalRegistry.clear();

				expect(uiStore.modalsById[perRowKey]).toEqual({ open: true, data: { rowId: '42' } });
				expect(uiStore.isModalActiveById[perRowKey]).toBe(true);
			});

			it('should leave shell-owned keys alone when the registry empties', () => {
				const uiStore = useUIStore();
				uiStore.openModal(CREDENTIAL_EDIT_MODAL_KEY);

				modalRegistry.clear();

				expect(uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY].open).toBe(true);
			});
		});

		// The shell catalogue is a module-level constant shared by every store
		// instance. What the store resolves must never be a reference into it, or one
		// session's writes reach the next.
		describe('isolation from the shell catalogue', () => {
			it('should not hand out state that writes through to the next store instance', () => {
				const first = useUIStore();
				const handedOut = first.modalsById[IMPORT_CURL_MODAL_KEY].data as {
					curlCommands: Record<string, string>;
				};

				handedOut.curlCommands['node-1'] = 'curl https://leaked.example';

				setActivePinia(createPinia());
				expect(useUIStore().modalsById[IMPORT_CURL_MODAL_KEY].data).toEqual({ curlCommands: {} });
			});

			it('should give two instances independent state for the same key', () => {
				const first = useUIStore();
				first.openModalWithData({
					name: IMPORT_CURL_MODAL_KEY,
					data: { curlCommands: { a: 'b' } },
				});

				setActivePinia(createPinia());
				expect(useUIStore().modalsById[IMPORT_CURL_MODAL_KEY].open).toBe(false);
			});
		});

		// A modal clears its own data on close so the next open starts fresh
		// (`InstanceAiToolsConnectionModalWrapper`). For a key with a definition, what
		// this resolves is a copy — so the write has to go through the store, and an
		// in-place one is discarded the next time the derivation runs. That is silent
		// in the same tick, which is how the clear-on-close broke unnoticed.
		describe('clearing data for the next open', () => {
			const OWNED_KEY = INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY;

			it('should clear it for good when the write goes through the store', () => {
				const uiStore = useUIStore();
				uiStore.openModalWithData({ name: OWNED_KEY, data: { connectionId: 'conn-1' } });
				uiStore.closeModal(OWNED_KEY);

				uiStore.setModalData({ name: OWNED_KEY, data: {} });
				uiStore.openModal(OWNED_KEY);

				expect(uiStore.modalsById[OWNED_KEY].data).toEqual({});
			});

			it('should discard a write made in place onto what it resolves', () => {
				const uiStore = useUIStore();
				uiStore.openModalWithData({ name: OWNED_KEY, data: { connectionId: 'conn-1' } });
				uiStore.closeModal(OWNED_KEY);

				uiStore.modalsById[OWNED_KEY].data = {};
				uiStore.openModal(OWNED_KEY);

				expect(uiStore.modalsById[OWNED_KEY].data).toEqual({ connectionId: 'conn-1' });
			});

			// An ad-hoc key has no definition to resolve against, so it is the runtime
			// entry itself rather than a copy of it — the same expression, a different
			// write semantic. Pinned so the divergence is a decision, not a discovery.
			it('should let an in-place write through for a key with no definition', () => {
				const uiStore = useUIStore();
				const perRowKey = `${MODAL_KEY}-row-42`;
				uiStore.openModalWithData({ name: perRowKey, data: { rowId: '42' } });

				uiStore.modalsById[perRowKey].data = {};
				uiStore.openModal(perRowKey);

				expect(uiStore.modalsById[perRowKey].data).toEqual({});
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

		const listen = () => {
			const onModalOpened = vi.fn();
			const onModalClosed = vi.fn();
			const stop = listenForModalChanges({
				store: useUIStore(),
				onModalOpened,
				onModalClosed,
			});
			return { onModalOpened, onModalClosed, stop };
		};

		it('should fire for open and close', () => {
			const uiStore = useUIStore();
			const { onModalOpened, onModalClosed } = listen();

			uiStore.openModal(MODAL_KEY);
			expect(onModalOpened).toHaveBeenCalledWith(MODAL_KEY);

			uiStore.closeModal(MODAL_KEY);
			expect(onModalClosed).toHaveBeenCalledWith(MODAL_KEY);
		});

		// The reason this is derived from state rather than filtered on action names:
		// every path that closes a modal has to be observable, and the sweep is one.
		it('should fire when a modal closes because its definition was unregistered', () => {
			const uiStore = useUIStore();
			modalRegistry.register({ key: MODAL_KEY, component: {} });
			const { onModalClosed } = listen();
			uiStore.openModal(MODAL_KEY);

			modalRegistry.unregister(MODAL_KEY);

			expect(onModalClosed).toHaveBeenCalledWith(MODAL_KEY);
		});

		it('should report each modal in a stack separately', () => {
			const uiStore = useUIStore();
			const { onModalOpened, onModalClosed } = listen();

			uiStore.openModal('first');
			uiStore.openModal('second');
			expect(onModalOpened.mock.calls).toEqual([['first'], ['second']]);

			uiStore.closeModal('first');
			uiStore.closeModal('second');
			expect(onModalClosed.mock.calls).toEqual([['first'], ['second']]);
		});

		it('should stop listening when the returned handle is called', () => {
			const uiStore = useUIStore();
			const { onModalOpened, stop } = listen();

			stop();
			uiStore.openModal(MODAL_KEY);

			expect(onModalOpened).not.toHaveBeenCalled();
		});

		// Consumers act on close: settling a connect attempt, replacing the route,
		// emitting a selection. Twice is a duplicate side effect, zero is a hang — so
		// the count is the assertion, not just that it fired.
		describe('exactly once', () => {
			it('should fire once per open and once per close', () => {
				const uiStore = useUIStore();
				const { onModalOpened, onModalClosed } = listen();

				uiStore.openModal(MODAL_KEY);
				uiStore.closeModal(MODAL_KEY);

				expect(onModalOpened).toHaveBeenCalledTimes(1);
				expect(onModalClosed).toHaveBeenCalledTimes(1);
			});

			it('should fire once for openModalWithData, not once per inner action', () => {
				const uiStore = useUIStore();
				const { onModalOpened } = listen();

				uiStore.openModalWithData({ name: MODAL_KEY, data: { foo: 'bar' } });

				expect(onModalOpened).toHaveBeenCalledTimes(1);
			});

			// Two callers can open the credential modal, putting the key on the stack
			// twice; one close then takes both off. That is one modal opening once and
			// closing once, or `useMcpServerConnect` connects the same credential twice.
			it('should treat a key opened twice as one modal opening and closing once', () => {
				const uiStore = useUIStore();
				const { onModalOpened, onModalClosed } = listen();

				uiStore.openModal(MODAL_KEY);
				uiStore.openModal(MODAL_KEY);

				expect(onModalOpened).toHaveBeenCalledTimes(1);

				uiStore.closeModal(MODAL_KEY);

				expect(onModalClosed).toHaveBeenCalledTimes(1);
			});

			it('should notify every listener once when a key opened twice closes', () => {
				const uiStore = useUIStore();
				const first = listen();
				const second = listen();

				uiStore.openModal(MODAL_KEY);
				uiStore.openModal(MODAL_KEY);
				uiStore.closeModal(MODAL_KEY);

				expect(first.onModalClosed).toHaveBeenCalledTimes(1);
				expect(second.onModalClosed).toHaveBeenCalledTimes(1);
			});

			it('should fire once when the definition is unregistered while open', () => {
				const uiStore = useUIStore();
				modalRegistry.register({ key: MODAL_KEY, component: {} });
				const { onModalClosed } = listen();
				uiStore.openModal(MODAL_KEY);

				modalRegistry.unregister(MODAL_KEY);

				expect(onModalClosed).toHaveBeenCalledTimes(1);
			});

			it('should not fire for closing a modal that is not open', () => {
				const uiStore = useUIStore();
				const { onModalClosed } = listen();

				uiStore.closeModal(MODAL_KEY);

				expect(onModalClosed).not.toHaveBeenCalled();
			});

			it('should not fire again for a second close of the same modal', () => {
				const uiStore = useUIStore();
				const { onModalClosed } = listen();
				uiStore.openModal(MODAL_KEY);

				uiStore.closeModal(MODAL_KEY);
				uiStore.closeModal(MODAL_KEY);

				expect(onModalClosed).toHaveBeenCalledTimes(1);
			});
		});
	});
});
