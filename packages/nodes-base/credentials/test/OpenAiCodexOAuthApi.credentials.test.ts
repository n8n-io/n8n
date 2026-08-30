import type {
	ICredentialDataDecryptedObject,
	IHttpRequestHelper,
	IHttpRequestOptions,
} from 'n8n-workflow';

import {
	OpenAiCodexOAuthApi,
	accountIdFromAccessToken,
	isCodexAccessTokenExpired,
	residencyFromAccessToken,
	OPENAI_CODEX_OAUTH,
} from '../OpenAiCodexOAuthApi.credentials';

/** Builds an unsigned JWT carrying the given claims, as the account id is read from the payload. */
function makeAccessToken(claims: Record<string, unknown>): string {
	const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
	return `header.${payload}.signature`;
}

const ACCOUNT_ID = 'acc_12345';
const validToken = makeAccessToken({
	[OPENAI_CODEX_OAUTH.accountClaim]: { chatgpt_account_id: ACCOUNT_ID },
});

describe('OpenAiCodexOAuthApi Credential', () => {
	const credential = new OpenAiCodexOAuthApi();
	const httpRequest = vi.fn();
	const helpers = { helpers: { httpRequest } } as unknown as IHttpRequestHelper;

	beforeEach(() => {
		httpRequest.mockReset();
	});

	describe('accountIdFromAccessToken', () => {
		it('reads the ChatGPT account id from the token claims', () => {
			expect(accountIdFromAccessToken(validToken)).toBe(ACCOUNT_ID);
		});

		it.each([
			['a malformed token', 'not-a-jwt'],
			['a token with an unparsable payload', 'header.!!!notbase64json!!!.signature'],
			['a token without the auth claim', makeAccessToken({ sub: 'user' })],
			[
				'a token whose claim lacks an account id',
				makeAccessToken({ [OPENAI_CODEX_OAUTH.accountClaim]: {} }),
			],
		])('returns null for %s', (_label, token) => {
			expect(accountIdFromAccessToken(token)).toBeNull();
		});
	});

	describe('residencyFromAccessToken', () => {
		it('reads an enforced data residency', () => {
			const token = makeAccessToken({
				[OPENAI_CODEX_OAUTH.accountClaim]: { chatgpt_data_residency: 'us' },
			});

			expect(residencyFromAccessToken(token)).toBe('us');
		});

		it('returns null when the workspace enforces none', () => {
			expect(residencyFromAccessToken(validToken)).toBeNull();
		});
	});

	describe('isCodexAccessTokenExpired', () => {
		it('treats a missing access token as expired', () => {
			expect(isCodexAccessTokenExpired({ expiresAt: Date.now() + 3_600_000 })).toBe(true);
		});

		it('treats a missing expiry as expired', () => {
			expect(isCodexAccessTokenExpired({ accessToken: validToken })).toBe(true);
		});

		it('is false for a token valid well beyond the skew window', () => {
			expect(
				isCodexAccessTokenExpired({ accessToken: validToken, expiresAt: Date.now() + 3_600_000 }),
			).toBe(false);
		});

		it('is true inside the skew window, before the nominal expiry', () => {
			expect(
				isCodexAccessTokenExpired({ accessToken: validToken, expiresAt: Date.now() + 30_000 }),
			).toBe(true);
		});
	});

	describe('preAuthentication', () => {
		const connected: ICredentialDataDecryptedObject = {
			accessToken: 'stale-token',
			refreshToken: 'refresh-1',
			expiresAt: 1,
			accountId: ACCOUNT_ID,
			url: OPENAI_CODEX_OAUTH.baseUrl,
		};

		it('exchanges the refresh token and returns the rotated credentials', async () => {
			httpRequest.mockResolvedValue({
				access_token: validToken,
				refresh_token: 'refresh-2',
				expires_in: 3600,
			});
			const before = Date.now();

			const result = await credential.preAuthentication.call(helpers, connected);

			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({ method: 'POST', url: OPENAI_CODEX_OAUTH.tokenUrl }),
			);
			const body = String(httpRequest.mock.calls[0][0].body);
			expect(Object.fromEntries(new URLSearchParams(body))).toEqual({
				grant_type: 'refresh_token',
				client_id: OPENAI_CODEX_OAUTH.clientId,
				refresh_token: 'refresh-1',
			});

			expect(result.accessToken).toBe(validToken);
			// The rotated refresh token must replace the old one, or the next refresh fails.
			expect(result.refreshToken).toBe('refresh-2');
			expect(result.accountId).toBe(ACCOUNT_ID);
			expect(Number(result.expiresAt)).toBeGreaterThanOrEqual(before + 3_600_000);
		});

		it('preserves unrelated stored fields such as a custom base URL', async () => {
			httpRequest.mockResolvedValue({
				access_token: validToken,
				refresh_token: 'refresh-2',
				expires_in: 3600,
			});

			const result = await credential.preAuthentication.call(helpers, {
				...connected,
				url: 'https://proxy.internal/codex',
			});

			expect(result.url).toBe('https://proxy.internal/codex');
		});

		it('asks the user to connect when no refresh token is stored', async () => {
			await expect(credential.preAuthentication.call(helpers, {})).rejects.toThrow(
				/not connected yet/,
			);
			expect(httpRequest).not.toHaveBeenCalled();
		});

		it.each([400, 401])(
			'reports a revoked connection when OpenAI answers %i',
			async (statusCode) => {
				httpRequest.mockRejectedValue({ response: { statusCode } });

				await expect(credential.preAuthentication.call(helpers, connected)).rejects.toThrow(
					/expired or been revoked/,
				);
			},
		);

		it('surfaces a transient failure without claiming the connection is revoked', async () => {
			httpRequest.mockRejectedValue({ response: { statusCode: 503 } });

			await expect(credential.preAuthentication.call(helpers, connected)).rejects.toThrow(
				/Could not refresh the Codex access token \(HTTP 503\)/,
			);
		});

		it('rejects a token response missing required fields', async () => {
			httpRequest.mockResolvedValue({ access_token: validToken });

			await expect(credential.preAuthentication.call(helpers, connected)).rejects.toThrow(
				/unexpected token response/,
			);
		});

		it('rejects a refreshed token that carries no account id', async () => {
			httpRequest.mockResolvedValue({
				access_token: makeAccessToken({ sub: 'user' }),
				refresh_token: 'refresh-2',
				expires_in: 3600,
			});

			await expect(credential.preAuthentication.call(helpers, connected)).rejects.toThrow(
				/no ChatGPT account identifier/,
			);
		});
	});

	describe('authenticate', () => {
		it('sends the bearer token and the account header Codex requires', async () => {
			const options = await credential.authenticate(
				{ accessToken: validToken, accountId: ACCOUNT_ID },
				{ url: `${OPENAI_CODEX_OAUTH.baseUrl}/responses` } as IHttpRequestOptions,
			);

			expect(options.headers).toEqual({
				Authorization: `Bearer ${validToken}`,
				'chatgpt-account-id': ACCOUNT_ID,
				// Codex answers 403 to an unrecognized originator.
				originator: 'codex_cli_rs',
				'OpenAI-Beta': 'responses=experimental',
			});
		});

		it('sends the residency header when the workspace enforces one', async () => {
			const options = await credential.authenticate(
				{ accessToken: validToken, accountId: ACCOUNT_ID, residency: 'us' },
				{ url: `${OPENAI_CODEX_OAUTH.baseUrl}/responses` } as IHttpRequestOptions,
			);

			expect(options.headers).toMatchObject({ 'x-openai-internal-codex-residency': 'us' });
		});

		it('omits the residency header when none is stored', async () => {
			const options = await credential.authenticate({ accessToken: validToken }, {
				url: `${OPENAI_CODEX_OAUTH.baseUrl}/responses`,
			} as IHttpRequestOptions);

			expect(options.headers).not.toHaveProperty('x-openai-internal-codex-residency');
		});

		it('omits the account header when no account id is stored', async () => {
			const options = await credential.authenticate({ accessToken: validToken }, {
				url: `${OPENAI_CODEX_OAUTH.baseUrl}/responses`,
			} as IHttpRequestOptions);

			expect(options.headers).not.toHaveProperty('chatgpt-account-id');
		});
	});

	describe('properties', () => {
		it('marks the access token expirable so n8n re-runs preAuthentication', () => {
			const accessToken = credential.properties.find((p) => p.name === 'accessToken');

			expect(accessToken?.type).toBe('hidden');
			expect(accessToken?.typeOptions?.expirable).toBe(true);
		});

		it('exposes the base URL under `url`, which is what maps to the SDK baseURL', () => {
			const url = credential.properties.find((p) => p.name === 'url');

			expect(url?.default).toBe(OPENAI_CODEX_OAUTH.baseUrl);
		});
	});
});
