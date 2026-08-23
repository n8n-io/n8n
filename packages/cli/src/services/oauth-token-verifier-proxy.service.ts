import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { OAuthResourceGrant } from 'n8n-workflow';

export type AuthFailureReason =
	| 'missing_authorization_header'
	| 'invalid_bearer_format'
	| 'jwt_decode_failed'
	| 'invalid_token'
	| 'token_not_found_in_db'
	| 'user_not_found'
	| 'user_id_not_in_auth_info'
	| 'unknown_error'
	| 'verifier_not_registered'
	| 'insufficient_scope';

export type Mcpauth_type = 'oauth' | 'api_key' | 'unknown';

export type TelemetryAuthContext = {
	reason: AuthFailureReason;
	auth_type: Mcpauth_type;
	error_details?: string;
};

export type UserWithContext = {
	user: User | null;
	actor?: User;
	context?: TelemetryAuthContext;
	authType?: Mcpauth_type;
	/** OAuth scopes granted to the token. `undefined` = not scope-bearing (e.g. API key) → full access. */
	scopes?: string[];
	/**
	 * Sealable form of the gate this call was admitted by, for callers that keep
	 * re-verifying after the resource stops resolving. Absent when the gate can't be
	 * expressed as a grant, or the call was rejected.
	 */
	grant?: OAuthResourceGrant;
};

/**
 * Contract for verifying OAuth access tokens issued by this instance's shared
 * OAuth server.
 */
export interface OAuthTokenVerifier {
	/**
	 * Verify an OAuth access token against the audiences of the protected
	 * resource identified by `expectedAudience` (its canonical resource URL),
	 * and resolve the token's user.
	 *
	 * `grant` is the gate sealed into an execution (see `OAuthResourceGrant`), consulted
	 * only when the resource no longer resolves. Callers verifying a live request must
	 * not pass it.
	 */
	verifyOAuthAccessToken(
		token: string,
		expectedAudience?: string,
		grant?: OAuthResourceGrant,
	): Promise<UserWithContext>;

	/**
	 * Re-take a sealed grant's `workflow:execute` decision for `userId`, without the token.
	 * Used by the sealed-identity credential path to keep the check live: a caller whose
	 * execute access was revoked after the identity was sealed must stop resolving. Returns
	 * `false` when the user is gone/disabled or lacks the access the grant requires.
	 */
	authorizeSealedGrant(userId: string, grant: OAuthResourceGrant): Promise<boolean>;
}

/**
 * Proxy through which protected-resource modules (e.g. instance MCP) verify
 * bearer tokens without importing the `oauth-server` module directly.
 *
 * The `oauth-server` module registers its token service as the provider on
 * init — same pattern as `RuntimeCredentialProxyService` /
 * `DynamicCredentialsProxy`. Until a provider is registered (e.g. the module
 * was disabled via env), verification fails gracefully.
 */
@Service()
export class OAuthTokenVerifierProxy implements OAuthTokenVerifier {
	private provider: OAuthTokenVerifier | null = null;

	registerProvider(provider: OAuthTokenVerifier): void {
		this.provider = provider;
	}

	async verifyOAuthAccessToken(
		token: string,
		expectedAudience?: string,
		grant?: OAuthResourceGrant,
	): Promise<UserWithContext> {
		if (!this.provider) {
			return {
				user: null,
				context: {
					reason: 'verifier_not_registered',
					auth_type: 'oauth',
					error_details: 'No OAuth token verifier is registered on this instance',
				},
			};
		}
		return await this.provider.verifyOAuthAccessToken(token, expectedAudience, grant);
	}

	async authorizeSealedGrant(userId: string, grant: OAuthResourceGrant): Promise<boolean> {
		// Fail closed: with no verifier registered there is nothing to re-authorize against.
		if (!this.provider) {
			return false;
		}
		return await this.provider.authorizeSealedGrant(userId, grant);
	}
}
