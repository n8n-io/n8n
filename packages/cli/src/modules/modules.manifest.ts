import type { PackagedModules } from '@n8n/backend-common';
import { Container } from '@n8n/di';

/**
 * Backend modules that load from workspace packages instead of this directory.
 * Keep each import in a thunk so an ineligible module is not imported.
 */
export const packagedModules: PackagedModules = {
	'data-table': async () => await import('@n8n/backend-module-data-table/module'),
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
	'execution-limits': async () => await import('@n8n/backend-module-execution-limits/module'),
	'execution-ledger': async () => await import('@n8n/backend-module-execution-ledger/module'),
	'mcp-servers': async () => {
		const { McpServerToolAdapters } = await import('@n8n/backend-module-mcp-servers');
		const { WorkflowToolAdapter } = await import('./mcp-servers/workflow-tool.adapter.js');
		const { TextDraftAdapter } = await import('./mcp-servers/text-draft.adapter.js');
		const { OAuthClientNameAdapter } = await import('./mcp-servers/oauth-client-name.adapter.js');
		const { RefreshTokenAdapter } = await import('./mcp-servers/refresh-token.adapter.js');
		Container.set(McpServerToolAdapters, {
			resolve: () => ({
				workflows: Container.get(WorkflowToolAdapter),
				textDrafts: Container.get(TextDraftAdapter),
				clients: Container.get(OAuthClientNameAdapter),
				refreshTokens: Container.get(RefreshTokenAdapter),
			}),
		});
		return await import('@n8n/backend-module-mcp-servers/module');
	},
	'durable-leases': async () => await import('@n8n/backend-module-durable-leases/module'),
};
