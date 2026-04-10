import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import FormData from 'form-data';
import type { Agent as HttpsAgent } from 'https';
import { mock, mockDeep } from 'jest-mock-extended';
import type {
	IAllExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INode,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
	PaginationOptions,
	Workflow,
} from 'n8n-workflow';
import nock from 'nock';
import type { SecureContextOptions } from 'tls';

import type { SsrfBridge } from '@/execution-engine';
import type { ExecutionLifecycleHooks } from '@/execution-engine/execution-lifecycle-hooks';

import {
	applyPaginationRequestData,
	convertN8nRequestToAxios,
	httpRequest,
	invokeAxios,
	parseRequestObject,
	proxyRequestToAxios,
	refreshOAuth2Token,
	removeEmptyBody,
	requestOAuth2,
} from '../request-helper-functions';

describe('Request Helper Functions', () => {
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
					nock(baseUrl)
						.get('/redirect')
						.reply(301, '', { Location: 'https://otherdomain.com/test' });
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

	describe('invokeAxios', () => {
		const baseUrl = 'https://example.de';

		beforeEach(() => {
			nock.cleanAll();
			jest.clearAllMocks();
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
					headers: { accept: '*/*', 'content-type': 'application/json' },
					data: { key: 'value' },
					maxRedirects: 0,
				}),
			);
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
				ca: '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----',
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
				axiosOptions.beforeRedirect!(redirectOptions, mock());
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
	});

	describe('applyPaginationRequestData', () => {
		test('should merge pagination request data with original request options', () => {
			const originalRequestOptions: IRequestOptions = {
				uri: 'https://original.com/api',
				method: 'GET',
				qs: { page: 1 },
				headers: { 'X-Original-Header': 'original' },
			};

			const paginationRequestData: PaginationOptions['request'] = {
				url: 'https://pagination.com/api',
				body: { key: 'value' },
				headers: { 'X-Pagination-Header': 'pagination' },
			};

			const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

			expect(result).toEqual({
				uri: 'https://pagination.com/api',
				url: 'https://pagination.com/api',
				method: 'GET',
				qs: { page: 1 },
				headers: {
					'X-Original-Header': 'original',
					'X-Pagination-Header': 'pagination',
				},
				body: { key: 'value' },
			});
		});

		test('should handle formData correctly', () => {
			const originalRequestOptions: IRequestOptions = {
				uri: 'https://original.com/api',
				method: 'POST',
				formData: { original: 'data' },
			};

			const paginationRequestData: PaginationOptions['request'] = {
				url: 'https://pagination.com/api',
				body: { key: 'value' },
			};

			const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

			expect(result).toEqual({
				uri: 'https://pagination.com/api',
				url: 'https://pagination.com/api',
				method: 'POST',
				formData: { key: 'value', original: 'data' },
			});
		});

		test('should handle form data correctly', () => {
			const originalRequestOptions: IRequestOptions = {
				uri: 'https://original.com/api',
				method: 'POST',
				form: { original: 'data' },
			};

			const paginationRequestData: PaginationOptions['request'] = {
				url: 'https://pagination.com/api',
				body: { key: 'value' },
			};

			const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

			expect(result).toEqual({
				uri: 'https://pagination.com/api',
				url: 'https://pagination.com/api',
				method: 'POST',
				form: { key: 'value', original: 'data' },
			});
		});

		test('should prefer pagination body over original body', () => {
			const originalRequestOptions: IRequestOptions = {
				uri: 'https://original.com/api',
				method: 'POST',
				body: { original: 'data' },
			};

			const paginationRequestData: PaginationOptions['request'] = {
				url: 'https://pagination.com/api',
				body: { key: 'value' },
			};

			const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

			expect(result).toEqual({
				uri: 'https://pagination.com/api',
				url: 'https://pagination.com/api',
				method: 'POST',
				body: { key: 'value', original: 'data' },
			});
		});

		test('should merge complex request options', () => {
			const originalRequestOptions: IRequestOptions = {
				uri: 'https://original.com/api',
				method: 'GET',
				qs: { page: 1, limit: 10 },
				headers: { 'X-Original-Header': 'original' },
				body: { filter: 'active' },
			};

			const paginationRequestData: PaginationOptions['request'] = {
				url: 'https://pagination.com/api',
				body: { key: 'value' },
				headers: { 'X-Pagination-Header': 'pagination' },
				qs: { offset: 20 },
			};

			const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

			expect(result).toEqual({
				uri: 'https://pagination.com/api',
				url: 'https://pagination.com/api',
				method: 'GET',
				qs: { offset: 20, limit: 10, page: 1 },
				headers: {
					'X-Original-Header': 'original',
					'X-Pagination-Header': 'pagination',
				},
				body: { key: 'value', filter: 'active' },
			});
		});

		test('should handle edge cases with empty pagination data', () => {
			const originalRequestOptions: IRequestOptions = {
				uri: 'https://original.com/api',
				method: 'GET',
			};

			const paginationRequestData: PaginationOptions['request'] = {};

			const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

			expect(result).toEqual({
				uri: 'https://original.com/api',
				method: 'GET',
			});
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
					nock(baseUrl)
						.get('/redirect')
						.reply(301, '', { Location: 'https://otherdomain.com/test' });
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

	describe('refreshOAuth2Token', () => {
		const baseUrl = 'https://example.com';
		const mockThis = mockDeep<IAllExecuteFunctions>();
		const mockNode = mockDeep<INode>();
		const mockAdditionalData = mockDeep<IWorkflowExecuteAdditionalData>();
		const mockCredentialData = {
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			grantType: 'authorizationCode',
			authUrl: 'https://example.com/auth',
			accessTokenUrl: 'https://example.com/token',
			authentication: 'body',
			scope: 'openid',
			oauthTokenData: {
				access_token: 'old-token',
				refresh_token: 'old-refresh-token',
			},
		};

		beforeEach(() => {
			nock.cleanAll();
			jest.resetAllMocks();
			mockNode.name = 'test-node-name';
			mockNode.credentials = {
				'test-credentials-type': {
					id: 'test-credentials-id',
					name: 'test-credentials-name',
				},
			};
		});

		test('should refresh the OAuth2 token with pkce grant type', async () => {
			mockThis.getCredentials.mockResolvedValue({
				...mockCredentialData,
				clientSecret: undefined,
				grantType: 'pkce',
			});
			nock(baseUrl)
				.post('/token', {
					client_id: 'test-client-id',
					grant_type: 'refresh_token',
					refresh_token: 'old-refresh-token',
				})
				.reply(200, {
					access_token: 'new-token',
					refresh_token: 'new-refresh-token',
				});

			const result = await refreshOAuth2Token.call(
				mockThis,
				'test-credentials-type',
				mockNode,
				mockAdditionalData,
			);

			expect(result).toEqual({
				access_token: 'new-token',
				refresh_token: 'new-refresh-token',
			});
			expect(
				mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
			).toHaveBeenCalledWith(
				mockNode.credentials!['test-credentials-type'],
				'test-credentials-type',
				expect.objectContaining({
					oauthTokenData: expect.objectContaining({
						access_token: 'new-token',
						refresh_token: 'new-refresh-token',
					}),
				}),
				mockAdditionalData,
			);
		});

		test('should refresh the OAuth2 token with client credentials grant type', async () => {
			mockThis.getCredentials.mockResolvedValue({
				...mockCredentialData,
				grantType: 'clientCredentials',
			});
			nock(baseUrl)
				.post('/token', {
					client_id: 'test-client-id',
					client_secret: 'test-client-secret',
					grant_type: 'client_credentials',
					scope: 'openid',
				})
				.reply(200, {
					access_token: 'new-token',
					refresh_token: 'new-refresh-token',
				});

			const result = await refreshOAuth2Token.call(
				mockThis,
				'test-credentials-type',
				mockNode,
				mockAdditionalData,
			);

			expect(result).toEqual({
				access_token: 'new-token',
				refresh_token: 'new-refresh-token',
			});
			expect(
				mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
			).toHaveBeenCalledWith(
				mockNode.credentials!['test-credentials-type'],
				'test-credentials-type',
				expect.objectContaining({
					oauthTokenData: expect.objectContaining({
						access_token: 'new-token',
						refresh_token: 'new-refresh-token',
					}),
				}),
				mockAdditionalData,
			);
		});

		test('should refresh the OAuth2 token with authorization code grant type', async () => {
			mockThis.getCredentials.mockResolvedValue(mockCredentialData);
			nock(baseUrl)
				.post('/token', {
					client_id: 'test-client-id',
					client_secret: 'test-client-secret',
					grant_type: 'refresh_token',
					refresh_token: 'old-refresh-token',
				})
				.reply(200, {
					access_token: 'new-token',
					refresh_token: 'new-refresh-token',
				});

			const result = await refreshOAuth2Token.call(
				mockThis,
				'test-credentials-type',
				mockNode,
				mockAdditionalData,
			);

			expect(result).toEqual({
				access_token: 'new-token',
				refresh_token: 'new-refresh-token',
			});
			expect(
				mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
			).toHaveBeenCalledWith(
				mockNode.credentials!['test-credentials-type'],
				'test-credentials-type',
				expect.objectContaining({
					oauthTokenData: expect.objectContaining({
						access_token: 'new-token',
						refresh_token: 'new-refresh-token',
					}),
				}),
				mockAdditionalData,
			);
		});

		test('should throw an error if the OAuth2 token is not connected', async () => {
			mockThis.getCredentials.mockResolvedValue({
				...mockCredentialData,
				oauthTokenData: undefined,
			});

			await expect(
				refreshOAuth2Token.call(mockThis, 'test-credentials-type', mockNode, mockAdditionalData),
			).rejects.toThrow('OAuth credentials not connected');
			expect(
				mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
			).not.toHaveBeenCalled();
		});

		test('should throw an error if node does not have credentials', async () => {
			mockNode.credentials!['test-credentials-type'] = undefined!;
			mockThis.getCredentials.mockResolvedValue(mockCredentialData);
			nock(baseUrl).post('/token').reply(200, {
				access_token: 'new-token',
				refresh_token: 'new-refresh-token',
			});

			await expect(
				refreshOAuth2Token.call(mockThis, 'test-credentials-type', mockNode, mockAdditionalData),
			).rejects.toThrow('Node does not have credential type');
			expect(
				mockAdditionalData.credentialsHelper.updateCredentialsOauthTokenData,
			).not.toHaveBeenCalled();
		});
	});

	describe('requestOAuth2 - tokenExpiredStatusCode', () => {
		const baseUrl = 'https://api.example.com';
		const tokenUrl = 'https://auth.example.com';
		const mockThis = mockDeep<IAllExecuteFunctions>();
		const mockNode = mockDeep<INode>();
		const mockAdditionalData = mockDeep<IWorkflowExecuteAdditionalData>();

		const makeCredentialData = (overrides?: Record<string, unknown>) => ({
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			grantType: 'clientCredentials',
			accessTokenUrl: `${tokenUrl}/token`,
			authentication: 'body',
			scope: 'read',
			oauthTokenData: {
				access_token: 'expired-token',
				token_type: 'bearer',
			},
			...overrides,
		});

		beforeEach(() => {
			nock.cleanAll();
			jest.resetAllMocks();
			mockNode.name = 'test-node';
			mockNode.credentials = {
				testOAuth2: {
					id: 'cred-id',
					name: 'cred-name',
				},
			};
		});

		test('should retry on 401 by default (isN8nRequest path)', async () => {
			mockThis.getCredentials.mockResolvedValue(makeCredentialData());

			// First call returns 401
			nock(baseUrl).get('/data').reply(401, 'Unauthorized');
			// Token re-fetch
			nock(tokenUrl).post('/token').reply(200, {
				access_token: 'new-token',
				token_type: 'bearer',
			});
			// Retry succeeds
			nock(baseUrl).get('/data').reply(200, { success: true });

			mockThis.helpers.httpRequest.mockRejectedValueOnce(
				Object.assign(new Error('401'), { response: { status: 401 } }),
			);
			mockThis.helpers.httpRequest.mockResolvedValueOnce({ success: true });

			const result = await requestOAuth2.call(
				mockThis,
				'testOAuth2',
				{ method: 'GET', url: `${baseUrl}/data` },
				mockNode,
				mockAdditionalData,
				undefined,
				true, // isN8nRequest
			);

			expect(result).toEqual({ success: true });
			expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(2);
		});

		test('should retry on custom tokenExpiredStatusCode from credentials (isN8nRequest path)', async () => {
			mockThis.getCredentials.mockResolvedValue(
				makeCredentialData({ tokenExpiredStatusCode: 403 }),
			);

			// Token re-fetch
			nock(tokenUrl).post('/token').reply(200, {
				access_token: 'new-token',
				token_type: 'bearer',
			});

			mockThis.helpers.httpRequest.mockRejectedValueOnce(
				Object.assign(new Error('403'), { response: { status: 403 } }),
			);
			mockThis.helpers.httpRequest.mockResolvedValueOnce({ success: true });

			const result = await requestOAuth2.call(
				mockThis,
				'testOAuth2',
				{ method: 'GET', url: `${baseUrl}/data` },
				mockNode,
				mockAdditionalData,
				undefined,
				true,
			);

			expect(result).toEqual({ success: true });
			expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(2);
		});

		test('should NOT retry on 401 when credential sets tokenExpiredStatusCode to 403 (isN8nRequest path)', async () => {
			mockThis.getCredentials.mockResolvedValue(
				makeCredentialData({ tokenExpiredStatusCode: 403 }),
			);

			const error401 = Object.assign(new Error('401'), { response: { status: 401 } });
			mockThis.helpers.httpRequest.mockRejectedValueOnce(error401);

			await expect(
				requestOAuth2.call(
					mockThis,
					'testOAuth2',
					{ method: 'GET', url: `${baseUrl}/data` },
					mockNode,
					mockAdditionalData,
					undefined,
					true,
				),
			).rejects.toThrow('401');

			expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(1);
		});

		test('credential-level tokenExpiredStatusCode should take priority over oAuth2Options', async () => {
			mockThis.getCredentials.mockResolvedValue(
				makeCredentialData({ tokenExpiredStatusCode: 403 }),
			);

			// Token re-fetch
			nock(tokenUrl).post('/token').reply(200, {
				access_token: 'new-token',
				token_type: 'bearer',
			});

			// credential says 403, oAuth2Options says 429 — 403 should win
			const error403 = Object.assign(new Error('403'), { response: { status: 403 } });
			mockThis.helpers.httpRequest.mockRejectedValueOnce(error403);
			mockThis.helpers.httpRequest.mockResolvedValueOnce({ success: true });

			const result = await requestOAuth2.call(
				mockThis,
				'testOAuth2',
				{ method: 'GET', url: `${baseUrl}/data` },
				mockNode,
				mockAdditionalData,
				{ tokenExpiredStatusCode: 429 },
				true,
			);

			expect(result).toEqual({ success: true });
			expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(2);
		});
	});

	describe('requestOAuth2 - client credentials initial token fetch', () => {
		const baseUrl = 'https://api.example.com';
		const tokenUrl = 'https://auth.example.com';
		const mockThis = mockDeep<IAllExecuteFunctions>();
		const mockNode = mockDeep<INode>();
		const mockAdditionalData = mockDeep<IWorkflowExecuteAdditionalData>();

		beforeEach(() => {
			nock.cleanAll();
			jest.resetAllMocks();
			mockNode.name = 'test-node';
			mockNode.credentials = {
				testOAuth2: { id: 'cred-id', name: 'cred-name' },
			};
		});

		test('should not send scope parameter when scope is empty', async () => {
			mockThis.getCredentials.mockResolvedValue({
				clientId: 'client-id',
				clientSecret: 'client-secret',
				grantType: 'clientCredentials',
				accessTokenUrl: `${tokenUrl}/token`,
				authentication: 'body',
				scope: '',
				oauthTokenData: undefined,
			});

			// Token endpoint must NOT receive scope in body
			nock(tokenUrl)
				.post('/token', (body) => !('scope' in body) || body.scope === undefined)
				.reply(
					200,
					{ access_token: 'new-token', token_type: 'bearer' },
					{ 'content-type': 'application/json' },
				);

			nock(baseUrl).get('/data').reply(200, { success: true });

			mockThis.helpers.httpRequest.mockResolvedValueOnce({ success: true });

			await requestOAuth2.call(
				mockThis,
				'testOAuth2',
				{ method: 'GET', url: `${baseUrl}/data` },
				mockNode,
				mockAdditionalData,
				undefined,
				true, // isN8nRequest
			);

			expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({ Authorization: 'Bearer new-token' }),
				}),
			);
		});

		test('should send scope parameter when scope is set', async () => {
			mockThis.getCredentials.mockResolvedValue({
				clientId: 'client-id',
				clientSecret: 'client-secret',
				grantType: 'clientCredentials',
				accessTokenUrl: `${tokenUrl}/token`,
				authentication: 'body',
				scope: 'read write',
				oauthTokenData: undefined,
			});

			nock(tokenUrl)
				.post('/token', (body) => body.scope === 'read write')
				.reply(
					200,
					{ access_token: 'scoped-token', token_type: 'bearer' },
					{ 'content-type': 'application/json' },
				);

			mockThis.helpers.httpRequest.mockResolvedValueOnce({ data: 'ok' });

			await requestOAuth2.call(
				mockThis,
				'testOAuth2',
				{ method: 'GET', url: `${baseUrl}/data` },
				mockNode,
				mockAdditionalData,
				undefined,
				true,
			);

			expect(mockThis.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: expect.objectContaining({ Authorization: 'Bearer scoped-token' }),
				}),
			);
		});

		test('should throw ApplicationError with clear message when token acquisition fails', async () => {
			mockThis.getCredentials.mockResolvedValue({
				clientId: 'client-id',
				clientSecret: 'wrong-secret',
				grantType: 'clientCredentials',
				accessTokenUrl: `${tokenUrl}/token`,
				authentication: 'body',
				scope: '',
				oauthTokenData: undefined,
			});

			nock(tokenUrl)
				.post('/token')
				.reply(
					400,
					{ error: 'invalid_client', error_description: 'Invalid client credentials' },
					{ 'content-type': 'application/json' },
				);

			await expect(
				requestOAuth2.call(
					mockThis,
					'testOAuth2',
					{ method: 'GET', url: `${baseUrl}/data` },
					mockNode,
					mockAdditionalData,
					undefined,
					true,
				),
			).rejects.toThrow('Failed to acquire OAuth2 access token');
		});
	});

	describe('SSRF protection wiring', () => {
		const baseUrl = 'https://example.com';
		const workflow = mock<Workflow>();
		const hooks = mock<ExecutionLifecycleHooks>();
		const node = mock<INode>();

		const createSsrfBridge = (overrides?: Partial<SsrfBridge>): SsrfBridge => ({
			validateIp: jest.fn().mockReturnValue({ ok: true, result: undefined }),
			validateUrl: jest.fn().mockResolvedValue({ ok: true, result: undefined }),
			validateRedirectSync: jest.fn(),
			createSecureLookup: jest.fn().mockReturnValue(jest.fn()),
			...overrides,
		});
		beforeEach(() => {
			nock.cleanAll();
			hooks.runHook.mockClear();
		});

		describe('convertN8nRequestToAxios with ssrfBridge', () => {
			test('should inject secureLookup into agent options when no proxy', () => {
				const lookupFn = jest.fn();
				const ssrfBridge = createSsrfBridge({
					createSecureLookup: jest.fn().mockReturnValue(lookupFn),
				});

				const axiosConfig = convertN8nRequestToAxios(
					{ method: 'GET', url: 'https://example.com/test' },
					ssrfBridge,
				);

				expect(ssrfBridge.createSecureLookup).toHaveBeenCalled();
				expect((axiosConfig.httpsAgent as HttpsAgent).options.lookup).toBe(lookupFn);
			});

			test('should NOT inject secureLookup when proxy is configured', () => {
				const lookupFn = jest.fn();
				const ssrfBridge = createSsrfBridge({
					createSecureLookup: jest.fn().mockReturnValue(lookupFn),
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
			const baseUrl = 'https://example.com';
			const workflow = mock<Workflow>();
			const hooks = mock<ExecutionLifecycleHooks>();
			const additionalData = mock<IWorkflowExecuteAdditionalData>({ hooks, ssrfBridge: undefined });
			const node = mock<INode>();

			beforeEach(() => {
				nock.cleanAll();
			});

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
					nock(baseUrl)
						.get('/redirect')
						.reply(301, '', { Location: 'https://not-allowed.com/data' });
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
					nock(baseUrl)
						.get('/redirect')
						.reply(301, '', { Location: 'https://not-allowed.com/data' });
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

			describe('parseRequestObject', () => {
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
					expect(() => axiosOptions.beforeRedirect!(redirectOptions, mock())).toThrow(
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
						expect(() => axiosOptions.beforeRedirect!(redirectOptions, mock())).not.toThrow();
					},
				);
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
					expect(() => axiosConfig.beforeRedirect!(redirectOptions, mock())).toThrow(
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
						expect(() => axiosConfig.beforeRedirect!(redirectOptions, mock())).not.toThrow();
					},
				);
			});
		});
	});
});
