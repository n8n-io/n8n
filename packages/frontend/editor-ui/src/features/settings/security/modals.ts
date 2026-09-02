import type { ModalDefinition } from '@n8n/frontend-module-sdk';

import { EXECUTION_QUOTA_EDIT_MODAL_KEY } from './executionQuota.constants';

/**
 * `security/` is a shell-owned settings page (registered directly in
 * `app/router.ts`, no `FrontendModuleDescription`), so it has no
 * `module.descriptor.ts` of its own to hang a `modals` field off. Registered
 * eagerly from `app/modals.manifest.ts` instead — see the comment there.
 */
export const EXECUTION_QUOTA_MODALS: ModalDefinition[] = [
	{
		key: EXECUTION_QUOTA_EDIT_MODAL_KEY,
		component: async () => await import('./ExecutionQuotaEditModal.vue'),
		initialState: { open: false },
	},
];
