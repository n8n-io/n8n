import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestHelper,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

/**
 * OAuth parameters for the Codex client, mirroring the Codex CLI.
 *
 * This is deliberately NOT built on `oAuth2Api`: that base type derives its
 * redirect URI from the n8n instance URL, while this authorization server only
 * accepts the fixed loopback URI below. The connect flow therefore lives in its
 * own backend module, and this credential only stores and refreshes the result.
 */
export const OPENAI_CODEX_OAUTH = {
	clientId: 'app_EMoamEEZ73f0CkXaXp7hrann',
	authorizeUrl: 'https://auth.openai.com/oauth/authorize',
	tokenUrl: 'https://auth.openai.com/oauth/token',
	redirectUri: 'http://localhost:1455/auth/callback',
	scope: 'openid profile email offline_access',
	/** JWT claim holding the ChatGPT account id Codex requires as a header. */
	accountClaim: 'https://api.openai.com/auth',
	/** Codex speaks the OpenAI Responses API, not /v1/chat/completions. */
	baseUrl: 'https://chatgpt.com/backend-api/codex',
	/** Client identity Codex expects; an unrecognized value is refused with 403. */
	originator: 'codex_cli_rs',
} as const;

/** Refresh this many ms before the recorded expiry, to absorb clock skew. */
const EXPIRY_SKEW_MS = 60_000;

interface CodexTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
}

function isCodexTokenResponse(value: unknown): value is CodexTokenResponse {
	if (typeof value !== 'object' || value === null) return false;
	const body = value as Record<string, unknown>;
	return (
		typeof body.access_token === 'string' &&
		typeof body.refresh_token === 'string' &&
		typeof body.expires_in === 'number' &&
		Number.isFinite(body.expires_in)
	);
}

/**
 * Reads the ChatGPT account id out of the access token's claims. Codex rejects
 * requests that omit the matching `chatgpt-account-id` header.
 */
function authClaims(accessToken: string): Record<string, unknown> | null {
	const payload = accessToken.split('.')[1];
	if (!payload) return null;
	try {
		const claims: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		if (typeof claims !== 'object' || claims === null) return null;
		const auth = (claims as Record<string, unknown>)[OPENAI_CODEX_OAUTH.accountClaim];
		if (typeof auth !== 'object' || auth === null) return null;
		return auth as Record<string, unknown>;
	} catch {
		return null;
	}
}

export function accountIdFromAccessToken(accessToken: string): string | null {
	const accountId = authClaims(accessToken)?.chatgpt_account_id;
	return typeof accountId === 'string' && accountId ? accountId : null;
}

/**
 * Reads the workspace's data-residency requirement. Residency-enforced
 * workspaces answer 401 unless the matching header is sent.
 */
export function residencyFromAccessToken(accessToken: string): string | null {
	const claims = authClaims(accessToken);
	if (!claims) return null;
	for (const key of ['chatgpt_data_residency', 'chatgpt_compute_residency']) {
		const value = claims[key];
		if (typeof value === 'string' && value.trim()) return value.trim();
	}
	return null;
}

export class OpenAiCodexOAuthApi implements ICredentialType {
	name = 'openAiCodexOAuthApi';

	displayName = 'OpenAI Codex OAuth';

	documentationUrl = 'openai';

	properties: INodeProperties[] = [
		{
			displayName:
				'Sign in with your ChatGPT account to use Codex. This connects a ChatGPT subscription rather than an OpenAI API key, so it only reaches Codex — not the standard OpenAI endpoints such as embeddings or image generation.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			// Marked expirable so n8n re-runs `preAuthentication` when it is empty or
			// the API answers with an auth error. See CredentialsHelper.preAuthentication.
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'hidden',
			typeOptions: {
				expirable: true,
			},
			default: '',
		},
		{
			displayName: 'Refresh Token',
			name: 'refreshToken',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Expires At',
			name: 'expiresAt',
			type: 'hidden',
			default: 0,
		},
		{
			displayName: 'Account ID',
			name: 'accountId',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Residency',
			name: 'residency',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			default: OPENAI_CODEX_OAUTH.baseUrl,
			description: 'Override the default base URL for the Codex API',
		},
	];

	/**
	 * Exchanges the rotating refresh token for a fresh access token.
	 *
	 * n8n persists whatever this returns, which is what keeps the rotation safe:
	 * OpenAI issues a NEW refresh token on every call, so the old one must be
	 * replaced atomically or the connection is lost.
	 */
	async preAuthentication(
		this: IHttpRequestHelper,
		credentials: ICredentialDataDecryptedObject,
	): Promise<ICredentialDataDecryptedObject> {
		const refreshToken = credentials.refreshToken;
		if (typeof refreshToken !== 'string' || !refreshToken) {
			throw new Error(
				'This Codex credential is not connected yet. Use the Connect button to sign in with your ChatGPT account.',
			);
		}

		let response: unknown;
		try {
			response = await this.helpers.httpRequest({
				method: 'POST',
				url: OPENAI_CODEX_OAUTH.tokenUrl,
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					client_id: OPENAI_CODEX_OAUTH.clientId,
					refresh_token: refreshToken,
				}).toString(),
				json: true,
			});
		} catch (error) {
			const status =
				typeof error === 'object' && error !== null
					? (error as { response?: { statusCode?: number } }).response?.statusCode
					: undefined;
			// A rotated-away or revoked refresh token cannot be recovered by retrying.
			if (status === 400 || status === 401) {
				throw new Error(
					'The Codex connection has expired or been revoked. Reconnect this credential to sign in again.',
				);
			}
			throw new Error(
				`Could not refresh the Codex access token${status ? ` (HTTP ${status})` : ''}.`,
			);
		}

		if (!isCodexTokenResponse(response)) {
			throw new Error(
				'OpenAI returned an unexpected token response while refreshing Codex access.',
			);
		}

		const accountId = accountIdFromAccessToken(response.access_token);
		if (!accountId) {
			throw new Error('The refreshed Codex access token carries no ChatGPT account identifier.');
		}

		const residency = residencyFromAccessToken(response.access_token);

		return {
			...credentials,
			accessToken: response.access_token,
			refreshToken: response.refresh_token,
			expiresAt: Date.now() + response.expires_in * 1000,
			accountId,
			...(residency ? { residency } : {}),
		};
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers ??= {};
		requestOptions.headers.Authorization = `Bearer ${credentials.accessToken as string}`;

		if (typeof credentials.accountId === 'string' && credentials.accountId) {
			requestOptions.headers['chatgpt-account-id'] = credentials.accountId;
		}
		// Residency-enforced workspaces answer 401 without this.
		if (typeof credentials.residency === 'string' && credentials.residency) {
			requestOptions.headers['x-openai-internal-codex-residency'] = credentials.residency;
		}
		// Codex refuses an unrecognized originator with 403.
		requestOptions.headers.originator = OPENAI_CODEX_OAUTH.originator;
		// The Codex Responses route is gated behind this beta opt-in.
		requestOptions.headers['OpenAI-Beta'] = 'responses=experimental';

		return requestOptions;
	}
}

/** Whether the stored access token is missing or within the refresh skew window. */
export function isCodexAccessTokenExpired(credentials: ICredentialDataDecryptedObject): boolean {
	if (typeof credentials.accessToken !== 'string' || !credentials.accessToken) return true;
	const expiresAt = credentials.expiresAt;
	if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return true;
	return expiresAt - EXPIRY_SKEW_MS <= Date.now();
}
