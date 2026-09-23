import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { registerShellCapabilities } from './capabilities.manifest';

import { ABOUT_MODAL_KEY } from '@/app/constants/modals';
import { useUIStore } from '@/app/stores/ui.store';
import { useExistingWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

const { openDocumentStores } = vi.hoisted(() => ({
	openDocumentStores: new Map<string, { mergeSettings: ReturnType<typeof vi.fn> }>(),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useExistingWorkflowDocumentStore: vi.fn((id: string) => openDocumentStores.get(id)),
	createWorkflowDocumentId: (id: string) => id,
}));

describe('registerShellCapabilities', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
	});

	// Only here, never in `beforeEach`: the first test must read the registry as the
	// import of the manifest left it, so a `provide()` at its module scope fails it.
	afterEach(() => {
		capabilityRegistry.clear();
	});

	it('leaves the modal openers unprovided until it is called', () => {
		expect(capabilityRegistry.has(capabilities.modalOpeners)).toBe(false);
	});

	it('provides the modal openers', () => {
		registerShellCapabilities();

		expect(capabilityRegistry.has(capabilities.modalOpeners)).toBe(true);
	});

	it('forwards openModal to the UI store', () => {
		registerShellCapabilities();
		const uiStore = useUIStore();

		capabilityRegistry.use(capabilities.modalOpeners).openModal(ABOUT_MODAL_KEY);

		expect(uiStore.openModal).toHaveBeenCalledWith(ABOUT_MODAL_KEY);
	});

	it('forwards openModalWithData to the UI store', () => {
		registerShellCapabilities();
		const uiStore = useUIStore();
		const payload = { name: ABOUT_MODAL_KEY, data: { source: 'test' } };

		capabilityRegistry.use(capabilities.modalOpeners).openModalWithData(payload);

		expect(uiStore.openModalWithData).toHaveBeenCalledWith(payload);
	});

	// Dev HMR re-evaluates the manifest, so a second registration must not warn. The
	// module-level opener object keeps the identity stable across the replay.
	it('stays silent when it is called again', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		registerShellCapabilities();
		registerShellCapabilities();

		expect(warn).not.toHaveBeenCalled();
	});

	describe('workflowMcpAccessSync', () => {
		let workflowsListStore: ReturnType<typeof useWorkflowsListStore>;

		const seedListEntry = (id: string, settings?: { availableInMCP: boolean }) => {
			workflowsListStore.workflowsById = {
				[id]: { id, name: id, ...(settings ? { settings } : {}) },
			} as unknown as typeof workflowsListStore.workflowsById;
		};

		beforeEach(() => {
			openDocumentStores.clear();
			registerShellCapabilities();
			workflowsListStore = useWorkflowsListStore();
		});

		it('provides the sync capability', () => {
			expect(capabilityRegistry.has(capabilities.workflowMcpAccessSync)).toBe(true);
		});

		it('patches availableInMCP on an existing list entry', () => {
			seedListEntry('wf-1', { availableInMCP: false });

			capabilityRegistry.use(capabilities.workflowMcpAccessSync)(['wf-1'], true);

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(true);
		});

		it('creates the settings object on a list entry that has none', () => {
			seedListEntry('wf-1');

			capabilityRegistry.use(capabilities.workflowMcpAccessSync)(['wf-1'], true);

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(true);
		});

		it('leaves the list store alone for an unknown id', () => {
			seedListEntry('wf-1', { availableInMCP: false });

			capabilityRegistry.use(capabilities.workflowMcpAccessSync)(['wf-unknown'], true);

			expect(workflowsListStore.workflowsById['wf-1'].settings?.availableInMCP).toBe(false);
			expect(workflowsListStore.workflowsById['wf-unknown']).toBeUndefined();
		});

		it('merges the new value only into open document stores', () => {
			const openStore = { mergeSettings: vi.fn() };
			const otherOpenStore = { mergeSettings: vi.fn() };
			openDocumentStores.set('wf-1', openStore);
			openDocumentStores.set('wf-3', otherOpenStore);

			capabilityRegistry.use(capabilities.workflowMcpAccessSync)(['wf-1', 'wf-2'], false);

			expect(openStore.mergeSettings).toHaveBeenCalledTimes(1);
			expect(openStore.mergeSettings).toHaveBeenCalledWith({ availableInMCP: false });
			expect(otherOpenStore.mergeSettings).not.toHaveBeenCalled();
			expect(useExistingWorkflowDocumentStore).toHaveBeenCalledWith('wf-2');
		});
	});
});
