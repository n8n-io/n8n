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
 * Unlike `modules.manifest.ts` these are not descriptors — an always-on feature
 * has no module id, routes or settings pages to contribute, only modals.
 */
const eagerModals: ModalDefinition[] = [...AUTH_MODALS];

/**
 * Initialize always-on modals, done in main.ts beside `registerModuleRoutes` so
 * they are present on first paint.
 */
export const registerEagerModals = () => {
	eagerModals.forEach((modalDef) => {
		modalRegistry.register(modalDef);
	});
};
