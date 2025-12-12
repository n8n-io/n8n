import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Handles instance-level MCP access.
 * Runs MCP server and exposes endpoints for MCP clients to connect to.
 * Requires MCP access to be enabled in settings and a valid API key.
 */
@BackendModule({ name: 'mcp' })
export class McpModule implements ModuleInterface {
	async init() {
		await import('./mcp.controller');
		await import('./mcp.settings.controller');
		await import('./mcp.oauth.controller');
		await import('./mcp.auth.consent.controller');
		await import('./mcp.oauth-clients.controller');

		// Initialize event relay to handle workflow deactivation
		const { McpEventRelay } = await import('./mcp.event-relay');
		Container.get(McpEventRelay).init();
	}

	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 *
	 * The response shape will be `{ mcp: { mcpAccessEnabled: boolean } }`.
	 */
	async settings() {
		const { McpSettingsService } = await import('./mcp.settings.service');
		const mcpAccessEnabled = await Container.get(McpSettingsService).getEnabled();
		return { mcpAccessEnabled };
	}

	async entities() {
		const { OAuthClient } = await import('./database/entities/oauth-client.entity');
		const { AuthorizationCode } = await import(
			'./database/entities/oauth-authorization-code.entity'
		);
		const { AccessToken } = await import('./database/entities/oauth-access-token.entity');
		const { RefreshToken } = await import('./database/entities/oauth-refresh-token.entity');
		const { UserConsent } = await import('./database/entities/oauth-user-consent.entity');

		return [OAuthClient, AuthorizationCode, AccessToken, RefreshToken, UserConsent] as never;
	}

	@OnShutdown()
	async shutdown() {}
}
