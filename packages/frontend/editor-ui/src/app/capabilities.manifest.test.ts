import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { registerShellCapabilities } from './capabilities.manifest';

import { ABOUT_MODAL_KEY } from '@/app/constants/modals';
import { useUIStore } from '@/app/stores/ui.store';

describe('registerShellCapabilities', () => {
	beforeEach(() => {
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
});
