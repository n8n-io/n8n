import { join } from 'path';
import { tmpdir } from 'os';
import { readFileSync, mkdtempSync } from 'fs';

import { IBinaryData, ITaskDataConnections } from 'n8n-workflow';
import { BinaryDataManager } from '@/BinaryDataManager';
import * as NodeExecuteFunctions from '@/NodeExecuteFunctions';

const temporaryDir = mkdtempSync(join(tmpdir(), 'n8n'));

describe('NodeExecuteFunctions', () => {
	describe(`test binary data helper methods`, () => {
		// Reset BinaryDataManager for each run. This is a dirty operation, as individual managers are not cleaned.
		beforeEach(() => {
			BinaryDataManager.instance = undefined;
		});

		test(`test getBinaryDataBuffer(...) & setBinaryDataBuffer(...) methods in 'default' mode`, async () => {
			// Setup a 'default' binary data manager instance
			await BinaryDataManager.init({
				mode: 'default',
				availableModes: 'default',
				localStoragePath: temporaryDir,
				binaryDataTTL: 1,
				persistedBinaryDataTTL: 1,
			});

			// Set our binary data buffer
			let inputData: Buffer = Buffer.from('This is some binary data', 'utf8');
			let setBinaryDataBufferResponse: IBinaryData = await NodeExecuteFunctions.setBinaryDataBuffer(
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
			let taskDataConnectionsInput: ITaskDataConnections = {
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
			let getBinaryDataBufferResponse: Buffer = await NodeExecuteFunctions.getBinaryDataBuffer(
				taskDataConnectionsInput,
				0,
				'data',
				0,
			);

			expect(getBinaryDataBufferResponse).toEqual(inputData);
		});

		test(`test getBinaryDataBuffer(...) & setBinaryDataBuffer(...) methods in 'filesystem' mode`, async () => {
			// Setup a 'filesystem' binary data manager instance
			await BinaryDataManager.init({
				mode: 'filesystem',
				availableModes: 'filesystem',
				localStoragePath: temporaryDir,
				binaryDataTTL: 1,
				persistedBinaryDataTTL: 1,
			});

			// Set our binary data buffer
			let inputData: Buffer = Buffer.from('This is some binary data', 'utf8');
			let setBinaryDataBufferResponse: IBinaryData = await NodeExecuteFunctions.setBinaryDataBuffer(
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
			let taskDataConnectionsInput: ITaskDataConnections = {
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
			let getBinaryDataBufferResponse: Buffer = await NodeExecuteFunctions.getBinaryDataBuffer(
				taskDataConnectionsInput,
				0,
				'data',
				0,
			);

			expect(getBinaryDataBufferResponse).toEqual(inputData);
		});
	});
});
