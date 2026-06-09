import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Handles instance-level MCP access.
 * Runs MCP server and exposes endpoints for MCP clients to connect to.
 * Requires MCP access to be enabled in settings and a valid API key.
 */
@BackendModule({ name: 'mcp', instanceTypes: ['main'] })
export class McpModule implements ModuleInterface {
	async init() {
		await import('./mcp.controller.js');
		await import('./mcp.settings.controller.js');
		await import('./mcp.oauth.controller.js');
		await import('./mcp.auth.consent.controller.js');
		await import('./mcp.oauth-clients.controller.js');
	}

	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 *
	 * The response shape will be `{ mcp: { mcpAccessEnabled: boolean, mcpManagedByEnv: boolean } }`.
	 */
	async settings() {
		const { McpSettingsService } = await import('./mcp.settings.service.js');
		const mcpAccessEnabled = await Container.get(McpSettingsService).getEnabled();
		const { mcpManagedByEnv } = Container.get(InstanceSettingsLoaderConfig);
		return { mcpAccessEnabled, mcpManagedByEnv };
	}

	async entities() {
		const { OAuthClient } = await import('./database/entities/oauth-client.entity.js');
		const { AuthorizationCode } = await import(
			'./database/entities/oauth-authorization-code.entity.js'
		);
		const { AccessToken } = await import('./database/entities/oauth-access-token.entity.js');
		const { RefreshToken } = await import('./database/entities/oauth-refresh-token.entity.js');
		const { UserConsent } = await import('./database/entities/oauth-user-consent.entity.js');

		return [OAuthClient, AuthorizationCode, AccessToken, RefreshToken, UserConsent] as never;
	}

	@OnShutdown()
	async shutdown() {}
}
