import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import FormData from 'form-data';
import type { Agent as HttpsAgent } from 'https';
import type { IHttpRequestMethods, IHttpRequestOptions, IRequestOptions } from 'n8n-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge } from '../../../ssrf';
import { configureGlobalAxiosDefaults } from '../config';
import { convertN8nRequestToAxios, httpRequest, invokeAxios, removeEmptyBody } from '../request';

// Sets axios defaults and registers the vendor-header interceptor.
configureGlobalAxiosDefaults();

const TEST_CA_CERT = '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----';

describe('invokeAxios', () => {
	const baseUrl = 'https://example.de';

	beforeEach(() => {
		nock.cleanAll();
		vi.clearAllMocks();
	});

	it('should throw error for non-401 status codes', async () => {
		nock(baseUrl).get('/test').reply(500, {});

		await expect(invokeAxios({ url: `${baseUrl}/test` })).rejects.toThrow(
			'Request failed with status code 500',
		);
	});

	it('should throw error on 401 without digest auth challenge', async () => {
		nock(baseUrl).get('/test').reply(401, {});

		await expect(
			invokeAxios(
				{
					url: `${baseUrl}/test`,
				},
				{ sendImmediately: false },
			),
		).rejects.toThrow('Request failed with status code 401');
	});

	it('should make successful requests', async () => {
		nock(baseUrl).get('/test').reply(200, { success: true });

		const response = await invokeAxios({
			url: `${baseUrl}/test`,
		});

		expect(response.status).toBe(200);
		expect(response.data).toEqual({ success: true });
	});

	it('should handle digest auth when receiving 401 with nonce', async () => {
		nock(baseUrl)
			.get('/test')
			.matchHeader('authorization', 'Basic dXNlcjpwYXNz')
			.once()
			.reply(401, {}, { 'www-authenticate': 'Digest realm="test", nonce="abc123", qop="auth"' });

		nock(baseUrl)
			.get('/test')
			.matchHeader(
				'authorization',
				/^Digest username="user",realm="test",nonce="abc123",uri="\/test",qop="auth",algorithm="MD5",response="[0-9a-f]{32}"/,
			)
			.reply(200, { success: true });

		const response = await invokeAxios(
			{
				url: `${baseUrl}/test`,
				auth: {
					username: 'user',
					password: 'pass',
				},
			},
			{ sendImmediately: false },
		);

		expect(response.status).toBe(200);
		expect(response.data).toEqual({ success: true });
	});

	it('should include vendor headers in requests to OpenAi', async () => {
		const { openAiDefaultHeaders } = Container.get(AiConfig);
		nock('https://api.openai.com', {
			reqheaders: openAiDefaultHeaders,
		})
			.get('/chat')
			.reply(200, { success: true });

		const response = await invokeAxios({
			url: 'https://api.openai.com/chat',
		});

		expect(response.status).toBe(200);
		expect(response.data).toEqual({ success: true });
	});
});

describe('removeEmptyBody', () => {
	test.each(['GET', 'HEAD', 'OPTIONS'] as IHttpRequestMethods[])(
		'Should remove empty body for %s',
		async (method) => {
			const requestOptions = {
				method,
				body: {},
			} as IHttpRequestOptions | IRequestOptions;
			removeEmptyBody(requestOptions);
			expect(requestOptions.body).toEqual(undefined);
		},
	);

	test.each(['GET', 'HEAD', 'OPTIONS'] as IHttpRequestMethods[])(
		'Should not remove non-empty body for %s',
		async (method) => {
			const requestOptions = {
				method,
				body: { test: true },
			} as IHttpRequestOptions | IRequestOptions;
			removeEmptyBody(requestOptions);
			expect(requestOptions.body).toEqual({ test: true });
		},
	);

	test.each(['POST', 'PUT', 'PATCH', 'DELETE'] as IHttpRequestMethods[])(
		'Should not remove empty body for %s',
		async (method) => {
			const requestOptions = {
				method,
				body: {},
			} as IHttpRequestOptions | IRequestOptions;
			removeEmptyBody(requestOptions);
			expect(requestOptions.body).toEqual({});
		},
	);

	describe('empty-body detection across body shapes (GET)', () => {
		test.each([
			['null', null],
			['undefined', undefined],
			['empty string', ''],
			['empty array', []],
			['empty buffer', Buffer.alloc(0)],
			['empty object', {}],
		])('treats %s as empty and removes it', (_label, body) => {
			const requestOptions = {
				method: 'GET',
				body,
			} as unknown as IHttpRequestOptions | IRequestOptions;
			removeEmptyBody(requestOptions);
			expect(requestOptions.body).toBeUndefined();
		});

		test.each([
			['non-empty string', 'data'],
			['non-empty array', [1]],
			['non-empty buffer', Buffer.from('x')],
			['non-empty object', { test: true }],
			['zero', 0],
			['false', false],
		])('treats %s as non-empty and keeps it', (_label, body) => {
			const requestOptions = {
				method: 'GET',
				body,
			} as unknown as IHttpRequestOptions | IRequestOptions;
			removeEmptyBody(requestOptions);
			expect(requestOptions.body).toEqual(body);
		});
	});
});

describe('convertN8nRequestToAxios', () => {
	test('should convert basic HTTP request options', () => {
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: 'https://example.com',
			headers: { 'Custom-Header': 'test' },
			qs: { param1: 'value1' },
		};

		const axiosConfig = convertN8nRequestToAxios(requestOptions);

		expect(axiosConfig).toEqual(
			expect.objectContaining({
				method: 'GET',
				url: 'https://example.com',
				headers: expect.objectContaining({
					'Custom-Header': 'test',
					'User-Agent': 'n8n',
				}),
				params: { param1: 'value1' },
			}),
		);
	});

	test('should handle body and content type', () => {
		const requestOptions: IHttpRequestOptions = {
			method: 'POST',
			url: 'https://example.com',
			body: { key: 'value' },
			headers: { 'content-type': 'application/json' },
		};

		const axiosConfig = convertN8nRequestToAxios(requestOptions);

		expect(axiosConfig).toEqual(
			expect.objectContaining({
				method: 'POST',
				data: { key: 'value' },
				headers: expect.objectContaining({
					'content-type': 'application/json',
				}),
			}),
		);
	});

	test('should handle form data', () => {
		const formData = new FormData();
		formData.append('key', 'value');

		const requestOptions: IHttpRequestOptions = {
			method: 'POST',
			url: 'https://example.com',
			body: formData,
		};

		const axiosConfig = convertN8nRequestToAxios(requestOptions);

		expect(axiosConfig).toEqual(
			expect.objectContaining({
				method: 'POST',
				data: formData,
				headers: expect.objectContaining({
					...formData.getHeaders(),
					'User-Agent': 'n8n',
				}),
			}),
		);
	});

	test('should handle disable follow redirect', () => {
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: 'https://example.com',
			disableFollowRedirect: true,
		};

		const axiosConfig = convertN8nRequestToAxios(requestOptions);

		expect(axiosConfig.maxRedirects).toBe(0);
	});

	test('should handle SSL certificate validation', () => {
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: 'https://example.com',
			skipSslCertificateValidation: true,
		};

		const axiosConfig = convertN8nRequestToAxios(requestOptions);

		expect(axiosConfig.httpsAgent?.options.rejectUnauthorized).toBe(false);
	});

	test('should ignore HTTP error except for the specified status codes', () => {
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: 'https://example.com',
			ignoreHttpStatusErrors: { ignore: true, except: [401] },
		};

		const axiosConfig = convertN8nRequestToAxios(requestOptions);
		expect(axiosConfig.validateStatus).toBeDefined();
		expect(axiosConfig.validateStatus!(401)).toBe(false);
		expect(axiosConfig.validateStatus!(500)).toBe(true);
	});

	test('should ignore all HTTP errors', () => {
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: 'https://example.com',
			ignoreHttpStatusErrors: true,
		};

		const axiosConfig = convertN8nRequestToAxios(requestOptions);
		expect(axiosConfig.validateStatus).toBeDefined();
		expect(axiosConfig.validateStatus!(401)).toBe(true);
		expect(axiosConfig.validateStatus!(500)).toBe(true);
	});

	test('should pass agentOptions through to the https agent', () => {
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: 'https://example.com',
			agentOptions: {
				ca: TEST_CA_CERT,
			},
		};

		const axiosConfig = convertN8nRequestToAxios(requestOptions);

		expect((axiosConfig.httpsAgent as HttpsAgent).options.ca).toBe(TEST_CA_CERT);
	});

	test('should merge agentOptions with skipSslCertificateValidation', () => {
		const requestOptions: IHttpRequestOptions = {
			method: 'GET',
			url: 'https://example.com',
			skipSslCertificateValidation: true,
			agentOptions: {
				ca: TEST_CA_CERT,
			},
		};

		const axiosConfig = convertN8nRequestToAxios(requestOptions);

		expect((axiosConfig.httpsAgent as HttpsAgent).options.rejectUnauthorized).toBe(false);
		expect((axiosConfig.httpsAgent as HttpsAgent).options.ca).toBe(TEST_CA_CERT);
	});
});

describe('httpRequest', () => {
	const baseUrl = 'https://example.com';

	beforeEach(() => {
		nock.cleanAll();
	});

	test('should make a simple GET request', async () => {
		const scope = nock(baseUrl)
			.get('/users')
			.reply(200, { users: ['John', 'Jane'] });

		const response = await httpRequest({
			method: 'GET',
			url: `${baseUrl}/users`,
		});

		expect(response).toEqual({ users: ['John', 'Jane'] });
		scope.done();
	});

	test('should ignore invalid baseURL when url is absolute', async () => {
		const scope = nock(baseUrl)
			.get('/users')
			.reply(200, { users: ['John', 'Jane'] });

		const response = await httpRequest({
			method: 'GET',
			url: `${baseUrl}/users`,
			baseURL: 'not-a-valid-url',
		});

		expect(response).toEqual({ users: ['John', 'Jane'] });
		scope.done();
	});

	test('should make a POST request with JSON body', async () => {
		const requestBody = { name: 'John', age: 30 };
		const scope = nock(baseUrl)
			.post('/users', requestBody)
			.reply(201, { id: '123', ...requestBody });

		const response = await httpRequest({
			method: 'POST',
			url: `${baseUrl}/users`,
			body: requestBody,
			json: true,
		});

		expect(response).toEqual({ id: '123', name: 'John', age: 30 });
		scope.done();
	});

	test('should return full response when returnFullResponse is true', async () => {
		const scope = nock(baseUrl).get('/data').reply(
			200,
			{ key: 'value' },
			{
				'X-Custom-Header': 'test-header',
			},
		);

		const response = await httpRequest({
			method: 'GET',
			url: `${baseUrl}/data`,
			returnFullResponse: true,
		});

		expect(response).toEqual({
			body: { key: 'value' },
			headers: expect.objectContaining({
				'x-custom-header': 'test-header',
			}),
			statusCode: 200,
			statusMessage: 'OK',
		});
		scope.done();
	});

	test('should handle form data request', async () => {
		const formData = new FormData();
		formData.append('file', 'test content', 'file.txt');

		const scope = nock(baseUrl)
			.post('/upload')
			.matchHeader('content-type', /multipart\/form-data; boundary=/)
			.reply(200, { success: true });

		const response = await httpRequest({
			method: 'POST',
			url: `${baseUrl}/upload`,
			body: formData,
		});

		expect(response).toEqual({ success: true });
		scope.done();
	});

	test('should handle query parameters', async () => {
		const scope = nock(baseUrl)
			.get('/search')
			.query({ q: 'test', page: '1' })
			.reply(200, { results: ['result1', 'result2'] });

		const response = await httpRequest({
			method: 'GET',
			url: `${baseUrl}/search`,
			qs: { q: 'test', page: '1' },
		});

		expect(response).toEqual({ results: ['result1', 'result2'] });
		scope.done();
	});

	test('should ignore HTTP status errors when configured', async () => {
		const scope = nock(baseUrl).get('/error').reply(500, { error: 'Internal Server Error' });

		const response = await httpRequest({
			method: 'GET',
			url: `${baseUrl}/error`,
			ignoreHttpStatusErrors: true,
		});

		expect(response).toEqual({ error: 'Internal Server Error' });
		scope.done();
	});

	test('should handle different array formats in query parameters', async () => {
		const scope = nock(baseUrl)
			.get('/list')
			.query({
				tags: ['tag1', 'tag2'],
				categories: ['cat1', 'cat2'],
			})
			.reply(200, { success: true });

		const response = await httpRequest({
			method: 'GET',
			url: `${baseUrl}/list`,
			qs: {
				tags: ['tag1', 'tag2'],
				categories: ['cat1', 'cat2'],
			},
			arrayFormat: 'indices',
		});

		expect(response).toEqual({ success: true });
		scope.done();
	});

	test('should remove empty body for GET requests', async () => {
		const scope = nock(baseUrl).get('/data').reply(200, { success: true });

		const response = await httpRequest({
			method: 'GET',
			url: `${baseUrl}/data`,
			body: {},
		});

		expect(response).toEqual({ success: true });
		scope.done();
	});

	test('should set default user agent', async () => {
		const scope = nock(baseUrl, {
			reqheaders: {
				'user-agent': 'n8n',
			},
		})
			.get('/test')
			.reply(200, { success: true });

		const response = await httpRequest({
			method: 'GET',
			url: `${baseUrl}/test`,
		});

		expect(response).toEqual({ success: true });
		scope.done();
	});

	test('should respect custom headers', async () => {
		const scope = nock(baseUrl, {
			reqheaders: {
				'X-Custom-Header': 'custom-value',
				'user-agent': 'n8n',
			},
		})
			.get('/test')
			.reply(200, { success: true });

		const response = await httpRequest({
			method: 'GET',
			url: `${baseUrl}/test`,
			headers: { 'X-Custom-Header': 'custom-value' },
		});

		expect(response).toEqual({ success: true });
		scope.done();
	});

	it('should include vendor headers in requests to OpenAi', async () => {
		const { openAiDefaultHeaders } = Container.get(AiConfig);
		const scope = nock('https://api.openai.com', {
			reqheaders: openAiDefaultHeaders,
		})
			.get('/chat')
			.reply(200, { success: true });

		const response = await httpRequest({
			method: 'GET',
			url: 'https://api.openai.com/chat',
			headers: { 'X-Custom-Header': 'custom-value' },
		});
		expect(response).toEqual({ success: true });
		scope.done();
	});

	describe('redirects', () => {
		test.each([[undefined], [true]])(
			'should forward authorization header on cross-origin redirects when sendCredentialsOnCrossOriginRedirect is %s',
			async (sendCredentialsOnCrossOriginRedirect) => {
				nock(baseUrl).get('/redirect').reply(301, '', { Location: 'https://otherdomain.com/test' });
				nock('https://otherdomain.com')
					.get('/test')
					.reply(200, function () {
						return this.req.headers;
					});

				const response = (await httpRequest({
					url: `${baseUrl}/redirect`,
					auth: {
						username: 'testuser',
						password: 'testpassword',
					},
					headers: {
						'X-Other-Header': 'otherHeaderContent',
					},
					sendCredentialsOnCrossOriginRedirect,
				})) as { authorization: string; 'x-other-header': string };

				expect(response.authorization).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3N3b3Jk');
				expect(response['x-other-header']).toBe('otherHeaderContent');
			},
		);

		test('should not forward authorization header on cross-origin redirects when sendCredentialsOnCrossOriginRedirect is false', async () => {
			nock(baseUrl).get('/redirect').reply(301, '', { Location: 'https://otherdomain.com/test' });
			nock('https://otherdomain.com')
				.get('/test')
				.reply(200, function () {
					return this.req.headers;
				});

			const response = (await httpRequest({
				url: `${baseUrl}/redirect`,
				auth: {
					username: 'testuser',
					password: 'testpassword',
				},
				headers: {
					'X-Other-Header': 'otherHeaderContent',
				},
				sendCredentialsOnCrossOriginRedirect: false,
			})) as { authorization: undefined; 'x-other-header': string };

			expect(response.authorization).toBeUndefined();
			expect(response['x-other-header']).toBe('otherHeaderContent');
		});

		test.each([[undefined], [true], [false]])(
			'should forward authorization header on same-origin redirects when sendCredentialsOnCrossOriginRedirect is %s',
			async (sendCredentialsOnCrossOriginRedirect) => {
				nock(baseUrl)
					.get('/redirect')
					.reply(301, '', { Location: `${baseUrl}/test` });
				nock(baseUrl)
					.get('/test')
					.reply(200, function () {
						return this.req.headers;
					});

				const response = (await httpRequest({
					url: `${baseUrl}/redirect`,
					auth: {
						username: 'testuser',
						password: 'testpassword',
					},
					headers: {
						'X-Other-Header': 'otherHeaderContent',
					},
					sendCredentialsOnCrossOriginRedirect,
				})) as { authorization: string; 'x-other-header': string };

				expect(response.authorization).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3N3b3Jk');
				expect(response['x-other-header']).toBe('otherHeaderContent');
			},
		);
	});
});

describe('SSRF protection', () => {
	const baseUrl = 'https://example.com';

	const createSsrfBridge = (overrides?: Partial<SsrfBridge>): SsrfBridge => ({
		validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
		validateUrl: vi.fn().mockResolvedValue({ ok: true, result: undefined }),
		validateConnectionHost: vi.fn().mockReturnValue({ ok: true, result: undefined }),
		validateRedirectSync: vi.fn(),
		createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
		...overrides,
	});

	beforeEach(() => {
		nock.cleanAll();
	});

	describe('convertN8nRequestToAxios with ssrfBridge', () => {
		test('should inject secureLookup into agent options when no proxy', () => {
			const lookupFn = vi.fn();
			const ssrfBridge = createSsrfBridge({
				createSecureLookup: vi.fn().mockReturnValue(lookupFn),
			});

			const axiosConfig = convertN8nRequestToAxios(
				{ method: 'GET', url: 'https://example.com/test' },
				ssrfBridge,
			);

			expect(ssrfBridge.createSecureLookup).toHaveBeenCalled();
			expect((axiosConfig.httpsAgent as HttpsAgent).options.lookup).toBe(lookupFn);
		});

		test('should NOT inject secureLookup when proxy is configured', () => {
			const lookupFn = vi.fn();
			const ssrfBridge = createSsrfBridge({
				createSecureLookup: vi.fn().mockReturnValue(lookupFn),
			});

			const axiosConfig = convertN8nRequestToAxios(
				{
					method: 'GET',
					url: 'https://example.com/test',
					proxy: { host: 'my-proxy', port: 8080 },
				},
				ssrfBridge,
			);

			expect((axiosConfig.httpsAgent as HttpsAgent).options.lookup).toBeUndefined();
		});

		test('should not inject secureLookup when ssrfBridge is absent', () => {
			const axiosConfig = convertN8nRequestToAxios({
				method: 'GET',
				url: 'https://example.com/test',
			});

			expect((axiosConfig.httpsAgent as HttpsAgent).options.lookup).toBeUndefined();
		});
	});

	describe('domain allowlist enforcement', () => {
		describe('httpRequest', () => {
			test('should block requests to disallowed domains', async () => {
				await expect(
					httpRequest({
						method: 'GET',
						url: `${baseUrl}/data`,
						allowedDomains: 'other.com',
					}),
				).rejects.toThrow('Domain not allowed');
			});

			test.each([['example.com'], [undefined]])(
				'should allow requests to allowed domains when allowedDomains is %s',
				async (allowedDomains) => {
					nock(baseUrl).get('/data').reply(200, 'ok');

					const response = await httpRequest({
						method: 'GET',
						url: `${baseUrl}/data`,
						allowedDomains,
					});

					expect(response).toEqual('ok');
				},
			);

			test('should block redirects to disallowed domains', async () => {
				nock(baseUrl).get('/redirect').reply(301, '', { Location: 'https://not-allowed.com/data' });
				nock('https://not-allowed.com').get('/data').reply(200, 'not-ok');

				await expect(
					httpRequest({
						method: 'GET',
						url: `${baseUrl}/redirect`,
						allowedDomains: 'example.com',
					}),
				).rejects.toThrow('Domain not allowed');
			});

			test.each([['example.com, allowed.com'], [undefined]])(
				'should allow redirects to allowed domains when allowedDomains is %s',
				async (allowedDomains) => {
					nock(baseUrl).get('/redirect').reply(301, '', { Location: 'https://allowed.com/data' });
					nock('https://allowed.com').get('/data').reply(200, 'ok');

					const response = await httpRequest({
						method: 'GET',
						url: `${baseUrl}/redirect`,
						allowedDomains,
					});

					expect(response).toEqual('ok');
				},
			);

			test('should support wildcard domains in allowedDomains', async () => {
				nock('https://api.example.com').get('/data').reply(200, 'ok');

				const response = await httpRequest({
					method: 'GET',
					url: 'https://api.example.com/data',
					allowedDomains: '*.example.com',
				});

				expect(response).toEqual('ok');
			});

			test('should block wildcard domains that do not match', async () => {
				await expect(
					httpRequest({
						method: 'GET',
						url: 'https://blocked.com/data',
						allowedDomains: '*.example.com',
					}),
				).rejects.toThrow('Domain not allowed');
			});
		});

		describe('convertN8nRequestToAxios', () => {
			test('should pass allowedDomains to beforeRedirect', () => {
				const axiosConfig = convertN8nRequestToAxios({
					method: 'GET',
					url: `${baseUrl}/test`,
					allowedDomains: 'example.com',
				});
				const redirectOptions = {
					agents: {},
					hostname: 'not-allowed.com',
					href: 'https://not-allowed.com/data',
				};

				expect(axiosConfig.beforeRedirect).toBeDefined();
				expect(() => axiosConfig.beforeRedirect!(redirectOptions, mock(), mock())).toThrow(
					'Domain not allowed',
				);
			});

			test.each([['example.com'], [undefined]])(
				'should not block redirects when allowedDomains is %s',
				(allowedDomains) => {
					const axiosConfig = convertN8nRequestToAxios({
						method: 'GET',
						url: `${baseUrl}/test`,
						allowedDomains,
					});
					const redirectOptions = {
						agents: {},
						hostname: 'example.com',
						href: 'https://example.com/data',
					};

					expect(axiosConfig.beforeRedirect).toBeDefined();
					expect(() => axiosConfig.beforeRedirect!(redirectOptions, mock(), mock())).not.toThrow();
				},
			);
		});
	});
});
