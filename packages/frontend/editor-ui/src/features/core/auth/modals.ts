import type { ModalDefinition } from '@n8n/frontend-module-sdk';

import {
	CHANGE_PASSWORD_MODAL_KEY,
	CONFIRM_PASSWORD_MODAL_KEY,
	MFA_SETUP_MODAL_KEY,
	PROMPT_MFA_CODE_MODAL_KEY,
} from './auth.constants';

/** Phase 1 — registered eagerly; see `app/modals.manifest.ts` for why. */
export const AUTH_MODALS: ModalDefinition[] = [
	{
		key: CHANGE_PASSWORD_MODAL_KEY,
		component: async () => await import('./components/ChangePasswordModal.vue'),
		initialState: { open: false },
	},
	{
		key: CONFIRM_PASSWORD_MODAL_KEY,
		component: async () => await import('./components/ConfirmPasswordModal.vue'),
		initialState: { open: false },
	},
	{
		key: MFA_SETUP_MODAL_KEY,
		component: async () => await import('./components/MfaSetupModal.vue'),
		initialState: { open: false },
	},
	{
		key: PROMPT_MFA_CODE_MODAL_KEY,
		component: async () => await import('./components/PromptMfaCodeModal.vue'),
		initialState: { open: false },
	},
];
