import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { McpOAuthTokenVerifier } from '@n8n/n8n-nodes-langchain/mcp/core';

import { UrlService } from '@/services/url.service';

/**
 * Handles instance-level MCP access.
 * Runs MCP server and exposes endpoints for MCP clients to connect to.
 * Requires MCP access to be enabled in settings and a valid API key.
 */
@BackendModule({ name: 'mcp', instanceTypes: ['main'] })
export class McpModule implements ModuleInterface {
	async init() {
		await import('./mcp.controller');
		await import('./mcp.settings.controller');
		await import('./mcp.oauth.controller');
		await import('./mcp.auth.consent.controller');
		await import('./mcp.oauth-clients.controller');

		const { McpOAuthTokenService } = await import('./mcp-oauth-token.service');
		const tokenService = Container.get(McpOAuthTokenService);
		const urlService = Container.get(UrlService);
		Container.set(McpOAuthTokenVerifier, {
			verifyAccessToken: async (token: string) => await tokenService.verifyAccessToken(token),
			getProtectedResourceMetadataUrl: () =>
				`${urlService.getInstanceBaseUrl()}/.well-known/oauth-protected-resource/mcp-server/http`,
		});
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
