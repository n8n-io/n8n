import FormData from 'form-data';
import { Agent as HttpAgent } from 'http';
import { HttpProxyAgent } from 'http-proxy-agent';
import { Agent as HttpsAgent } from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { mock } from 'jest-mock-extended';
import type {
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

import type { ExecutionLifecycleHooks } from '@/execution-engine/execution-lifecycle-hooks';

import {
	applyPaginationRequestData,
	convertN8nRequestToAxios,
	createFormDataObject,
	getAgentWithProxy,
	httpRequest,
	invokeAxios,
	parseRequestObject,
	proxyRequestToAxios,
	removeEmptyBody,
} from '../request-helper-functions';

describe('Request Helper Functions', () => {
	describe('proxyRequestToAxios', () => {
		const baseUrl = 'https://example.de';
		const workflow = mock<Workflow>();
		const hooks = mock<ExecutionLifecycleHooks>();
		const additionalData = mock<IWorkflowExecuteAdditionalData>({ hooks });
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
			test('should forward authorization header', async () => {
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
				});

				expect(response.statusCode).toBe(200);
				const forwardedHeaders = JSON.parse(response.body);
				expect(forwardedHeaders.authorization).toBe('Basic dGVzdHVzZXI6dGVzdHBhc3N3b3Jk');
				expect(forwardedHeaders['x-other-header']).toBe('otherHeaderContent');
			});

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
				expect((axiosOptions.httpsAgent as HttpsAgent).options).toEqual({
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
				expect((redirectOptions.agent as HttpsAgent).options).toEqual({
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

	describe('createFormDataObject', () => {
		test('should create FormData with simple key-value pairs', () => {
			const data = { key1: 'value1', key2: 'value2' };
			const formData = createFormDataObject(data);

			expect(formData).toBeInstanceOf(FormData);

			const formDataEntries: string[] = [];
			formData.getHeaders(); // Ensures form data is processed

			formData.on('data', (chunk) => {
				formDataEntries.push(chunk.toString());
			});
		});

		test('should handle array values', () => {
			const data = { files: ['file1.txt', 'file2.txt'] };
			const formData = createFormDataObject(data);

			expect(formData).toBeInstanceOf(FormData);
		});

		test('should handle complex form data with options', () => {
			const data = {
				file: {
					value: Buffer.from('test content'),
					options: {
						filename: 'test.txt',
						contentType: 'text/plain',
					},
				},
			};

			const formData = createFormDataObject(data);

			expect(formData).toBeInstanceOf(FormData);
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
	});

	describe('getAgentWithProxy', () => {
		const baseUrlHttps = 'https://example.com';
		const baseUrlHttp = 'http://example.com';
		const proxyUrlHttps = 'http://proxy-for-https.com:8080/';
		const proxyUrlHttp = 'http://proxy-for-http.com:8080/';

		test('should return a regular HTTP agent when no proxy is set', async () => {
			const { agent, protocol } = getAgentWithProxy({
				targetUrl: baseUrlHttp,
			});
			expect(protocol).toEqual('http');
			expect(agent).toBeInstanceOf(HttpAgent);
		});

		test('should return a regular HTTPS agent when no proxy is set', async () => {
			const { agent, protocol } = getAgentWithProxy({
				targetUrl: baseUrlHttps,
			});
			expect(protocol).toEqual('https');
			expect(agent).toBeInstanceOf(HttpsAgent);
		});

		test('should use a proxyConfig object', async () => {
			const { agent, protocol } = getAgentWithProxy({
				targetUrl: baseUrlHttps,
				proxyConfig: {
					host: 'proxy-for-https.com',
					port: 8080,
				},
			});
			expect(protocol).toEqual('https');
			expect((agent as HttpsProxyAgent<string>).proxy.href).toEqual(proxyUrlHttps);
		});

		test('should use a proxyConfig string', async () => {
			const { agent, protocol } = getAgentWithProxy({
				targetUrl: baseUrlHttps,
				proxyConfig: proxyUrlHttps,
			});
			expect(agent).toBeInstanceOf(HttpsProxyAgent);
			expect(protocol).toEqual('https');
			expect((agent as HttpsProxyAgent<string>).proxy.href).toEqual(proxyUrlHttps);
		});

		describe('environment variables', () => {
			let originalEnv: NodeJS.ProcessEnv;

			beforeAll(() => {
				originalEnv = { ...process.env };
				process.env.HTTP_PROXY = proxyUrlHttp;
				process.env.HTTPS_PROXY = proxyUrlHttps;
				process.env.NO_PROXY = 'should-not-proxy.com';
			});

			afterAll(() => {
				process.env = originalEnv;
			});

			test('should proxy http requests (HTTP_PROXY)', async () => {
				const { agent, protocol } = getAgentWithProxy({
					targetUrl: baseUrlHttp,
				});
				expect(protocol).toEqual('http');
				expect(agent).toBeInstanceOf(HttpProxyAgent);
				expect((agent as HttpsProxyAgent<string>).proxy.href).toEqual(proxyUrlHttp);
			});

			test('should proxy https requests (HTTPS_PROXY)', async () => {
				const { agent, protocol } = getAgentWithProxy({
					targetUrl: baseUrlHttps,
				});
				expect(protocol).toEqual('https');
				expect(agent).toBeInstanceOf(HttpsProxyAgent);
				expect((agent as HttpsProxyAgent<string>).proxy.href).toEqual(proxyUrlHttps);
			});

			test('should not proxy some hosts based on NO_PROXY', async () => {
				const { agent, protocol } = getAgentWithProxy({
					targetUrl: 'https://should-not-proxy.com/foo',
				});
				expect(protocol).toEqual('https');
				expect(agent).toBeInstanceOf(HttpsAgent);
			});
		});
	});
});
