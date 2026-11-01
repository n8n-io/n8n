import type { PackagedModules } from '@n8n/backend-common';
import { Container } from '@n8n/di';

/**
 * Backend modules that load from workspace packages instead of this directory.
 * Keep each import in a thunk so an ineligible module is not imported.
 */
export const packagedModules: PackagedModules = {
	insights: async () => await import('@n8n/backend-module-insights/module'),
	'quick-connect': async () => await import('@n8n/backend-module-quick-connect/module'),
	'workflow-builder': async () => await import('@n8n/backend-module-workflow-builder/module'),
	apps: async () => {
		const { AppSandboxSettings } = await import('@n8n/backend-module-apps');
		const { resolveAppSandboxConfig } = await import('./apps/sandbox-settings.js');
		Container.set(AppSandboxSettings, { resolve: resolveAppSandboxConfig });
		return await import('@n8n/backend-module-apps/module');
	},
};
