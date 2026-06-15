import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

/**
 * Shared OAuth 2.1 authorization server.
 *
 * Serves a single issuer (the instance origin) with shared
 * `/authorize`/`/token`/`/register`/`/revoke` endpoints and discovery
 * documents for the protected resources registered in the
 * `ProtectedResourceRegistry` (e.g. the instance MCP server).
 */
@BackendModule({ name: 'oauth-server', instanceTypes: ['main', 'webhook'] })
export class OAuthServerModule implements ModuleInterface {
	async init() {
		// Only import controllers in the main process, since the webhook process doesn't run an HTTP server and doesn't need them.
		if (Container.get(InstanceSettings).instanceType === 'main') {
			await import('./oauth.controller');
			await import('./oauth-consent.controller');
			await import('./oauth-clients.controller');
		}

		// Register the token service as the OAuth token verifier provider, so
		// protected-resource modules verify bearer tokens through the core
		// `OAuthTokenVerifierProxy` instead of importing this module.
		const { OAuthTokenVerifierProxy } = await import(
			'@/services/oauth-token-verifier-proxy.service'
		);
		const { OAuthTokenService } = await import('./oauth-token.service');
		Container.get(OAuthTokenVerifierProxy).registerProvider(Container.get(OAuthTokenService));

		const { WorkflowMcpTriggerResourceResolver } = await import(
			'./protected-resource-resolvers/workflow-mcp-trigger-resource.resolver'
		);
		Container.get(ProtectedResourceRegistry).registerResolver(
			Container.get(WorkflowMcpTriggerResourceResolver),
		);

		const { WorkflowMcpTestTriggerResourceResolver } = await import(
			'./protected-resource-resolvers/workflow-mcp-test-trigger-resource.resolver'
		);
		Container.get(ProtectedResourceRegistry).registerResolver(
			Container.get(WorkflowMcpTestTriggerResourceResolver),
		);
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
}
