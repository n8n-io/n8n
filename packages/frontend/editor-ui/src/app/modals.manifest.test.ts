import { createPinia, setActivePinia } from 'pinia';
import { modalRegistry } from '@n8n/frontend-module-sdk';

import { registerEagerModals } from '@/app/modals.manifest';
import { useUIStore } from '@/app/stores/ui.store';
import {
	CHANGE_PASSWORD_MODAL_KEY,
	CONFIRM_PASSWORD_MODAL_KEY,
	MFA_SETUP_MODAL_KEY,
	PROMPT_MFA_CODE_MODAL_KEY,
} from '@/features/core/auth/auth.constants';

/** Phase 1 — see `app/modals.manifest.ts` for why these cannot wait for login. */
const AUTH_MODAL_KEYS = [
	CHANGE_PASSWORD_MODAL_KEY,
	CONFIRM_PASSWORD_MODAL_KEY,
	MFA_SETUP_MODAL_KEY,
	PROMPT_MFA_CODE_MODAL_KEY,
];

describe('registerEagerModals', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		modalRegistry.clear();
	});

	it.each(AUTH_MODAL_KEYS)('registers %s without waiting for login', (modalKey) => {
		expect(modalRegistry.has(modalKey)).toBe(false);

		registerEagerModals();

		expect(modalRegistry.has(modalKey)).toBe(true);
	});

	it('gives every eager modal a lazy component, so registering one loads nothing', () => {
		registerEagerModals();

		for (const modalKey of AUTH_MODAL_KEYS) {
			expect(typeof modalRegistry.get(modalKey)?.component).toBe('function');
		}
	});

	it('makes the auth modals resolvable through the store, closed', () => {
		const uiStore = useUIStore();

		registerEagerModals();

		for (const modalKey of AUTH_MODAL_KEYS) {
			expect(uiStore.modalsById[modalKey]).toEqual({ open: false });
		}
	});

	it('does not warn when opening a modal it registered', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const uiStore = useUIStore();
		registerEagerModals();

		uiStore.openModal(PROMPT_MFA_CODE_MODAL_KEY);

		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it('warns when an auth modal is opened before registration ran', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const uiStore = useUIStore();

		uiStore.openModal(PROMPT_MFA_CODE_MODAL_KEY);

		expect(warn).toHaveBeenCalledWith(expect.stringContaining(PROMPT_MFA_CODE_MODAL_KEY));
		warn.mockRestore();
	});
});
