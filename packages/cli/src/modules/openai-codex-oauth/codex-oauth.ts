import { UnexpectedError, UserError } from 'n8n-workflow';

import { OPENAI_CODEX_OAUTH } from './openai-codex-oauth.constants';

export interface CodexCredentials {
	accessToken: string;
	refreshToken: string;
	/** Epoch milliseconds. */
	expiresAt: number;
	accountId: string;
	/** Data-residency region, when the workspace enforces one. */
	residency?: string;
}

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
 * requests whose `chatgpt-account-id` header does not match the token.
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
 * workspaces answer 401 unless the matching header is sent, even when the token
 * is otherwise valid.
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

export function buildAuthorizationUrl(options: {
	state: string;
	codeChallenge: string;
	redirectUri?: string;
}): string {
	const url = new URL(OPENAI_CODEX_OAUTH.authorizeUrl);
	const params: Record<string, string> = {
		response_type: 'code',
		client_id: OPENAI_CODEX_OAUTH.clientId,
		redirect_uri: options.redirectUri ?? OPENAI_CODEX_OAUTH.redirectUri,
		scope: OPENAI_CODEX_OAUTH.scope,
		code_challenge: options.codeChallenge,
		code_challenge_method: 'S256',
		state: options.state,
		id_token_add_organizations: 'true',
		codex_cli_simplified_flow: 'true',
		// The authorization server expects the same client identity the API
		// requests carry, so keep this aligned with the `originator` header.
		originator: OPENAI_CODEX_OAUTH.originator,
	};
	for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
	return url.toString();
}

/**
 * Accepts whatever the user pasted back: a full redirect URL, a bare query
 * string, or the authorization code on its own.
 */
export function parseAuthorizationInput(input: string): { code?: string; state?: string } {
	const value = input.trim();
	if (!value) return {};

	try {
		const url = new URL(value);
		return {
			code: url.searchParams.get('code') ?? undefined,
			state: url.searchParams.get('state') ?? undefined,
		};
	} catch {
		// Not a URL — fall through to the query-string and bare-code forms.
	}

	const query = value.includes('?') ? value.slice(value.indexOf('?') + 1) : value;
	const params = new URLSearchParams(query);
	if (params.has('code')) {
		return {
			code: params.get('code') ?? undefined,
			state: params.get('state') ?? undefined,
		};
	}

	return { code: value };
}

function normalizeTokenResponse(body: unknown): CodexCredentials {
	if (!isCodexTokenResponse(body)) {
		throw new UnexpectedError('OpenAI returned an unexpected Codex token response.');
	}

	const accountId = accountIdFromAccessToken(body.access_token);
	if (!accountId) {
		throw new UnexpectedError('The Codex access token carries no ChatGPT account identifier.');
	}

	const residency = residencyFromAccessToken(body.access_token);

	return {
		accessToken: body.access_token,
		refreshToken: body.refresh_token,
		expiresAt: Date.now() + body.expires_in * 1000,
		accountId,
		...(residency ? { residency } : {}),
	};
}

type FetchLike = typeof fetch;

async function postForm(
	values: Record<string, string>,
	fetchFn: FetchLike,
): Promise<CodexCredentials> {
	const response = await fetchFn(OPENAI_CODEX_OAUTH.tokenUrl, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams(values),
	});

	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		// A rejected code or a rotated-away refresh token cannot be retried.
		if (response.status === 400 || response.status === 401) {
			throw new UserError(
				'OpenAI rejected the Codex authorization. Start the connection again to sign in.',
				{ level: 'warning' },
			);
		}
		throw new UnexpectedError(
			`Codex token request failed (${response.status}): ${detail || response.statusText}`,
		);
	}

	return normalizeTokenResponse(await response.json());
}

export async function exchangeAuthorizationCode(
	options: { code: string; verifier: string; redirectUri?: string },
	fetchFn: FetchLike = fetch,
): Promise<CodexCredentials> {
	return await postForm(
		{
			grant_type: 'authorization_code',
			client_id: OPENAI_CODEX_OAUTH.clientId,
			code: options.code,
			code_verifier: options.verifier,
			redirect_uri: options.redirectUri ?? OPENAI_CODEX_OAUTH.redirectUri,
		},
		fetchFn,
	);
}

/**
 * Refreshes access. OpenAI rotates the refresh token on every call, so the
 * whole result must replace the stored credentials atomically.
 */
export async function refreshCredentials(
	refreshToken: string,
	fetchFn: FetchLike = fetch,
): Promise<CodexCredentials> {
	return await postForm(
		{
			grant_type: 'refresh_token',
			client_id: OPENAI_CODEX_OAUTH.clientId,
			refresh_token: refreshToken,
		},
		fetchFn,
	);
}
