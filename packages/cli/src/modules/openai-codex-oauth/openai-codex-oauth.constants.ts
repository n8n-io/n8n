/**
 * OAuth parameters for the Codex client, mirroring the Codex CLI.
 *
 * Kept in sync by hand with `OpenAiCodexOAuthApi.credentials.ts` in
 * `n8n-nodes-base`: `cli` has no TypeScript import path into that package, and
 * a deep import would cross a package boundary the repo deliberately keeps shut.
 */
export const OPENAI_CODEX_OAUTH = {
	clientId: 'app_EMoamEEZ73f0CkXaXp7hrann',
	authorizeUrl: 'https://auth.openai.com/oauth/authorize',
	tokenUrl: 'https://auth.openai.com/oauth/token',
	redirectUri: 'http://localhost:1455/auth/callback',
	scope: 'openid profile email offline_access',
	accountClaim: 'https://api.openai.com/auth',
	/** Client identity sent both on the authorize URL and as the API header. */
	originator: 'codex_cli_rs',
} as const;

/** The credential type this module connects. */
export const CODEX_CREDENTIAL_TYPE = 'openAiCodexOAuthApi';

/** Loopback callback the authorization server is registered against. */
export const CALLBACK_HOST_CANDIDATES = ['127.0.0.1', '::1'] as const;
export const CALLBACK_PORT = 1455;
export const CALLBACK_PATH = '/auth/callback';

/** How long an in-flight authorization may stay pending, in seconds. */
export const FLOW_TTL_SECONDS = 300;

export const CACHE_KEY_PREFIX = 'openai-codex-oauth';
