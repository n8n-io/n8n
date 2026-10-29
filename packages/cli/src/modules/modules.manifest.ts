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
		const { AppSandboxSettings, AppBindingAdapters } = await import('@n8n/backend-module-apps');
		const { resolveAppSandboxConfig } = await import('./apps/sandbox-settings.js');
		const { AppDataTableAdapter } = await import('./apps/bindings/app-data-table.adapter.js');
		const { AppWorkflowAdapter } = await import('./apps/bindings/app-workflow.adapter.js');
		const { AppAgentAdapter } = await import('./apps/bindings/app-agent.adapter.js');
		Container.set(AppSandboxSettings, { resolve: resolveAppSandboxConfig });
		Container.set(AppBindingAdapters, {
			resolve: () => ({
				dataTables: Container.get(AppDataTableAdapter),
				workflows: Container.get(AppWorkflowAdapter),
				agents: Container.get(AppAgentAdapter),
			}),
		});
		return await import('@n8n/backend-module-apps/module');
	},
};
