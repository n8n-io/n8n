import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Handles instance-level MCP access.
 * Runs MCP server and exposes endpoints for MCP clients to connect to.
 * Requires MCP access to be enabled in settings and a valid API key or an
 * OAuth token issued by the shared `oauth-server` module.
 */
@BackendModule({ name: 'mcp', instanceTypes: ['main'] })
export class McpModule implements ModuleInterface {
	async init() {
		await import('./mcp.controller.js');
		await import('./mcp.settings.controller.js');
		if (process.env.NODE_ENV !== 'production' && process.env.N8N_NODE_MCP_POC_ENABLED === 'true') {
			await import('../node-mcp-poc/node-mcp-poc.controller.js');
			const { NodeMcpPocRegistry } = await import(
				'../node-mcp-poc/json-schema/node-mcp-poc.registry.js'
			);
			Container.get(NodeMcpPocRegistry).initialize();
			const { VisibleActionCatalogRegistry } = await import(
				'../node-mcp-poc/action-lookup/visible-action-catalog.js'
			);
			Container.get(VisibleActionCatalogRegistry).initialize();
		}

		// Register the instance MCP server as a protected resource of the shared
		// OAuth server, so its tokens are minted and verified with the right
		// audiences and its discovery metadata is served.
		const { ProtectedResourceRegistry } = await import('@/services/protected-resource.registry.js');
		const { McpProtectedResource } = await import('./mcp-protected-resource.js');
		Container.get(ProtectedResourceRegistry).register(Container.get(McpProtectedResource));
	}

	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 *
	 * The response shape will be
	 * `{ mcp: { mcpAccessEnabled: boolean, mcpManagedByEnv: boolean, serverUrl: string } }`.
	 */
	async settings() {
		const { McpSettingsService } = await import('./mcp.settings.service.js');
		const { McpProtectedResource } = await import('./mcp-protected-resource.js');
		const mcpAccessEnabled = await Container.get(McpSettingsService).getEnabled();
		const { mcpManagedByEnv } = Container.get(InstanceSettingsLoaderConfig);
		// Canonical resource URL, so the UI shows the URL clients must actually
		// use when a dedicated MCP base URL is configured.
		const serverUrl = Container.get(McpProtectedResource).getResourceUrl();
		return { mcpAccessEnabled, mcpManagedByEnv, serverUrl };
	}

	@OnShutdown()
	async shutdown() {}
}
