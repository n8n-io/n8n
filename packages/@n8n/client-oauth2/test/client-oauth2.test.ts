import axios from 'axios';
import { Agent as HttpsAgent } from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nock from 'nock';

import { ClientOAuth2, ResponseError } from '@/client-oauth2';
import { ERROR_RESPONSES } from '@/constants';
import { auth, AuthError } from '@/utils';

import * as config from './config';

describe('ClientOAuth2', () => {
	const client = new ClientOAuth2({
		clientId: config.clientId,
		clientSecret: config.clientSecret,
		accessTokenUri: config.accessTokenUri,
		authentication: 'header',
	});

	beforeAll(async () => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
	});

	describe('accessTokenRequest', () => {
		const authHeader = auth(config.clientId, config.clientSecret);

		const makeTokenCall = async () =>
			await client.accessTokenRequest({
				url: config.accessTokenUri,
				method: 'POST',
				headers: {
					Authorization: authHeader,
					Accept: 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: {
					refresh_token: 'test',
					grant_type: 'refresh_token',
				},
			});

		const mockTokenResponse = ({
			status = 200,
			headers,
			body,
		}: {
			status: number;
			body: string;
			headers: Record<string, string>;
		}) =>
			nock(config.baseUrl).post('/login/oauth/access_token').once().reply(status, body, headers);

		it('should send the correct request based on given options', async () => {
			mockTokenResponse({
				status: 200,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				}),
			});

			const axiosSpy = vi.spyOn(axios, 'request');

			await makeTokenCall();

			expect(axiosSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					url: config.accessTokenUri,
					method: 'POST',
					data: 'refresh_token=test&grant_type=refresh_token',
					proxy: false,
					headers: {
						Authorization: authHeader,
						Accept: 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded',
					},
				}),
			);
		});

		test.each([
			{
				contentType: 'application/json',
				body: JSON.stringify({
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				}),
			},
			{
				contentType: 'application/json; charset=utf-8',
				body: JSON.stringify({
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				}),
			},
			{
				contentType: 'application/x-www-form-urlencoded',
				body: `access_token=${config.accessToken}&refresh_token=${config.refreshToken}`,
			},
		])('should parse response with content type $contentType', async ({ contentType, body }) => {
			mockTokenResponse({
				status: 200,
				headers: { 'Content-Type': contentType },
				body,
			});

			const response = await makeTokenCall();

			expect(response).toEqual({
				access_token: config.accessToken,
				refresh_token: config.refreshToken,
			});
		});

		test.each([
			{
				contentType: 'text/html',
				body: '<html><body>Hello, world!</body></html>',
			},
			{
				contentType: 'application/xml',
				body: '<xml><body>Hello, world!</body></xml>',
			},
			{
				contentType: 'text/plain',
				body: 'Hello, world!',
			},
		])(
			'should report a body preview for non-JSON content type $contentType',
			async ({ contentType, body }) => {
				mockTokenResponse({
					status: 200,
					headers: { 'Content-Type': contentType },
					body,
				});

				const result = await makeTokenCall().catch((err) => err);
				expect(result).toBeInstanceOf(ResponseError);
				expect(result.message).toContain('Expected JSON response from OAuth2 token endpoint');
				expect(result.message).toContain(`(content-type: ${contentType})`);
			},
		);

		it('should parse a JSON body served with a non-JSON content type', async () => {
			mockTokenResponse({
				status: 200,
				headers: { 'Content-Type': 'text/plain; charset=utf-8' },
				body: JSON.stringify({
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				}),
			});

			const response = await makeTokenCall();

			expect(response).toEqual({
				access_token: config.accessToken,
				refresh_token: config.refreshToken,
			});
		});

		it('should surface auth errors served with a non-JSON content type', async () => {
			mockTokenResponse({
				status: 400,
				headers: { 'Content-Type': 'text/plain; charset=utf-8' },
				body: JSON.stringify({ error: 'invalid_grant' }),
			});

			const result = await makeTokenCall().catch((err) => err);
			expect(result).toBeInstanceOf(AuthError);
			expect(result.body).toEqual({ error: 'invalid_grant' });
		});

		it('should throw ResponseError when application/json response contains invalid JSON', async () => {
			const htmlBody = '<!DOCTYPE html><html><body>Service Unavailable</body></html>';
			mockTokenResponse({
				status: 200,
				headers: { 'Content-Type': 'application/json' },
				body: htmlBody,
			});

			const result = await makeTokenCall().catch((err) => err);
			expect(result).toBeInstanceOf(ResponseError);
			expect(result.status).toBe(200);
			expect(result.body).toBe(htmlBody);
			expect(result.message).toContain('Expected JSON response from OAuth2 token endpoint');
			expect(result.message).toContain('(content-type: application/json)');
			expect(result.message).toContain('<!DOCTYPE html>');
		});

		it('should truncate long invalid JSON response bodies in the error message', async () => {
			const longBody = 'x'.repeat(200);
			mockTokenResponse({
				status: 200,
				headers: { 'Content-Type': 'application/json' },
				body: longBody,
			});

			const result = await makeTokenCall().catch((err) => err);
			expect(result).toBeInstanceOf(ResponseError);
			expect(result.status).toBe(200);
			expect(result.message).toContain('x'.repeat(100) + '...');
		});

		it('should reject 4xx responses with auth errors', async () => {
			mockTokenResponse({
				status: 401,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ error: 'access_denied' }),
			});

			const result = await makeTokenCall().catch((err) => err);
			expect(result).toBeInstanceOf(AuthError);
			expect(result.message).toEqual(ERROR_RESPONSES.access_denied);
			expect(result.body).toEqual({ error: 'access_denied' });
		});

		it('should reject 3xx responses with response errors', async () => {
			mockTokenResponse({
				status: 302,
				headers: {},
				body: 'Redirected',
			});

			const result = await makeTokenCall().catch((err) => err);
			expect(result).toBeInstanceOf(ResponseError);
			expect(result.message).toEqual('HTTP status 302');
			expect(result.body).toEqual('Redirected');
		});

		describe('ignoreSSLIssues', () => {
			const PROXY_ENV_VARS = ['HTTPS_PROXY', 'https_proxy', 'NO_PROXY', 'no_proxy'] as const;
			let savedProxyEnv: Record<string, string | undefined>;

			beforeEach(() => {
				savedProxyEnv = {};
				for (const key of PROXY_ENV_VARS) {
					savedProxyEnv[key] = process.env[key];
					delete process.env[key];
				}
			});

			afterEach(() => {
				for (const key of PROXY_ENV_VARS) {
					if (savedProxyEnv[key] === undefined) {
						delete process.env[key];
					} else {
						process.env[key] = savedProxyEnv[key];
					}
				}
				vi.restoreAllMocks();
			});

			const makeIgnoreSSLCall = async () =>
				await client.accessTokenRequest({
					url: config.accessTokenUri,
					method: 'POST',
					headers: {
						Authorization: authHeader,
						Accept: 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: {
						refresh_token: 'test',
						grant_type: 'refresh_token',
					},
					ignoreSSLIssues: true,
				});

			it('should use a plain https agent with relaxed TLS when no proxy is configured', async () => {
				mockTokenResponse({
					status: 200,
					headers: { contentType: 'application/json' },
					body: JSON.stringify({
						access_token: config.accessToken,
						refresh_token: config.refreshToken,
					}),
				});

				const axiosSpy = vi.spyOn(axios, 'request');

				await makeIgnoreSSLCall();

				const requestConfig = axiosSpy.mock.calls[0][0];
				const httpsAgent = requestConfig.httpsAgent as HttpsAgent;
				expect(httpsAgent).toBeInstanceOf(HttpsAgent);
				expect(httpsAgent).not.toBeInstanceOf(HttpsProxyAgent);
				expect(httpsAgent.options.rejectUnauthorized).toBe(false);
			});

			it('should route through an https proxy agent with relaxed TLS when HTTPS_PROXY is set', async () => {
				process.env.HTTPS_PROXY = 'http://fake-proxy.example';

				const axiosSpy = vi.spyOn(axios, 'request').mockResolvedValue({
					status: 200,
					headers: { contentType: 'application/json' },
					data: JSON.stringify({
						access_token: config.accessToken,
						refresh_token: config.refreshToken,
					}),
				});

				await makeIgnoreSSLCall();

				const requestConfig = axiosSpy.mock.calls[0][0];
				const httpsAgent = requestConfig.httpsAgent as HttpsProxyAgent<string>;
				expect(httpsAgent).toBeInstanceOf(HttpsProxyAgent);
				expect(httpsAgent.connectOpts.rejectUnauthorized).toBe(false);
				// The ignore-SSL branch must keep axios's own proxy handling disabled
				// so routing stays with our agent, not double-proxied.
				expect(requestConfig.proxy).toBe(false);
			});

			it('should honor NO_PROXY and use a plain relaxed-TLS agent even when HTTPS_PROXY is set', async () => {
				process.env.HTTPS_PROXY = 'http://fake-proxy.example';
				process.env.NO_PROXY = new URL(config.baseUrl).hostname;

				mockTokenResponse({
					status: 200,
					headers: { contentType: 'application/json' },
					body: JSON.stringify({
						access_token: config.accessToken,
						refresh_token: config.refreshToken,
					}),
				});

				const axiosSpy = vi.spyOn(axios, 'request');

				await makeIgnoreSSLCall();

				const requestConfig = axiosSpy.mock.calls[0][0];
				const httpsAgent = requestConfig.httpsAgent as HttpsAgent;
				expect(httpsAgent).toBeInstanceOf(HttpsAgent);
				expect(httpsAgent).not.toBeInstanceOf(HttpsProxyAgent);
				expect(httpsAgent.options.rejectUnauthorized).toBe(false);
			});

			it('should not set an httpsAgent when ignoreSSLIssues is false, leaving the global proxy agent in place', async () => {
				process.env.HTTPS_PROXY = 'http://fake-proxy.example';

				mockTokenResponse({
					status: 200,
					headers: { contentType: 'application/json' },
					body: JSON.stringify({
						access_token: config.accessToken,
						refresh_token: config.refreshToken,
					}),
				});

				const axiosSpy = vi.spyOn(axios, 'request');

				await client.accessTokenRequest({
					url: config.accessTokenUri,
					method: 'POST',
					headers: {
						authorization: authHeader,
						accept: 'application/json',
						contentType: 'application/x-www-form-urlencoded',
					},
					body: { refresh_token: 'test', grant_type: 'refresh_token' },
					ignoreSSLIssues: false,
				});

				const requestConfig = axiosSpy.mock.calls[0][0];
				expect(requestConfig.httpsAgent).toBeUndefined();
				expect(requestConfig.proxy).toBe(false);
			});
		});
	});

	describe('RFC 8707 resource parameter', () => {
		const resource = 'https://mcp.example.com/resource';

		afterEach(() => {
			nock.cleanAll();
			vi.restoreAllMocks();
		});

		const makeClient = (overrides: Partial<ConstructorParameters<typeof ClientOAuth2>[0]> = {}) =>
			new ClientOAuth2({
				clientId: config.clientId,
				clientSecret: config.clientSecret,
				accessTokenUri: config.accessTokenUri,
				authorizationUri: config.authorizationUri,
				redirectUri: config.redirectUri,
				authentication: 'header',
				state: config.state,
				...overrides,
			});

		const parseBody = (body: unknown) =>
			new URLSearchParams(typeof body === 'string' ? body : (body as Record<string, string>));

		const expectPostBody = (expected: Record<string, string>) =>
			nock(config.baseUrl)
				.post('/login/oauth/access_token', (body) => {
					const params = parseBody(body);
					return Object.entries(expected).every(([key, value]) => params.get(key) === value);
				})
				.reply(
					200,
					JSON.stringify({
						access_token: config.accessToken,
						refresh_token: config.refreshToken,
					}),
					{ 'Content-Type': 'application/json' },
				);

		it('should include resource in authorization URI when configured', () => {
			const uri = makeClient({ resource }).code.getUri();

			expect(new URL(uri).searchParams.get('resource')).toBe(resource);
		});

		it('should omit resource from authorization URI when not configured', () => {
			const uri = makeClient().code.getUri();

			expect(new URL(uri).searchParams.has('resource')).toBe(false);
		});

		it('should include resource in authorization code token request body when configured', async () => {
			const scope = expectPostBody({
				code: config.code,
				grant_type: 'authorization_code',
				redirect_uri: config.redirectUri,
				resource,
			});

			await makeClient({ resource }).code.getToken(
				`${config.redirectUri}?code=${config.code}&state=${config.state}`,
			);

			scope.done();
		});

		it('should omit resource from authorization code token request body when not configured', async () => {
			const scope = nock(config.baseUrl)
				.post('/login/oauth/access_token', (body) => {
					const params = parseBody(body);
					return !params.has('resource');
				})
				.reply(
					200,
					JSON.stringify({
						access_token: config.accessToken,
						refresh_token: config.refreshToken,
					}),
					{ 'Content-Type': 'application/json' },
				);

			await makeClient().code.getToken(
				`${config.redirectUri}?code=${config.code}&state=${config.state}`,
			);

			scope.done();
		});

		it('should include resource in refresh token request body when configured', async () => {
			const scope = expectPostBody({
				refresh_token: config.refreshToken,
				grant_type: 'refresh_token',
				resource,
			});

			await makeClient({ resource })
				.createToken({
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				})
				.refresh();

			scope.done();
		});

		it('should omit resource from refresh token request body when not configured', async () => {
			const scope = nock(config.baseUrl)
				.post('/login/oauth/access_token', (body) => {
					const params = parseBody(body);
					return !params.has('resource');
				})
				.reply(
					200,
					JSON.stringify({
						access_token: config.refreshedAccessToken,
						refresh_token: config.refreshedRefreshToken,
					}),
					{ 'Content-Type': 'application/json' },
				);

			await makeClient()
				.createToken({
					access_token: config.accessToken,
					refresh_token: config.refreshToken,
				})
				.refresh();

			scope.done();
		});
	});
});
