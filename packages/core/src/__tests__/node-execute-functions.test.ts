import { mock } from 'jest-mock-extended';
import type {
	IHttpRequestMethods,
	IHttpRequestOptions,
	INode,
	IRequestOptions,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import nock from 'nock';

import type { ExecutionLifecycleHooks } from '@/execution-engine/execution-lifecycle-hooks';
import {
	copyInputItems,
	invokeAxios,
	proxyRequestToAxios,
	removeEmptyBody,
} from '@/node-execute-functions';

describe('NodeExecuteFunctions', () => {
	describe('proxyRequestToAxios', () => {
		const baseUrl = 'http://example.de';
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
					url: 'http://example.de/test',
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
		const baseUrl = 'http://example.de';

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

	describe('copyInputItems', () => {
		it('should pick only selected properties', () => {
			const output = copyInputItems(
				[
					{
						json: {
							a: 1,
							b: true,
							c: {},
						},
					},
				],
				['a'],
			);
			expect(output).toEqual([{ a: 1 }]);
		});

		it('should convert undefined to null', () => {
			const output = copyInputItems(
				[
					{
						json: {
							a: undefined,
						},
					},
				],
				['a'],
			);
			expect(output).toEqual([{ a: null }]);
		});

		it('should clone objects', () => {
			const input = {
				a: { b: 5 },
			};
			const output = copyInputItems(
				[
					{
						json: input,
					},
				],
				['a'],
			);
			expect(output[0].a).toEqual(input.a);
			expect(output[0].a === input.a).toEqual(false);
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
});
