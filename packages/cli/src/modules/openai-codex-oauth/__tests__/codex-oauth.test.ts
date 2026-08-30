import {
	accountIdFromAccessToken,
	buildAuthorizationUrl,
	exchangeAuthorizationCode,
	parseAuthorizationInput,
	refreshCredentials,
	residencyFromAccessToken,
} from '../codex-oauth';
import { OPENAI_CODEX_OAUTH } from '../openai-codex-oauth.constants';

function makeAccessToken(claims: Record<string, unknown>): string {
	const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
	return `header.${payload}.signature`;
}

const ACCOUNT_ID = 'acc_98765';
const validToken = makeAccessToken({
	[OPENAI_CODEX_OAUTH.accountClaim]: { chatgpt_account_id: ACCOUNT_ID },
});

function jsonResponse(body: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: 'x',
		json: async () => body,
		text: async () => JSON.stringify(body),
	} as unknown as Response;
}

describe('codex-oauth', () => {
	describe('accountIdFromAccessToken', () => {
		it('reads the account id from the token claims', () => {
			expect(accountIdFromAccessToken(validToken)).toBe(ACCOUNT_ID);
		});

		it.each([
			['a malformed token', 'nope'],
			['an unparsable payload', 'a.!!!.c'],
			['a missing claim', makeAccessToken({ sub: 'u' })],
		])('returns null for %s', (_label, token) => {
			expect(accountIdFromAccessToken(token)).toBeNull();
		});
	});

	describe('residencyFromAccessToken', () => {
		it('reads an enforced data residency', () => {
			const token = makeAccessToken({
				[OPENAI_CODEX_OAUTH.accountClaim]: {
					chatgpt_account_id: ACCOUNT_ID,
					chatgpt_data_residency: 'us',
				},
			});

			expect(residencyFromAccessToken(token)).toBe('us');
		});

		it('falls back to the compute residency claim', () => {
			const token = makeAccessToken({
				[OPENAI_CODEX_OAUTH.accountClaim]: { chatgpt_compute_residency: 'eu' },
			});

			expect(residencyFromAccessToken(token)).toBe('eu');
		});

		it('returns null when the workspace enforces none', () => {
			expect(residencyFromAccessToken(validToken)).toBeNull();
		});
	});

	describe('buildAuthorizationUrl', () => {
		it('carries PKCE, state and the fixed loopback redirect', () => {
			const url = new URL(buildAuthorizationUrl({ state: 'st4te', codeChallenge: 'ch4llenge' }));

			expect(url.origin + url.pathname).toBe(OPENAI_CODEX_OAUTH.authorizeUrl);
			expect(Object.fromEntries(url.searchParams)).toMatchObject({
				response_type: 'code',
				client_id: OPENAI_CODEX_OAUTH.clientId,
				redirect_uri: OPENAI_CODEX_OAUTH.redirectUri,
				code_challenge: 'ch4llenge',
				code_challenge_method: 'S256',
				state: 'st4te',
				// The authorization server expects the same identity the API headers carry.
				originator: OPENAI_CODEX_OAUTH.originator,
			});
		});
	});

	describe('parseAuthorizationInput', () => {
		it('extracts code and state from a full redirect URL', () => {
			expect(
				parseAuthorizationInput('http://localhost:1455/auth/callback?code=abc&state=xyz'),
			).toEqual({ code: 'abc', state: 'xyz' });
		});

		it('extracts them from a bare query string', () => {
			expect(parseAuthorizationInput('code=abc&state=xyz')).toEqual({
				code: 'abc',
				state: 'xyz',
			});
		});

		it('treats an opaque value as the code itself', () => {
			expect(parseAuthorizationInput('  just-a-code  ')).toEqual({ code: 'just-a-code' });
		});

		it('returns nothing for empty input', () => {
			expect(parseAuthorizationInput('   ')).toEqual({});
		});
	});

	describe('exchangeAuthorizationCode', () => {
		it('posts the verifier and normalizes the token response', async () => {
			const fetchFn = vi
				.fn()
				.mockResolvedValue(
					jsonResponse({ access_token: validToken, refresh_token: 'r2', expires_in: 3600 }),
				);
			const before = Date.now();

			const result = await exchangeAuthorizationCode(
				{ code: 'the-code', verifier: 'the-verifier' },
				fetchFn,
			);

			const [url, init] = fetchFn.mock.calls[0];
			expect(url).toBe(OPENAI_CODEX_OAUTH.tokenUrl);
			expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
				grant_type: 'authorization_code',
				client_id: OPENAI_CODEX_OAUTH.clientId,
				code: 'the-code',
				code_verifier: 'the-verifier',
				redirect_uri: OPENAI_CODEX_OAUTH.redirectUri,
			});
			expect(result.accessToken).toBe(validToken);
			expect(result.accountId).toBe(ACCOUNT_ID);
			expect(result.expiresAt).toBeGreaterThanOrEqual(before + 3_600_000);
		});

		it.each([400, 401])('reports a rejected authorization on %i', async (status) => {
			const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ error: 'bad' }, status));

			await expect(
				exchangeAuthorizationCode({ code: 'c', verifier: 'v' }, fetchFn),
			).rejects.toThrow(/rejected the Codex authorization/);
		});

		it('surfaces a server-side failure distinctly', async () => {
			const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, 503));

			await expect(
				exchangeAuthorizationCode({ code: 'c', verifier: 'v' }, fetchFn),
			).rejects.toThrow(/Codex token request failed \(503\)/);
		});

		it('rejects a token without an account id', async () => {
			const fetchFn = vi.fn().mockResolvedValue(
				jsonResponse({
					access_token: makeAccessToken({ sub: 'u' }),
					refresh_token: 'r',
					expires_in: 60,
				}),
			);

			await expect(
				exchangeAuthorizationCode({ code: 'c', verifier: 'v' }, fetchFn),
			).rejects.toThrow(/no ChatGPT account identifier/);
		});

		it('rejects a malformed token response', async () => {
			const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ access_token: validToken }));

			await expect(
				exchangeAuthorizationCode({ code: 'c', verifier: 'v' }, fetchFn),
			).rejects.toThrow(/unexpected Codex token response/);
		});
	});

	describe('refreshCredentials', () => {
		it('sends the refresh grant and returns the rotated token', async () => {
			const fetchFn = vi
				.fn()
				.mockResolvedValue(
					jsonResponse({ access_token: validToken, refresh_token: 'rotated', expires_in: 3600 }),
				);

			const result = await refreshCredentials('old-refresh', fetchFn);

			expect(Object.fromEntries(fetchFn.mock.calls[0][1].body as URLSearchParams)).toEqual({
				grant_type: 'refresh_token',
				client_id: OPENAI_CODEX_OAUTH.clientId,
				refresh_token: 'old-refresh',
			});
			// The rotated token must be surfaced, or the next refresh fails.
			expect(result.refreshToken).toBe('rotated');
		});
	});
});
