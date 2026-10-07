import { modalRegistry, type ModalDefinition } from '@n8n/frontend-module-sdk';

import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODALS } from '@/experiments/exposeAllWorkflowsToMcp/modals';
import { MCP_JSON_NUDGE_MODALS } from '@/experiments/mcpJsonNudge/modals';
import { SURFACE_MCP_TO_NEW_CLOUD_USERS_MODALS } from '@/experiments/surfaceMcpToNewCloudUsers/modals';
import { AUTH_MODALS } from '@/features/core/auth/modals';

/**
 * Modals registered eagerly, pre-mount — the phase-1 half of modal registration.
 *
 * A modal belongs here when it can be opened on a path that never reaches the
 * post-login registration in `app/init/index.ts`: an unauthenticated route,
 * preview/demo mode, or a navigation that throws before it (the
 * `MfaRequiredError` redirect still renders Personal Settings). Everything else
 * registers post-login: module modals through their descriptor, experiment modals
 * through `registerExperimentModals()`.
 */
const eagerModals: ModalDefinition[] = [...AUTH_MODALS];

export const registerEagerModals = () => {
	eagerModals.forEach((modalDef) => {
		modalRegistry.register(modalDef);
	});
};

/**
 * Experiment modals, registered post-login next to the module modals. Experiments
 * read PostHog, so they stay in the shell instead of in a module descriptor.
 *
 * The lists are module-level consts: this runs again on every login, and the
 * registry compares definition identity, so a rebuilt array would warn.
 */
const experimentModals: ModalDefinition[][] = [
	SURFACE_MCP_TO_NEW_CLOUD_USERS_MODALS,
	EXPOSE_ALL_WORKFLOWS_TO_MCP_MODALS,
	MCP_JSON_NUDGE_MODALS,
];

export const registerExperimentModals = () => {
	experimentModals.flat().forEach((modalDef) => {
		modalRegistry.register(modalDef);
	});
};
