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
		await import('./mcp.controller');
		await import('./mcp.settings.controller');

		// Register the instance MCP server as a protected resource of the shared
		// OAuth server, so its tokens are minted and verified with the right
		// audiences and its discovery metadata is served.
		const { ProtectedResourceRegistry } = await import('@/services/protected-resource.registry');
		const { McpProtectedResource } = await import('./mcp-protected-resource');
		Container.get(ProtectedResourceRegistry).register(Container.get(McpProtectedResource));
	}

	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 *
	 * The response shape will be `{ mcp: { mcpAccessEnabled: boolean, mcpManagedByEnv: boolean } }`.
	 */
	async settings() {
		const { McpSettingsService } = await import('./mcp.settings.service');
		const mcpAccessEnabled = await Container.get(McpSettingsService).getEnabled();
		const { mcpManagedByEnv } = Container.get(InstanceSettingsLoaderConfig);
		return { mcpAccessEnabled, mcpManagedByEnv };
	}

	@OnShutdown()
	async shutdown() {}
}
