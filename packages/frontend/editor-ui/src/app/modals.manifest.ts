import { modalRegistry, type ModalDefinition } from '@n8n/frontend-module-sdk';

import { AUTH_MODALS } from '@/features/core/auth/modals';
import { EXECUTION_QUOTA_MODALS } from '@/features/settings/security/modals';

/**
 * Modals registered eagerly, pre-mount — the phase-1 half of modal registration.
 *
 * A modal belongs here when it can be opened on a path that never reaches the
 * post-login registration in `app/init/index.ts`: an unauthenticated route,
 * preview/demo mode, or a navigation that throws before it (the
 * `MfaRequiredError` redirect still renders Personal Settings). Everything else
 * is module-owned and registers post-login through its descriptor.
 *
 * `EXECUTION_QUOTA_MODALS` is the one exception: it is post-login-only, but
 * `security/` (like `apiKeys/`) is a shell-owned settings page with no
 * `FrontendModuleDescription` to register it through post-login, so it is
 * registered here instead rather than growing the (frozen) shell catalogue in
 * `stores/defaults/modals.ts`.
 */
const eagerModals: ModalDefinition[] = [...AUTH_MODALS, ...EXECUTION_QUOTA_MODALS];

export const registerEagerModals = () => {
	eagerModals.forEach((modalDef) => {
		modalRegistry.register(modalDef);
	});
};
