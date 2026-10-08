import { UrlService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import {
	JwkSchema,
	LocalAuthorizationServer,
	type AuthorizationServerMetadata,
	type Jwk,
} from '@n8n/inbound-auth';

import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';

import { OAuthSigningJwksProvider } from './oauth-signing-jwks.provider';

/**
 * The controller serves this document over HTTP. Discovery reads the same document in process,
 * so the issuer is the same in both places.
 */
@Service()
export class OAuthServerLocalAuthorizationServer extends LocalAuthorizationServer {
	constructor(
		private readonly urlService: UrlService,
		private readonly resourceRegistry: ProtectedResourceRegistry,
		private readonly jwksProvider: OAuthSigningJwksProvider,
	) {
		super();
	}

	/**
	 * Single RFC 8414 authorization-server metadata document, shared by all
	 * protected resources: one issuer (the instance origin), one set of
	 * endpoints, one signing key.
	 *
	 * Keeps advertising the legacy `/mcp-oauth/*` endpoint paths — clients that
	 * registered via DCR persist these URLs, so changing them would strand
	 * every already-connected client.
	 */
	async getMetadata(): Promise<AuthorizationServerMetadata> {
		const baseUrl = this.urlService.getInstanceBaseUrl();
		const allScopes = this.resourceRegistry.getAllScopes();
		const metadata: AuthorizationServerMetadata = {
			issuer: baseUrl,
			authorization_endpoint: `${baseUrl}/mcp-oauth/authorize`,
			token_endpoint: `${baseUrl}/mcp-oauth/token`,
			registration_endpoint: `${baseUrl}/mcp-oauth/register`,
			revocation_endpoint: `${baseUrl}/mcp-oauth/revoke`,
			// RFC 8414 §2: public keys that verify the access tokens this server signs.
			jwks_uri: this.urlService.getInstanceJwksUri(),
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
			code_challenge_methods_supported: ['S256'],
			// RFC 9207: we include the `iss` parameter on authorization responses
			authorization_response_iss_parameter_supported: true,
		};

		if (allScopes.length > 0) {
			metadata.scopes_supported = allScopes;
		}

		return metadata;
	}

	/** The `sig` keys of the published JWKS: the active key and the retired keys still in grace. */
	async getJwks(): Promise<{ keys: Jwk[] }> {
		return { keys: JwkSchema.array().parse(await this.jwksProvider.getPublicJwks()) };
	}
}
