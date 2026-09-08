import { modalRegistry, type ModalDefinition } from '@n8n/frontend-module-sdk';

import { AUTH_MODALS } from '@/features/core/auth/modals';

/**
 * Modals registered eagerly, pre-mount — the phase-1 half of modal registration.
 *
 * A modal belongs here when it can be opened on a path that never reaches the
 * post-login registration in `app/init/index.ts`: an unauthenticated route,
 * preview/demo mode, or a navigation that throws before it (the
 * `MfaRequiredError` redirect still renders Personal Settings). Everything else
 * is module-owned and registers post-login through its descriptor.
 *
 * Every entry must be a spread of a fragment imported from `src/features/**`. A
 * definition that lives in the shell gives the shell back a modal key that the
 * extraction gives up. `n8n-local-rules/no-shell-resident-eager-modal` rejects one.
 */
const eagerModals: ModalDefinition[] = [...AUTH_MODALS];

export const registerEagerModals = () => {
	eagerModals.forEach((modalDef) => {
		modalRegistry.register(modalDef);
	});
};
