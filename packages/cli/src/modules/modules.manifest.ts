import type { PackagedModules } from '@n8n/backend-common';

/**
 * Backend modules that load from workspace packages instead of this directory.
 * Keep each import in a thunk so an ineligible module is not imported.
 */
export const packagedModules: PackagedModules = {
	insights: async () => await import('@n8n/backend-module-insights/module'),
	'hello-world': async () => await import('@n8n/backend-module-hello-world/module'),
};
