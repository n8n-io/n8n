import type { ApiKeyAudience } from '@n8n/api-types';

/**
 * Every JWT that n8n signs with its own secret, keyed by what the token is for.
 * The value becomes the token's `aud` claim, and `JwtService` derives it from
 * the purpose on both sign and verify — so a token minted for one purpose
 * cannot be presented for another.
 *
 * Add a purpose here to mint a new kind of token.
 *
 * The values that predate this registry are kept verbatim: they appear in
 * tokens that are already issued, and `public-api` / `mcp-server-api` are also
 * persisted in the `api_key.audience` column.
 */
export const TOKEN_PURPOSES = {
	session: 'n8n:session',
	invite: 'n8n:invite',
	passwordReset: 'n8n-password-reset',
	emailChange: 'n8n-email-change',
	oidcState: 'n8n:oidc-state',
	oidcNonce: 'n8n:oidc-nonce',
	oauthSession: 'n8n:oauth-session',
	tokenExchange: 'n8n:token-exchange',
	publicApiKey: 'public-api',
	mcpApiKey: 'mcp-server-api',
} as const satisfies Record<string, string> & {
	// Keep these two in step with the persisted `api_key.audience` values.
	publicApiKey: ApiKeyAudience;
	mcpApiKey: ApiKeyAudience;
};

export type TokenPurpose = keyof typeof TOKEN_PURPOSES;

/** Resolves the audience an API key is stored under to the purpose it was minted for. */
export const API_KEY_PURPOSES = {
	'public-api': 'publicApiKey',
	'mcp-server-api': 'mcpApiKey',
} as const satisfies Record<ApiKeyAudience, TokenPurpose>;

/**
 * Purposes whose tokens used to be minted without an `aud` claim. `JwtService`
 * still accepts an audience-less token for these, so an upgrade does not log
 * every user out or kill pending invite links.
 *
 * DEPRECATED: the v3 line drops this allowance. Do not add entries — a new
 * purpose has carried an audience from its first token.
 */
export const LEGACY_UNBOUND_PURPOSES: ReadonlySet<TokenPurpose> = new Set([
	'session',
	'invite',
	'oidcState',
	'oidcNonce',
	'oauthSession',
	'tokenExchange',
]);
