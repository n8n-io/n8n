import FormData from 'form-data';
import type { Agent as HttpsAgent } from 'https';
import type {
	IHttpRequestMethods,
	INode,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import nock from 'nock';
import type { SecureContextOptions } from 'tls';
import { mock } from 'vitest-mock-extended';

import type { ExecutionLifecycleHooks } from '@/execution-engine/execution-lifecycle-hooks';
import type { SsrfBridge } from '@/ssrf';

import { parseRequestObject, proxyRequestToAxios } from '../legacy-request-adapter';

const TEST_CA_CERT = '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----';

describe('proxyRequestToAxios', () => {
	const baseUrl = 'https://example.de';
	const workflow = mock<Workflow>();
	const hooks = mock<ExecutionLifecycleHooks>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		hooks,
		ssrfBridge: undefined,
	});
	const node = mock<INode>();

	beforeEach(() => {
		hooks.runHook.mockClear();
	});

	test('should rethrow an error with `status` property', async () => {
		nock(baseUrl).get('/test').reply(400);

		try {
			await proxyRequestToAxios(workflow, additionalData, node, `${baseUrl}/test`);
		} catch (error) {
			expect(error.status).toEqual(400);
		}
	});

	test('should not throw if the response status is 200', async () => {
		nock(baseUrl).get('/test').reply(200);
		await proxyRequestToAxios(workflow, additionalData, node, `${baseUrl}/test`);
		expect(hooks.runHook).toHaveBeenCalledWith('nodeFetchedData', [workflow.id, node]);
	});

	test('should throw if the response status is 403', async () => {
		const headers = { 'content-type': 'text/plain' };
		nock(baseUrl).get('/test').reply(403, 'Forbidden', headers);
		try {
			await proxyRequestToAxios(workflow, additionalData, node, `${baseUrl}/test`);
		} catch (error) {
			expect(error.statusCode).toEqual(403);
			expect(error.request).toBeUndefined();
			expect(error.response).toMatchObject({ headers, status: 403 });
			expect(error.options).toMatchObject({
				headers: { Accept: '*/*' },
				method: 'get',
				url: 'https://example.de/test',
			});
			expect(error.config).toBeUndefined();
			expect(error.message).toEqual('403 - "Forbidden"');
		}
		expect(hooks.runHook).not.toHaveBeenCalled();
	});

	test('should not throw if the response status is 404, but `simple` option is set to `false`', async () => {
		nock(baseUrl).get('/test').reply(404, 'Not Found');
		const response = await proxyRequestToAxios(workflow, additionalData, node, {
			url: `${baseUrl}/test`,
			simple: false,
		});

		expect(response).toEqual('Not Found');
		expect(hooks.runHook).toHaveBeenCalledWith('nodeFetchedData', [workflow.id, node]);
	});

	test('should return full response when `resolveWithFullResponse` is set to true', async () => {
		nock(baseUrl).get('/test').reply(404, 'Not Found');
		const response = await proxyRequestToAxios(workflow, additionalData, node, {
			url: `${baseUrl}/test`,
			resolveWithFullResponse: true,
			simple: false,
		});

		expect(response).toMatchObject({
			body: 'Not Found',
			headers: {},
			statusCode: 404,
			statusMessage: 'Not Found',
		});
		expect(hooks.runHook).toHaveBeenCalledWith('nodeFetchedData', [workflow.id, node]);
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

				const response = await proxyRequestToAxios(workflow, additionalData, node, {
					url: `${baseUrl}/redirect`,
					auth: {
						username: 'testuser',
						password: 'testpassword',
					},
					headers: {
						'X-Other-Header': 'otherHeaderContent',
					},
					resolveWithFullResponse: true,
					sendCredentialsOnCrossOriginRedirect,
				});

				expect(response.statusCode).toBe(200);
				const forwardedHeaders = JSON.parse(response.body);
				expect(forwardedHeaders.authorization).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3N3b3Jk');
				expect(forwardedHeaders['x-other-header']).toBe('otherHeaderContent');
			},
		);

		test('should not forward authorization header on cross-origin redirects when sendCredentialsOnCrossOriginRedirect is false', async () => {
			nock(baseUrl).get('/redirect').reply(301, '', { Location: 'https://otherdomain.com/test' });
			nock('https://otherdomain.com')
				.get('/test')
				.reply(200, function () {
					return this.req.headers;
				});

			const response = await proxyRequestToAxios(workflow, additionalData, node, {
				url: `${baseUrl}/redirect`,
				auth: {
					username: 'testuser',
					password: 'testpassword',
				},
				headers: {
					'X-Other-Header': 'otherHeaderContent',
				},
				resolveWithFullResponse: true,
				sendCredentialsOnCrossOriginRedirect: false,
			});

			expect(response.statusCode).toBe(200);
			const forwardedHeaders = JSON.parse(response.body);
			expect(forwardedHeaders.authorization).toBeUndefined();
			expect(forwardedHeaders['x-other-header']).toBe('otherHeaderContent');
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

				const response = await proxyRequestToAxios(workflow, additionalData, node, {
					url: `${baseUrl}/redirect`,
					auth: {
						username: 'testuser',
						password: 'testpassword',
					},
					headers: {
						'X-Other-Header': 'otherHeaderContent',
					},
					resolveWithFullResponse: true,
					sendCredentialsOnCrossOriginRedirect,
				});

				expect(response.statusCode).toBe(200);
				const forwardedHeaders = JSON.parse(response.body);
				expect(forwardedHeaders.authorization).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3N3b3Jk');
				expect(forwardedHeaders['x-other-header']).toBe('otherHeaderContent');
			},
		);

		test('should follow redirects by default', async () => {
			nock(baseUrl)
				.get('/redirect')
				.reply(301, '', { Location: `${baseUrl}/test` });
			nock(baseUrl).get('/test').reply(200, 'Redirected');

			const response = await proxyRequestToAxios(workflow, additionalData, node, {
				url: `${baseUrl}/redirect`,
				resolveWithFullResponse: true,
			});

			expect(response).toMatchObject({
				body: 'Redirected',
				headers: {},
				statusCode: 200,
			});
		});

		test('should not follow redirects when configured', async () => {
			nock(baseUrl)
				.get('/redirect')
				.reply(301, '', { Location: `${baseUrl}/test` });
			nock(baseUrl).get('/test').reply(200, 'Redirected');

			await expect(
				proxyRequestToAxios(workflow, additionalData, node, {
					url: `${baseUrl}/redirect`,
					resolveWithFullResponse: true,
					followRedirect: false,
				}),
			).rejects.toThrowError(expect.objectContaining({ statusCode: 301 }));
		});
	});
});

describe('parseRequestObject', () => {
	test('should handle basic request options', async () => {
		const axiosOptions = await parseRequestObject({
			url: 'https://example.com',
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: { key: 'value' },
		});

		expect(axiosOptions).toEqual(
			expect.objectContaining({
				url: 'https://example.com',
				method: 'POST',
				headers: {
					accept: '*/*',
					'content-type': 'application/json',
					'User-Agent': 'n8n',
				},
				data: { key: 'value' },
				maxRedirects: 0,
			}),
		);
	});

	test('should set default User-Agent when none provided', async () => {
		const axiosOptions = await parseRequestObject({
			url: 'https://example.com',
			method: 'GET',
		});

		expect(axiosOptions.headers).toMatchObject({ 'User-Agent': 'n8n' });
	});

	test('should preserve a caller-supplied User-Agent header', async () => {
		const axiosOptions = await parseRequestObject({
			url: 'https://example.com',
			method: 'GET',
			headers: { 'User-Agent': 'MyCustomNode/1.0' },
		});

		expect(axiosOptions.headers).toMatchObject({ 'User-Agent': 'MyCustomNode/1.0' });
		expect(axiosOptions.headers).not.toMatchObject({ 'User-Agent': 'n8n' });
	});

	test('should set correct headers for FormData', async () => {
		const formData = new FormData();
		formData.append('key', 'value');

		const axiosOptions = await parseRequestObject({
			url: 'https://example.com',
			formData,
			headers: {
				'content-type': 'multipart/form-data',
			},
		});

		expect(axiosOptions.headers).toMatchObject({
			accept: '*/*',
			'content-length': 163,
			'content-type': expect.stringMatching(/^multipart\/form-data; boundary=/),
		});

		expect(axiosOptions.data).toBeInstanceOf(FormData);
	});

	test('should handle FormData from a different module copy (duck-typing)', async () => {
		// Simulate a FormData created by a different copy of the form-data package.
		// instanceof FormData would return false, but duck-type check should pass.
		const realFormData = new FormData();
		realFormData.append('key', 'value');

		// Create a wrapper that breaks instanceof but preserves the interface
		const foreignFormData: Record<string, unknown> = Object.create(null);
		for (const prop of Object.getOwnPropertyNames(Object.getPrototypeOf(realFormData))) {
			const value = (realFormData as unknown as Record<string, unknown>)[prop];
			if (typeof value === 'function') {
				foreignFormData[prop] = value.bind(realFormData);
			}
		}
		for (const prop of Object.getOwnPropertyNames(realFormData)) {
			foreignFormData[prop] = (realFormData as unknown as Record<string, unknown>)[prop];
		}

		// Verify it's NOT an instanceof FormData
		expect(foreignFormData instanceof FormData).toBe(false);

		const axiosOptions = await parseRequestObject({
			url: 'https://example.com',
			formData: foreignFormData as unknown as FormData,
			headers: {
				'content-type': 'multipart/form-data',
			},
		});

		expect(axiosOptions.headers).toMatchObject({
			'content-type': expect.stringMatching(/^multipart\/form-data; boundary=/),
		});
	});

	test('should not use Host header for SNI', async () => {
		const axiosOptions = await parseRequestObject({
			url: 'https://example.de/foo/bar',
			headers: { Host: 'other.host.com' },
		});
		expect((axiosOptions.httpsAgent as HttpsAgent).options.servername).toEqual('example.de');
	});

	describe('should set SSL certificates', () => {
		const agentOptions: SecureContextOptions = {
			ca: TEST_CA_CERT,
		};
		const requestObject: IRequestOptions = {
			method: 'GET',
			uri: 'https://example.de',
			agentOptions,
		};

		test('on regular requests', async () => {
			const axiosOptions = await parseRequestObject(requestObject);
			expect((axiosOptions.httpsAgent as HttpsAgent).options).toMatchObject({
				servername: 'example.de',
				...agentOptions,
				noDelay: true,
				path: null,
			});
		});

		test('on redirected requests', async () => {
			const axiosOptions = await parseRequestObject(requestObject);
			expect(axiosOptions.beforeRedirect).toBeDefined;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const redirectOptions: Record<string, any> = {
				agents: {},
				hostname: 'example.de',
				href: requestObject.uri,
			};
			axiosOptions.beforeRedirect!(redirectOptions, mock(), mock());
			expect(redirectOptions.agent).toEqual(redirectOptions.agents.https);
			expect((redirectOptions.agent as HttpsAgent).options).toMatchObject({
				servername: 'example.de',
				...agentOptions,
				noDelay: true,
				path: null,
			});
		});
	});

	describe('when followRedirect is true', () => {
		test.each(['GET', 'HEAD'] as IHttpRequestMethods[])(
			'should set maxRedirects on %s ',
			async (method) => {
				const axiosOptions = await parseRequestObject({
					method,
					followRedirect: true,
					maxRedirects: 1234,
				});
				expect(axiosOptions.maxRedirects).toEqual(1234);
			},
		);

		test.each(['POST', 'PUT', 'PATCH', 'DELETE'] as IHttpRequestMethods[])(
			'should not set maxRedirects on %s ',
			async (method) => {
				const axiosOptions = await parseRequestObject({
					method,
					followRedirect: true,
					maxRedirects: 1234,
				});
				expect(axiosOptions.maxRedirects).toEqual(0);
			},
		);
	});

	describe('when followAllRedirects is true', () => {
		test.each(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as IHttpRequestMethods[])(
			'should set maxRedirects on %s ',
			async (method) => {
				const axiosOptions = await parseRequestObject({
					method,
					followAllRedirects: true,
					maxRedirects: 1234,
				});
				expect(axiosOptions.maxRedirects).toEqual(1234);
			},
		);
	});

	describe('domain allowlist enforcement', () => {
		const baseUrl = 'https://example.com';

		beforeEach(() => {
			nock.cleanAll();
		});

		test('should pass allowedDomains to beforeRedirect', async () => {
			const axiosOptions = await parseRequestObject({
				url: `${baseUrl}/test`,
				allowedDomains: 'example.com',
			});
			const redirectOptions = {
				agents: {},
				hostname: 'not-allowed.com',
				href: 'https://not-allowed.com/data',
			};

			expect(axiosOptions.beforeRedirect).toBeDefined();
			expect(() => axiosOptions.beforeRedirect!(redirectOptions, mock(), mock())).toThrow(
				'Domain not allowed',
			);
		});

		test.each([['example.com'], [undefined]])(
			'should not block redirects when allowedDomains is %s',
			async (allowedDomains) => {
				const axiosOptions = await parseRequestObject({
					url: `${baseUrl}/test`,
					allowedDomains,
				});
				const redirectOptions = {
					agents: {},
					hostname: 'example.com',
					href: 'https://example.com/data',
				};

				expect(axiosOptions.beforeRedirect).toBeDefined();
				expect(() => axiosOptions.beforeRedirect!(redirectOptions, mock(), mock())).not.toThrow();
			},
		);
	});
});

describe('SSRF protection', () => {
	const baseUrl = 'https://example.com';
	const workflow = mock<Workflow>();
	const hooks = mock<ExecutionLifecycleHooks>();
	const node = mock<INode>();

	const createSsrfBridge = (overrides?: Partial<SsrfBridge>): SsrfBridge => ({
		validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
		validateUrl: vi.fn().mockResolvedValue({ ok: true, result: undefined }),
		validateRedirectSync: vi.fn(),
		createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
		...overrides,
	});

	beforeEach(() => {
		nock.cleanAll();
		hooks.runHook.mockClear();
	});

	test('proxyRequestToAxios should resolve baseURL + relative url for validateUrl', async () => {
		const ssrfBridge = createSsrfBridge();
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			hooks,
			ssrfBridge,
		});

		nock(baseUrl).get('/test').reply(200, 'ok');

		const response = await proxyRequestToAxios(workflow, additionalData, node, {
			baseURL: baseUrl,
			url: '/test',
		});

		expect(response).toEqual('ok');
		expect(ssrfBridge.validateUrl).toHaveBeenCalledWith(new URL(`${baseUrl}/test`));
	});

	describe('domain allowlist enforcement', () => {
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			hooks,
			ssrfBridge: undefined,
		});

		beforeEach(() => {
			nock.cleanAll();
		});

		describe('proxyRequestToAxios', () => {
			test('should block requests to disallowed domains', async () => {
				await expect(
					proxyRequestToAxios(workflow, additionalData, node, {
						url: `${baseUrl}/data`,
						allowedDomains: 'other.com',
					}),
				).rejects.toThrow('Domain not allowed');
			});

			test.each([['example.com'], [undefined]])(
				'should allow requests to allowed domains when allowedDomains is %s',
				async (allowedDomains) => {
					nock(baseUrl).get('/data').reply(200, 'ok');

					const response = await proxyRequestToAxios(workflow, additionalData, node, {
						url: `${baseUrl}/data`,
						allowedDomains,
					});

					expect(response).toBe('ok');
				},
			);

			test('should block redirects to disallowed domains', async () => {
				nock(baseUrl).get('/redirect').reply(301, '', { Location: 'https://not-allowed.com/data' });
				nock('https://not-allowed.com').get('/data').reply(200, 'not-ok');

				await expect(
					proxyRequestToAxios(workflow, additionalData, node, {
						url: `${baseUrl}/redirect`,
						allowedDomains: 'example.com',
						followAllRedirects: true,
					}),
				).rejects.toThrow('Domain not allowed');
			});

			test.each([['example.com, allowed.com'], [undefined]])(
				'should allow redirects to allowed domains when allowedDomains is %s',
				async (allowedDomains) => {
					nock(baseUrl).get('/redirect').reply(301, '', { Location: 'https://allowed.com/data' });
					nock('https://allowed.com').get('/data').reply(200, 'ok');

					const response = await proxyRequestToAxios(workflow, additionalData, node, {
						url: `${baseUrl}/redirect`,
						allowedDomains,
						followAllRedirects: true,
					});

					expect(response).toBe('ok');
				},
			);

			test('should support wildcard domains in allowedDomains', async () => {
				nock('https://api.example.com').get('/data').reply(200, 'ok');

				const response = await proxyRequestToAxios(workflow, additionalData, node, {
					url: 'https://api.example.com/data',
					allowedDomains: '*.example.com',
				});

				expect(response).toBe('ok');
			});

			test('should block wildcard domains that do not match', async () => {
				await expect(
					proxyRequestToAxios(workflow, additionalData, node, {
						url: 'https://blocked.com/data',
						allowedDomains: '*.example.com',
					}),
				).rejects.toThrow('Domain not allowed');
			});
		});
	});
});
