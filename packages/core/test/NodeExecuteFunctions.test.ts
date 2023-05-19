import nock from 'nock';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFileSync, mkdtempSync } from 'fs';
import { mock } from 'jest-mock-extended';
import type {
	IBinaryData,
	INode,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowHooks,
} from 'n8n-workflow';
import { BinaryDataManager } from '@/BinaryDataManager';
import {
	setBinaryDataBuffer,
	getBinaryDataBuffer,
	proxyRequestToAxios,
} from '@/NodeExecuteFunctions';
import { initLogger } from './utils';

const temporaryDir = mkdtempSync(join(tmpdir(), 'n8n'));

describe('NodeExecuteFunctions', () => {
	describe('test binary data helper methods', () => {
		// Reset BinaryDataManager for each run. This is a dirty operation, as individual managers are not cleaned.
		beforeEach(() => {
			BinaryDataManager.instance = undefined;
		});

		test("test getBinaryDataBuffer(...) & setBinaryDataBuffer(...) methods in 'default' mode", async () => {
			// Setup a 'default' binary data manager instance
			await BinaryDataManager.init({
				mode: 'default',
				availableModes: 'default',
				localStoragePath: temporaryDir,
				binaryDataTTL: 1,
				persistedBinaryDataTTL: 1,
			});

			// Set our binary data buffer
			const inputData: Buffer = Buffer.from('This is some binary data', 'utf8');
			const setBinaryDataBufferResponse: IBinaryData = await setBinaryDataBuffer(
				{
					mimeType: 'txt',
					data: 'This should be overwritten by the actual payload in the response',
				},
				inputData,
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
			// Setup a 'filesystem' binary data manager instance
			await BinaryDataManager.init({
				mode: 'filesystem',
				availableModes: 'filesystem',
				localStoragePath: temporaryDir,
				binaryDataTTL: 1,
				persistedBinaryDataTTL: 1,
			});

			// Set our binary data buffer
			const inputData: Buffer = Buffer.from('This is some binary data', 'utf8');
			const setBinaryDataBufferResponse: IBinaryData = await setBinaryDataBuffer(
				{
					mimeType: 'txt',
					data: 'This should be overwritten with the name of the configured data manager',
				},
				inputData,
				'executionId',
			);

			// Expect our return object to contain the name of the configured data manager.
			expect(setBinaryDataBufferResponse.data).toEqual('filesystem');

			// Ensure that the input data was successfully persisted to disk.
			expect(
				readFileSync(
					`${temporaryDir}/${setBinaryDataBufferResponse.id?.replace('filesystem:', '')}`,
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
			initLogger();
			hooks.executeHookFunctions.mockClear();
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
	});
});
