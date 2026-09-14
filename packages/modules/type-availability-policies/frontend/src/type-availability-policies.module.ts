import { defineFrontendModule } from '@n8n/frontend-module-sdk';

import { TYPE_AVAILABILITY_POLICIES_MODULE_ID } from './type-availability-policies.constants';

/**
 * Store-only for now: the module declares no surface, so registering it changes nothing a
 * user sees. GOV-56 adds `routes` and `settingsPages`; GOV-49 fills the store.
 *
 * Keep this file import-light — types, the SDK and plain constants only. The shell's
 * `modules.manifest.ts` runs every descriptor body before `app.use(pinia)`, so a store read
 * here would run with no active Pinia. Views must load lazily when GOV-56 adds them.
 *
 * The SDK also types `commands`, `locales`, `shortcuts`, `banners` and `setup`, but no host
 * in the shell reads them yet (CAT-3685). A value in one of those fields does nothing.
 */
export const TypeAvailabilityPoliciesModule = defineFrontendModule({
	// Must match the backend module id: both gate off `settings.activeModules`.
	id: TYPE_AVAILABILITY_POLICIES_MODULE_ID,
	name: 'Type Availability Policies',
	description: 'Reports which node types a project can use, and why a type is unavailable',
	icon: 'shield',
});
