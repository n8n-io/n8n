import { Container } from '@n8n/di';
import { mkdtempSync, readFileSync } from 'fs';
import { IncomingMessage } from 'http';
import { mock } from 'jest-mock-extended';
import type {
	IBinaryData,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INode,
	IRequestOptions,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowHooks,
} from 'n8n-workflow';
import nock from 'nock';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';

import { BinaryDataService } from '@/binary-data/binary-data.service';
import { InstanceSettings } from '@/instance-settings';
import {
	binaryToString,
	copyInputItems,
	getBinaryDataBuffer,
	invokeAxios,
	isFilePathBlocked,
	prepareBinaryData,
	proxyRequestToAxios,
	removeEmptyBody,
	setBinaryDataBuffer,
} from '@/node-execute-functions';

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

		test('test prepareBinaryData parses filenames correctly', async () => {
			const filenameExpected = [
				{
					filename: 't?ext',
					expected: 't?ext',
				},
				{
					filename: 'no-symbol',
					expected: 'no-symbol',
				},
			];

			for (const { filename, expected } of filenameExpected) {
				const binaryData: Buffer = Buffer.from('This is some binary data', 'utf8');

				const result = await prepareBinaryData(binaryData, 'workflowId', 'executionId', filename);

				expect(result.fileName).toEqual(expected);
			}
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
				statusMessage: 'Not Found',
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

	describe('binaryToString', () => {
		const ENCODING_SAMPLES = {
			utf8: {
				text: 'Hello, 世界! τεστ мир ⚡️ é à ü ñ',
				buffer: Buffer.from([
					0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0xe4, 0xb8, 0x96, 0xe7, 0x95, 0x8c, 0x21, 0x20,
					0xcf, 0x84, 0xce, 0xb5, 0xcf, 0x83, 0xcf, 0x84, 0x20, 0xd0, 0xbc, 0xd0, 0xb8, 0xd1, 0x80,
					0x20, 0xe2, 0x9a, 0xa1, 0xef, 0xb8, 0x8f, 0x20, 0xc3, 0xa9, 0x20, 0xc3, 0xa0, 0x20, 0xc3,
					0xbc, 0x20, 0xc3, 0xb1,
				]),
			},

			'iso-8859-15': {
				text: 'Café € personnalité',
				buffer: Buffer.from([
					0x43, 0x61, 0x66, 0xe9, 0x20, 0xa4, 0x20, 0x70, 0x65, 0x72, 0x73, 0x6f, 0x6e, 0x6e, 0x61,
					0x6c, 0x69, 0x74, 0xe9,
				]),
			},

			latin1: {
				text: 'señor année déjà',
				buffer: Buffer.from([
					0x73, 0x65, 0xf1, 0x6f, 0x72, 0x20, 0x61, 0x6e, 0x6e, 0xe9, 0x65, 0x20, 0x64, 0xe9, 0x6a,
					0xe0,
				]),
			},

			ascii: {
				text: 'Hello, World! 123',
				buffer: Buffer.from([
					0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x2c, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64, 0x21, 0x20, 0x31,
					0x32, 0x33,
				]),
			},

			'windows-1252': {
				text: '€ Smart "quotes" • bullet',
				buffer: Buffer.from([
					0x80, 0x20, 0x53, 0x6d, 0x61, 0x72, 0x74, 0x20, 0x22, 0x71, 0x75, 0x6f, 0x74, 0x65, 0x73,
					0x22, 0x20, 0x95, 0x20, 0x62, 0x75, 0x6c, 0x6c, 0x65, 0x74,
				]),
			},

			'shift-jis': {
				text: 'こんにちは世界',
				buffer: Buffer.from([
					0x82, 0xb1, 0x82, 0xf1, 0x82, 0xc9, 0x82, 0xbf, 0x82, 0xcd, 0x90, 0xa2, 0x8a, 0x45,
				]),
			},

			big5: {
				text: '哈囉世界',
				buffer: Buffer.from([0xab, 0xa2, 0xc5, 0x6f, 0xa5, 0x40, 0xac, 0xc9]),
			},

			'koi8-r': {
				text: 'Привет мир',
				buffer: Buffer.from([0xf0, 0xd2, 0xc9, 0xd7, 0xc5, 0xd4, 0x20, 0xcd, 0xc9, 0xd2]),
			},
		};

		describe('should handle Buffer', () => {
			for (const [encoding, { text, buffer }] of Object.entries(ENCODING_SAMPLES)) {
				test(`with ${encoding}`, async () => {
					const data = await binaryToString(buffer, encoding);
					expect(data).toBe(text);
				});
			}
		});

		describe('should handle streams', () => {
			for (const [encoding, { text, buffer }] of Object.entries(ENCODING_SAMPLES)) {
				test(`with ${encoding}`, async () => {
					const stream = Readable.from(buffer);
					const data = await binaryToString(stream, encoding);
					expect(data).toBe(text);
				});
			}
		});

		describe('should handle IncomingMessage', () => {
			for (const [encoding, { text, buffer }] of Object.entries(ENCODING_SAMPLES)) {
				test(`with ${encoding}`, async () => {
					const response = Readable.from(buffer) as IncomingMessage;
					response.headers = { 'content-type': `application/json;charset=${encoding}` };
					// @ts-expect-error need this hack to fake `instanceof IncomingMessage` checks
					response.__proto__ = IncomingMessage.prototype;
					const data = await binaryToString(response);
					expect(data).toBe(text);
				});
			}
		});
	});
});

describe('isFilePathBlocked', () => {
	test('should return true for static cache dir', () => {
		const filePath = Container.get(InstanceSettings).staticCacheDir;

		expect(isFilePathBlocked(filePath)).toBe(true);
	});
});
