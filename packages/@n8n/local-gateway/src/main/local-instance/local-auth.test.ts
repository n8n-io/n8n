vi.mock('../oauth/oauth-client', async () => {
	const actual = await vi.importActual<typeof oauthClientModule>('../oauth/oauth-client');
	return {
		...actual,
		discover: vi.fn(),
		exchangeCode: vi.fn(),
	};
});

import { acquireTokens, LocalAuthError, login, setupOwner } from './local-auth';
import type * as oauthClientModule from '../oauth/oauth-client';
import { discover, exchangeCode } from '../oauth/oauth-client';

const BASE_URL = 'http://127.0.0.1:5680';
const CREDENTIALS = { email: 'owner@n8n.local', password: 'A1secret-password' };
const METADATA = {
	authorization_endpoint: `${BASE_URL}/mcp-oauth/authorize`,
	token_endpoint: `${BASE_URL}/mcp-oauth/token`,
};

function jsonResponse(body: unknown, { status = 200, setCookie = [] as string[] } = {}): Response {
	const response = new Response(JSON.stringify(body), { status });
	vi.spyOn(response.headers, 'getSetCookie').mockReturnValue(setCookie);
	return response;
}

/** The URL of a `fetch` input, without `String()`-ing a possible Request object. */
function toUrlString(input: string | URL | Request): string {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.href;
	return input.url;
}

describe('local-auth', () => {
	const mockFetch = vi.fn<typeof fetch>();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('fetch', mockFetch);
	});

	describe('setupOwner', () => {
		it('posts the owner payload and returns the auth cookie pair', async () => {
			mockFetch.mockResolvedValue(
				jsonResponse({ data: {} }, { setCookie: ['n8n-auth=jwt-value; Path=/; HttpOnly'] }),
			);

			await expect(setupOwner(BASE_URL, CREDENTIALS)).resolves.toBe('n8n-auth=jwt-value');

			const [url, init] = mockFetch.mock.calls[0];
			expect(url).toBe(`${BASE_URL}/rest/owner/setup`);
			expect(init!.body).toBe(
				JSON.stringify({
					email: 'owner@n8n.local',
					firstName: 'Local',
					lastName: 'Owner',
					password: 'A1secret-password',
				}),
			);
		});

		it('throws request_failed when setup is rejected', async () => {
			mockFetch.mockResolvedValue(jsonResponse({}, { status: 400 }));

			await expect(setupOwner(BASE_URL, CREDENTIALS)).rejects.toMatchObject({
				code: 'request_failed',
			});
		});
	});

	describe('login', () => {
		it('returns the auth cookie pair on success', async () => {
			mockFetch.mockResolvedValue(
				jsonResponse({ data: {} }, { setCookie: ['n8n-auth=jwt-value; Path=/'] }),
			);

			await expect(login(BASE_URL, CREDENTIALS)).resolves.toBe('n8n-auth=jwt-value');
		});

		it('throws invalid_credentials on 401, so the UI can prompt for re-setup', async () => {
			mockFetch.mockResolvedValue(jsonResponse({}, { status: 401 }));

			await expect(login(BASE_URL, CREDENTIALS)).rejects.toMatchObject({
				code: 'invalid_credentials',
			});
		});

		it('throws missing_cookie when no auth cookie is set', async () => {
			mockFetch.mockResolvedValue(jsonResponse({ data: {} }));

			await expect(login(BASE_URL, CREDENTIALS)).rejects.toBeInstanceOf(LocalAuthError);
		});
	});

	describe('acquireTokens', () => {
		function mockHappyPath(): { consentState: () => string | null } {
			vi.mocked(discover).mockResolvedValue(METADATA);
			let authorizedState: string | null = null;

			mockFetch.mockImplementation(async (input) => {
				const url = new URL(toUrlString(input));
				if (url.pathname === '/mcp-oauth/authorize') {
					authorizedState = url.searchParams.get('state');
					return await Promise.resolve(
						jsonResponse(null, {
							status: 302,
							setCookie: ['n8n-oauth-session=session-jwt; Path=/; Max-Age=600'],
						}),
					);
				}
				return await Promise.resolve(
					jsonResponse({
						data: { redirectUrl: `n8n://callback?code=auth-code&state=${authorizedState}` },
					}),
				);
			});

			return { consentState: () => authorizedState };
		}

		it('captures the session cookie, approves consent, and exchanges the code', async () => {
			mockHappyPath();
			vi.mocked(exchangeCode).mockResolvedValue({ access_token: 'token', expires_in: 3600 });

			await expect(acquireTokens(BASE_URL, 'n8n-auth=jwt-value')).resolves.toEqual({
				access_token: 'token',
				expires_in: 3600,
			});

			const consentCall = mockFetch.mock.calls.find(([input]) =>
				toUrlString(input).includes('/rest/consent/approve'),
			);
			expect(consentCall![1]!.headers).toMatchObject({
				cookie: 'n8n-auth=jwt-value; n8n-oauth-session=session-jwt',
			});
			const [, exchangeParams] = vi.mocked(exchangeCode).mock.calls[0];
			expect(exchangeParams.code).toBe('auth-code');
			expect(exchangeParams.codeVerifier).toBeTruthy();
		});

		it('rejects when the consent redirect carries a different state', async () => {
			vi.mocked(discover).mockResolvedValue(METADATA);
			mockFetch.mockImplementation(async (input) => {
				if (toUrlString(input).includes('/mcp-oauth/authorize')) {
					return await Promise.resolve(
						jsonResponse(null, {
							status: 302,
							setCookie: ['n8n-oauth-session=session-jwt'],
						}),
					);
				}
				return await Promise.resolve(
					jsonResponse({
						data: { redirectUrl: 'n8n://callback?code=auth-code&state=tampered' },
					}),
				);
			});

			await expect(acquireTokens(BASE_URL, 'n8n-auth=jwt-value')).rejects.toMatchObject({
				code: 'state_mismatch',
			});
			expect(exchangeCode).not.toHaveBeenCalled();
		});

		it('rejects when the authorize response sets no session cookie', async () => {
			vi.mocked(discover).mockResolvedValue(METADATA);
			mockFetch.mockResolvedValue(jsonResponse(null, { status: 302 }));

			await expect(acquireTokens(BASE_URL, 'n8n-auth=jwt-value')).rejects.toMatchObject({
				code: 'missing_cookie',
			});
		});
	});
});
