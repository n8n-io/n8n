import type { SsrfBridge } from '@n8n/backend-network';
import axios from 'axios';
import { Agent as HttpAgent, createServer, type Server } from 'http';
import { Agent as HttpsAgent } from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nock from 'nock';
import type { AddressInfo, LookupFunction } from 'node:net';

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

			it('should route through an https proxy agent when HTTPS_PROXY is set', async () => {
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
				// 'Ignore SSL issues' relaxes the tunnelled session to the target; the
				// proxy is a different peer and keeps its certificate verified.
				expect(httpsAgent.connectOpts.rejectUnauthorized).toBeUndefined();
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
		});

		describe('env proxy for standard requests', () => {
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

			it('should route through an https proxy agent when HTTPS_PROXY is set', async () => {
				process.env.HTTPS_PROXY = 'http://fake-proxy.example';

				const axiosSpy = vi.spyOn(axios, 'request').mockResolvedValue({
					status: 200,
					headers: { contentType: 'application/json' },
					data: JSON.stringify({
						access_token: config.accessToken,
						refresh_token: config.refreshToken,
					}),
				});

				await makeTokenCall();

				const requestConfig = axiosSpy.mock.calls[0][0];
				const httpsAgent = requestConfig.httpsAgent as HttpsProxyAgent<string>;
				expect(httpsAgent).toBeInstanceOf(HttpsProxyAgent);
				// TLS verification of the target stays on for standard requests.
				expect(httpsAgent.connectOpts.rejectUnauthorized).toBeUndefined();
				const httpAgent = requestConfig.httpAgent as { proxy?: URL };
				expect(httpAgent.proxy?.href).toBe('http://fake-proxy.example/');
				expect(requestConfig.proxy).toBe(false);
				expect(requestConfig.timeout).toBe(300_000);
			});

			it('should honor NO_PROXY and leave agents unset for excluded targets', async () => {
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

				await makeTokenCall();

				const requestConfig = axiosSpy.mock.calls[0][0];
				expect(requestConfig.httpsAgent).toBeUndefined();
				expect(requestConfig.httpAgent).toBeUndefined();
			});

			it('should leave agents unset when no proxy is configured', async () => {
				mockTokenResponse({
					status: 200,
					headers: { contentType: 'application/json' },
					body: JSON.stringify({
						access_token: config.accessToken,
						refresh_token: config.refreshToken,
					}),
				});

				const axiosSpy = vi.spyOn(axios, 'request');

				await makeTokenCall();

				const requestConfig = axiosSpy.mock.calls[0][0];
				expect(requestConfig.httpsAgent).toBeUndefined();
				expect(requestConfig.httpAgent).toBeUndefined();
				expect(requestConfig.proxy).toBe(false);
			});
		});

		describe('ssrfBridge', () => {
			const lookup = vi.fn() as unknown as LookupFunction;

			const agentLookupOf = (agent: unknown) =>
				(agent as { options: { lookup?: LookupFunction } }).options.lookup;

			const makeSsrfBridge = (overrides?: Partial<SsrfBridge>): SsrfBridge => ({
				validateUrl: vi.fn().mockResolvedValue({ ok: true, result: undefined }),
				validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
				validateConnectionHost: vi.fn().mockReturnValue({ ok: true, result: undefined }),
				validateRedirectSync: vi.fn(),
				createSecureLookup: vi.fn().mockReturnValue(lookup),
				...overrides,
			});

			const makeBridgedCall = async (ssrfBridge: SsrfBridge, ignoreSSLIssues?: boolean) =>
				await new ClientOAuth2({
					clientId: config.clientId,
					clientSecret: config.clientSecret,
					accessTokenUri: config.accessTokenUri,
					authentication: 'header',
					ssrfBridge,
				}).accessTokenRequest({
					url: config.accessTokenUri,
					method: 'POST',
					headers: { Authorization: authHeader, Accept: 'application/json' },
					body: { refresh_token: 'test', grant_type: 'refresh_token' },
					ignoreSSLIssues,
				});

			afterEach(() => {
				nock.cleanAll();
				vi.restoreAllMocks();
			});

			it('should reject before dispatching when the target is not allowed', async () => {
				const blocked = new Error('Address not allowed');
				const ssrfBridge = makeSsrfBridge({
					validateUrl: vi.fn().mockResolvedValue({ ok: false, error: blocked }),
				});
				const tokenScope = mockTokenResponse({
					status: 200,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ access_token: config.accessToken }),
				});

				await expect(makeBridgedCall(ssrfBridge)).rejects.toBe(blocked);

				expect(ssrfBridge.validateUrl).toHaveBeenCalledWith(new URL(config.accessTokenUri));
				expect(tokenScope.isDone()).toBe(false);
			});

			it('should resolve the target through the provided lookup and guard redirects', async () => {
				const ssrfBridge = makeSsrfBridge();
				mockTokenResponse({
					status: 200,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ access_token: config.accessToken }),
				});

				const axiosSpy = vi.spyOn(axios, 'request');

				await makeBridgedCall(ssrfBridge);

				const requestConfig = axiosSpy.mock.calls[0][0];
				expect(requestConfig.httpAgent).toBeInstanceOf(HttpAgent);
				expect(requestConfig.httpsAgent).toBeInstanceOf(HttpsAgent);
				expect(agentLookupOf(requestConfig.httpAgent)).toBe(lookup);
				expect(agentLookupOf(requestConfig.httpsAgent)).toBe(lookup);

				requestConfig.beforeRedirect?.(
					{ href: 'http://redirected.example/token' },
					{} as never,
					{} as never,
				);
				expect(ssrfBridge.validateRedirectSync).toHaveBeenCalledWith(
					'http://redirected.example/token',
				);
			});

			it('should keep the lookup when ignoreSSLIssues also relaxes TLS', async () => {
				const ssrfBridge = makeSsrfBridge();
				mockTokenResponse({
					status: 200,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ access_token: config.accessToken }),
				});

				const axiosSpy = vi.spyOn(axios, 'request');

				await makeBridgedCall(ssrfBridge, true);

				const httpsAgent = axiosSpy.mock.calls[0][0].httpsAgent as HttpsAgent;
				expect(httpsAgent.options.rejectUnauthorized).toBe(false);
				expect(agentLookupOf(httpsAgent)).toBe(lookup);
			});

			describe('behind an env proxy', () => {
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
				});

				const proxiedTokenResponse = () =>
					vi.spyOn(axios, 'request').mockResolvedValue({
						status: 200,
						headers: {},
						data: JSON.stringify({ access_token: config.accessToken }),
					});

				it('should leave resolution to the proxy instead of checking the proxy host', async () => {
					process.env.HTTPS_PROXY = 'http://fake-proxy.example';
					const ssrfBridge = makeSsrfBridge();
					const axiosSpy = proxiedTokenResponse();

					await makeBridgedCall(ssrfBridge);

					// The lookup would resolve the proxy, not the target, so the target policy
					// must not be applied to it — the proxy reaches the target on our behalf.
					expect(ssrfBridge.createSecureLookup).not.toHaveBeenCalled();
					const httpsAgent = axiosSpy.mock.calls[0][0].httpsAgent as HttpsProxyAgent<string>;
					expect(httpsAgent).toBeInstanceOf(HttpsProxyAgent);
					expect(httpsAgent.connectOpts.lookup).toBeUndefined();
					// The pre-flight check on the target still runs.
					expect(ssrfBridge.validateUrl).toHaveBeenCalledWith(new URL(config.accessTokenUri));
				});

				it('should route through the proxy agent without a lookup when ignoreSSLIssues is set', async () => {
					process.env.HTTPS_PROXY = 'http://fake-proxy.example';
					const ssrfBridge = makeSsrfBridge();
					const axiosSpy = proxiedTokenResponse();

					await makeBridgedCall(ssrfBridge, true);

					const httpsAgent = axiosSpy.mock.calls[0][0].httpsAgent as HttpsProxyAgent<string>;
					expect(httpsAgent).toBeInstanceOf(HttpsProxyAgent);
					expect(httpsAgent.connectOpts.rejectUnauthorized).toBeUndefined();
					expect(httpsAgent.connectOpts.lookup).toBeUndefined();
				});

				it('should apply the lookup when NO_PROXY excludes the target', async () => {
					process.env.HTTPS_PROXY = 'http://fake-proxy.example';
					process.env.NO_PROXY = new URL(config.baseUrl).hostname;
					const ssrfBridge = makeSsrfBridge();
					mockTokenResponse({
						status: 200,
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ access_token: config.accessToken }),
					});

					const axiosSpy = vi.spyOn(axios, 'request');

					await makeBridgedCall(ssrfBridge);

					const requestConfig = axiosSpy.mock.calls[0][0];
					expect(agentLookupOf(requestConfig.httpAgent)).toBe(lookup);
					expect(agentLookupOf(requestConfig.httpsAgent)).toBe(lookup);
				});
			});

			it('should leave the request unchecked when no bridge is provided', async () => {
				mockTokenResponse({
					status: 200,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ access_token: config.accessToken }),
				});

				const axiosSpy = vi.spyOn(axios, 'request');

				await makeTokenCall();

				const requestConfig = axiosSpy.mock.calls[0][0];
				expect(requestConfig.httpAgent).toBeUndefined();
				expect(requestConfig.httpsAgent).toBeUndefined();
				expect(requestConfig.beforeRedirect).toBeUndefined();
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

// Runs against a real loopback server rather than a nock interceptor: the secure
// lookup lives on the request's http agent, so only an actual socket connection
// proves it is consulted.
describe('ClientOAuth2 over a real connection', () => {
	let server: Server;
	let port: number;
	let hits: number;

	beforeAll(async () => {
		nock.cleanAll();
		nock.enableNetConnect();
		hits = 0;
		server = createServer((_req, res) => {
			hits++;
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ access_token: 'real-token' }));
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		port = (server.address() as AddressInfo).port;
	});

	afterAll(async () => {
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		);
		nock.disableNetConnect();
	});

	beforeEach(() => {
		hits = 0;
	});

	const makeCall = async (ssrfBridge?: SsrfBridge) => {
		const url = `http://localhost:${port}/token`;
		return await new ClientOAuth2({
			clientId: 'id',
			clientSecret: 'secret',
			accessTokenUri: url,
			authentication: 'header',
			ssrfBridge,
		}).accessTokenRequest({
			url,
			method: 'POST',
			headers: { Accept: 'application/json' },
			body: { grant_type: 'refresh_token', refresh_token: 'x' },
		});
	};

	const bridgeWithLookup = (lookup: LookupFunction): SsrfBridge => ({
		validateUrl: vi.fn().mockResolvedValue({ ok: true, result: undefined }),
		validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
		validateConnectionHost: vi.fn().mockReturnValue({ ok: true, result: undefined }),
		validateRedirectSync: vi.fn(),
		createSecureLookup: () => lookup,
	});

	it('should not open a connection when the lookup rejects the resolved address', async () => {
		const lookup: LookupFunction = (hostname, options, onResult) => {
			onResult(new Error(`lookup rejected ${hostname}`), options.all ? [] : '', undefined);
		};

		await expect(makeCall(bridgeWithLookup(lookup))).rejects.toThrow('lookup rejected localhost');
		expect(hits).toBe(0);
	});

	it('should complete the request when the lookup allows the resolved address', async () => {
		const lookup: LookupFunction = (_hostname, options, onResult) => {
			onResult(null, options.all ? [{ address: '127.0.0.1', family: 4 }] : '127.0.0.1', 4);
		};

		const token = await makeCall(bridgeWithLookup(lookup));

		expect(token.access_token).toBe('real-token');
		expect(hits).toBe(1);
	});

	it('should complete the request when no bridge is provided', async () => {
		const token = await makeCall();

		expect(token.access_token).toBe('real-token');
		expect(hits).toBe(1);
	});
});
