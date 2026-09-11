import { type FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { CONTEXT_MODALS } from './modals';

/**
 * Carries the preference modal only. The shell's modal catalogue is ratcheted
 * closed, so a modal registers through its own feature instead.
 *
 * The routes and the sidebar entry stay with the shell on purpose: both would be
 * gated on a backend module of this id being active, and preferences have no
 * backend module. Move them here once one exists.
 */
export const ContextModule: FrontendModuleDescription = {
	id: 'context',
	name: 'Context',
	description: 'Reusable preferences for the n8n assistant and connected AI tools',
	icon: 'brain',
	modals: CONTEXT_MODALS,
};
