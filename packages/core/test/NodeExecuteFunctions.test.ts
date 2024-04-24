import type { SecureContextOptions } from 'tls';
import {
	cleanupParameterData,
	copyInputItems,
	getBinaryDataBuffer,
	parseIncomingMessage,
	parseRequestObject,
	proxyRequestToAxios,
	removeEmptyBody,
	setBinaryDataBuffer,
} from '@/NodeExecuteFunctions';
import { DateTime } from 'luxon';
import { mkdtempSync, readFileSync } from 'fs';
import type { IncomingMessage } from 'http';
import { mock } from 'jest-mock-extended';
import type {
	IBinaryData,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INode,
	IRequestOptions,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	NodeParameterValue,
	Workflow,
	WorkflowHooks,
} from 'n8n-workflow';
import { BinaryDataService } from '@/BinaryData/BinaryData.service';
import nock from 'nock';
import { tmpdir } from 'os';
import { join } from 'path';
import Container from 'typedi';
import type { Agent } from 'https';
import toPlainObject from 'lodash/toPlainObject';

const temporaryDir = mkdtempSync(join(tmpdir(), 'n8n'));

describe('NodeExecuteFunctions', () => {
	describe('test binary data helper methods', () => {
		test("test getBinaryDataBuffer(...) & setBinaryDataBuffer(...) methods in 'default' mode", async () => {
			// Setup a 'default' binary data manager instance
			Container.set(BinaryDataService, new BinaryDataService());

			await Container.get(BinaryDataService).init({
				mode: 'default',
				availableModes: ['default'],
				localStoragePath: temporaryDir,
			});

			// Set our binary data buffer
			const inputData: Buffer = Buffer.from('This is some binary data', 'utf8');
			const setBinaryDataBufferResponse: IBinaryData = await setBinaryDataBuffer(
				{
					mimeType: 'txt',
					data: 'This should be overwritten by the actual payload in the response',
				},
				inputData,
				'workflowId',
				'executionId',
			);

			// Expect our return object to contain the base64 encoding of the input data, as it should be stored in memory.
			expect(setBinaryDataBufferResponse.data).toEqual(inputData.toString('base64'));

			// Now, re-fetch our data.
			// An ITaskDataConnections object is used to share data between nodes. The top level property, 'main', represents the successful output object from a previous node.
			const taskDataConnectionsInput: ITaskDataConnections = {
				main: [],
			};

			// We add an input set, with one item at index 0, to this input. It contains an empty json payload and our binary data.
			taskDataConnectionsInput.main.push([
				{
					json: {},
					binary: {
						data: setBinaryDataBufferResponse,
					},
				},
			]);

			// Now, lets fetch our data! The item will be item index 0.
			const getBinaryDataBufferResponse: Buffer = await getBinaryDataBuffer(
				taskDataConnectionsInput,
				0,
				'data',
				0,
			);

			expect(getBinaryDataBufferResponse).toEqual(inputData);
		});

		test("test getBinaryDataBuffer(...) & setBinaryDataBuffer(...) methods in 'filesystem' mode", async () => {
			Container.set(BinaryDataService, new BinaryDataService());

			// Setup a 'filesystem' binary data manager instance
			await Container.get(BinaryDataService).init({
				mode: 'filesystem',
				availableModes: ['filesystem'],
				localStoragePath: temporaryDir,
			});

			// Set our binary data buffer
			const inputData: Buffer = Buffer.from('This is some binary data', 'utf8');
			const setBinaryDataBufferResponse: IBinaryData = await setBinaryDataBuffer(
				{
					mimeType: 'txt',
					data: 'This should be overwritten with the name of the configured data manager',
				},
				inputData,
				'workflowId',
				'executionId',
			);

			// Expect our return object to contain the name of the configured data manager.
			expect(setBinaryDataBufferResponse.data).toEqual('filesystem-v2');

			// Ensure that the input data was successfully persisted to disk.
			expect(
				readFileSync(
					`${temporaryDir}/${setBinaryDataBufferResponse.id?.replace('filesystem-v2:', '')}`,
				),
			).toEqual(inputData);

			// Now, re-fetch our data.
			// An ITaskDataConnections object is used to share data between nodes. The top level property, 'main', represents the successful output object from a previous node.
			const taskDataConnectionsInput: ITaskDataConnections = {
				main: [],
			};

			// We add an input set, with one item at index 0, to this input. It contains an empty json payload and our binary data.
			taskDataConnectionsInput.main.push([
				{
					json: {},
					binary: {
						data: setBinaryDataBufferResponse,
					},
				},
			]);

			// Now, lets fetch our data! The item will be item index 0.
			const getBinaryDataBufferResponse: Buffer = await getBinaryDataBuffer(
				taskDataConnectionsInput,
				0,
				'data',
				0,
			);

			expect(getBinaryDataBufferResponse).toEqual(inputData);
		});
	});

	describe('parseIncomingMessage', () => {
		it('parses valid content-type header', () => {
			const message = mock<IncomingMessage>({
				headers: { 'content-type': 'application/json', 'content-disposition': undefined },
			});
			parseIncomingMessage(message);

			expect(message.contentType).toEqual('application/json');
		});

		it('parses valid content-type header with parameters', () => {
			const message = mock<IncomingMessage>({
				headers: {
					'content-type': 'application/json; charset=utf-8',
					'content-disposition': undefined,
				},
			});
			parseIncomingMessage(message);

			expect(message.contentType).toEqual('application/json');
		});

		it('parses valid content-disposition header with filename*', () => {
			const message = mock<IncomingMessage>({
				headers: {
					'content-type': undefined,
					'content-disposition':
						'attachment; filename="screenshot%20(1).png"; filename*=UTF-8\'\'screenshot%20(1).png',
				},
			});
			parseIncomingMessage(message);

			expect(message.contentDisposition).toEqual({
				filename: 'screenshot (1).png',
				type: 'attachment',
			});
		});

		it('parses valid content-disposition header with filename* (quoted)', () => {
			const message = mock<IncomingMessage>({
				headers: {
					'content-type': undefined,
					'content-disposition': ' attachment;filename*="utf-8\' \'test-unsplash.jpg"',
				},
			});
			parseIncomingMessage(message);

			expect(message.contentDisposition).toEqual({
				filename: 'test-unsplash.jpg',
				type: 'attachment',
			});
		});

		it('parses valid content-disposition header with filename and trailing ";"', () => {
			const message = mock<IncomingMessage>({
				headers: {
					'content-type': undefined,
					'content-disposition': 'inline; filename="screenshot%20(1).png";',
				},
			});
			parseIncomingMessage(message);

			expect(message.contentDisposition).toEqual({
				filename: 'screenshot (1).png',
				type: 'inline',
			});
		});

		it('parses non standard content-disposition with missing type', () => {
			const message = mock<IncomingMessage>({
				headers: {
					'content-type': undefined,
					'content-disposition': 'filename="screenshot%20(1).png";',
				},
			});
			parseIncomingMessage(message);

			expect(message.contentDisposition).toEqual({
				filename: 'screenshot (1).png',
				type: 'attachment',
			});
		});
	});

	describe('proxyRequestToAxios', () => {
		const baseUrl = 'http://example.de';
		const workflow = mock<Workflow>();
		const hooks = mock<WorkflowHooks>();
		const additionalData = mock<IWorkflowExecuteAdditionalData>({ hooks });
		const node = mock<INode>();

		beforeEach(() => {
			hooks.executeHookFunctions.mockClear();
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
			expect(hooks.executeHookFunctions).toHaveBeenCalledWith('nodeFetchedData', [
				workflow.id,
				node,
			]);
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
			expect(hooks.executeHookFunctions).not.toHaveBeenCalled();
		});

		test('should not throw if the response status is 404, but `simple` option is set to `false`', async () => {
			nock(baseUrl).get('/test').reply(404, 'Not Found');
			const response = await proxyRequestToAxios(workflow, additionalData, node, {
				url: `${baseUrl}/test`,
				simple: false,
			});

			expect(response).toEqual('Not Found');
			expect(hooks.executeHookFunctions).toHaveBeenCalledWith('nodeFetchedData', [
				workflow.id,
				node,
			]);
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
				statusMessage: null,
			});
			expect(hooks.executeHookFunctions).toHaveBeenCalledWith('nodeFetchedData', [
				workflow.id,
				node,
			]);
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

	describe('parseRequestObject', () => {
		test('should not use Host header for SNI', async () => {
			const axiosOptions = await parseRequestObject({
				url: 'https://example.de/foo/bar',
				headers: { Host: 'other.host.com' },
			});
			expect((axiosOptions.httpsAgent as Agent).options.servername).toEqual('example.de');
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
				expect((axiosOptions.httpsAgent as Agent).options).toEqual({
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
				const redirectOptions: Record<string, any> = { agents: {}, hostname: 'example.de' };
				axiosOptions.beforeRedirect!(redirectOptions, mock());
				expect(redirectOptions.agent).toEqual(redirectOptions.agents.https);
				expect((redirectOptions.agent as Agent).options).toEqual({
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

	describe('cleanupParameterData', () => {
		it('should stringify Luxon dates in-place', () => {
			const input = { x: 1, y: DateTime.now() as unknown as NodeParameterValue };
			expect(typeof input.y).toBe('object');
			cleanupParameterData(input);
			expect(typeof input.y).toBe('string');
		});

		it('should stringify plain Luxon dates in-place', () => {
			const input = {
				x: 1,
				y: toPlainObject(DateTime.now()),
			};
			expect(typeof input.y).toBe('object');
			cleanupParameterData(input);
			expect(typeof input.y).toBe('string');
		});

		it('should handle objects with nameless constructors', () => {
			const input = { x: 1, y: { constructor: {} } as NodeParameterValue };
			expect(typeof input.y).toBe('object');
			cleanupParameterData(input);
			expect(typeof input.y).toBe('object');
		});

		it('should handle objects without a constructor', () => {
			const input = { x: 1, y: { constructor: undefined } as unknown as NodeParameterValue };
			expect(typeof input.y).toBe('object');
			cleanupParameterData(input);
			expect(typeof input.y).toBe('object');
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
