import { APP_URL_SCHEME } from '../../shared/constants';

/**
 * Single source of truth for the OAuth client. The flow is discovery-driven
 * (RFC 8414), so endpoints are never hardcoded — only the values intrinsic to
 * this desktop app live here. These mirror the backend's seeded first-party
 * client (see `McpOAuthConfig` / the personal-automation `oauth-e2e.md` spec).
 */
export const OAUTH_CONFIG = {
	/** RFC 8414 authorization-server metadata path, appended to the instance base URL. */
	discoveryPath: '/.well-known/oauth-authorization-server',

	/**
	 * Seeded first-party public client id. No Dynamic Client Registration: the
	 * backend pre-seeds this client, so we ship a stable id.
	 */
	clientId: 'n8n-app',

	/**
	 * Custom-scheme redirect the OS routes back to this app. The backend client's
	 * registered `redirectUris` must contain this exact string (matched verbatim),
	 * so the seeded `n8n-app` client needs `n8n://callback` registered for it.
	 */
	redirectUri: `${APP_URL_SCHEME}://callback`,

	/**
	 * Scopes requested at sign-in. The server grants `requested ∩ the user's real
	 * permissions` and stamps the result into the token's `scope` claim.
	 * `instanceAi:gateway` is what gates the local-gateway endpoints.
	 */
	scopes: [
		'instanceAi:gateway',
		'instanceAi:message',
		'workflow:read',
		'workflow:execute',
		// Read-only insights, for the History tab's "Time saved" panel (/insights/summary).
		'insights:list',
	],
} as const;
