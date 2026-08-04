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
// Loaded on workers too: in queue mode an MCP trigger tool call executes on a
// worker, where resolving the caller's private credentials verifies the n8n
// OAuth token through `OAuthTokenVerifierProxy`. Without the module the verifier
// provider is unregistered and resolution fails with `verifier_not_registered`.
@BackendModule({ name: 'oauth-server', instanceTypes: ['main', 'webhook', 'worker'] })
export class OAuthServerModule implements ModuleInterface {
	async init() {
		// Only import controllers in the main process, since the webhook/worker processes don't run an HTTP server and don't need them.
		if (Container.get(InstanceSettings).instanceType === 'main') {
			await import('./oauth.controller.js');
			await import('./oauth-consent.controller.js');
			await import('./oauth-clients.controller.js');

			// Demo-only seed so the client_credentials → MCP curl proof needs no manual
			// DB insert. ponytail: hackathon convenience — off unless the env flag is set;
			// remove once the credential-creation flow is the normal path.
			if (process.env.N8N_SEED_DEMO_SERVICE_ACCOUNT === 'true') {
				await this.seedDemoServiceAccount();
			}
		}

		// Register the token service as the OAuth token verifier provider, so
		// protected-resource modules verify bearer tokens through the core
		// `OAuthTokenVerifierProxy` instead of importing this module.
		const { OAuthTokenVerifierProxy } = await import(
			'@/services/oauth-token-verifier-proxy.service.js'
		);
		const { OAuthTokenService } = await import('./oauth-token.service.js');
		Container.get(OAuthTokenVerifierProxy).registerProvider(Container.get(OAuthTokenService));

		const { registerProtectedResourceResolvers } = await import(
			'./protected-resource-resolvers/index.js'
		);
		registerProtectedResourceResolvers();

		// Register the public API as a protected resource and its OAuth auth strategy
		// into the public API auth chain. Registering the resource is what lets the
		// token verifier accept service-account tokens whose `aud` is the public-API
		// URL. The strategy runs after ApiKeyAuthStrategy (which abstains for OAuth
		// bearer tokens).
		const { ProtectedResourceRegistry } = await import('@/services/protected-resource.registry.js');
		const { PublicApiProtectedResource } = await import(
			'@/public-api/public-api-protected-resource.js'
		);
		Container.get(ProtectedResourceRegistry).register(Container.get(PublicApiProtectedResource));

		const { AuthStrategyRegistry } = await import('@/services/auth-strategy.registry.js');
		const { PublicApiOAuthStrategy } = await import('@/services/public-api-oauth.strategy.js');
		Container.get(AuthStrategyRegistry).register(Container.get(PublicApiOAuthStrategy));

		const { OAuth2FlowProxy } = await import('@/services/oauth2-flow-proxy.service.js');
		const { OAuth2FlowService } = await import('./oauth-flow.service.js');
		Container.get(OAuth2FlowProxy).registerProvider(Container.get(OAuth2FlowService));
	}

	/**
	 * Demo/hackathon helper: inserts a fixed `demo-client` / `demo-secret`
	 * service-account credential owned by the instance owner so the
	 * client_credentials → MCP curl proof needs no manual seeding. No-op if the
	 * row already exists or no owner is set up. Never enable in production.
	 */
	private async seedDemoServiceAccount() {
		const { UserRepository, ServiceAccountCredentialRepository, GLOBAL_OWNER_ROLE } = await import(
			'@n8n/db'
		);
		const { PasswordUtility } = await import('@/services/password.utility.js');
		const { Logger } = await import('@n8n/backend-common');
		const logger = Container.get(Logger);

		const DEMO_CLIENT_ID = 'demo-client';
		const DEMO_CLIENT_SECRET = 'demo-secret';

		const credentials = Container.get(ServiceAccountCredentialRepository);
		if (await credentials.findByClientId(DEMO_CLIENT_ID, {})) {
			logger.info(
				`Demo service-account credential '${DEMO_CLIENT_ID}' already exists; skipping seed`,
			);
			return;
		}

		const owner = await Container.get(UserRepository).findOne({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
		});
		if (!owner) {
			logger.warn('No instance owner found; skipping demo service-account seed');
			return;
		}

		const clientSecret = await Container.get(PasswordUtility).hash(DEMO_CLIENT_SECRET);
		await credentials.insertCredential(
			{
				userId: owner.id,
				credentialType: 'client_secret',
				clientId: DEMO_CLIENT_ID,
				clientSecret,
			},
			{},
		);
		logger.info(
			`Seeded demo service-account credential: client_id='${DEMO_CLIENT_ID}' client_secret='${DEMO_CLIENT_SECRET}' (owner ${owner.email})`,
		);
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
}
