import { Container } from '@n8n/di';
import { mkdtempSync, readFileSync } from 'fs';
import { IncomingMessage } from 'http';
import { mock } from 'jest-mock-extended';
import type {
	IBinaryData,
	INode,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';

import type { BinaryDataConfig } from '@/binary-data';
import { BinaryDataService } from '@/binary-data/binary-data.service';

import {
	assertBinaryData,
	binaryToString,
	copyBinaryFile,
	detectBinaryEncoding,
	getBinaryDataBuffer,
	getBinaryHelperFunctions,
	prepareBinaryData,
	setBinaryDataBuffer,
} from '../binary-helper-functions';

const workflowId = 'workflow123';
const executionId = 'execution456';

const bufferToIncomingMessage = (buffer: Buffer, encoding = 'utf-8') => {
	const incomingMessage = Readable.from(buffer) as IncomingMessage;
	incomingMessage.headers = { 'content-type': `application/json;charset=${encoding}` };
	// @ts-expect-error need this hack to fake `instanceof IncomingMessage` checks
	incomingMessage.__proto__ = IncomingMessage.prototype;
	return incomingMessage;
};

describe('test binary data helper methods', () => {
	const temporaryDir = mkdtempSync(join(tmpdir(), 'n8n'));
	const binaryDataConfig = mock<BinaryDataConfig>({
		mode: 'default',
		availableModes: ['default', 'filesystem'],
		localStoragePath: temporaryDir,
	});
	let binaryDataService: BinaryDataService;

	beforeEach(() => {
		jest.resetAllMocks();
		binaryDataService = new BinaryDataService(binaryDataConfig);
		Container.set(BinaryDataService, binaryDataService);
	});

	test("test getBinaryDataBuffer(...) & setBinaryDataBuffer(...) methods in 'default' mode", async () => {
		// Setup a 'default' binary data manager instance
		binaryDataConfig.mode = 'default';
		await binaryDataService.init();

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
		// Setup a 'filesystem' binary data manager instance
		binaryDataConfig.mode = 'filesystem';
		await binaryDataService.init();

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

	describe('getBinaryDataBuffer with IBinaryData parameter', () => {
		it('should return buffer when passed IBinaryData directly in default mode', async () => {
			binaryDataConfig.mode = 'default';
			await binaryDataService.init();

			const inputBuffer = Buffer.from('direct binary data', 'utf8');
			const binaryData = await setBinaryDataBuffer(
				{ mimeType: 'application/octet-stream', data: '' },
				inputBuffer,
				workflowId,
				executionId,
			);

			// Empty input data since we're passing binary data directly
			const inputData: ITaskDataConnections = { main: [] };

			const result = await getBinaryDataBuffer(inputData, 0, binaryData, 0);
			expect(result).toEqual(inputBuffer);
		});

		it('should return buffer when passed IBinaryData directly in filesystem mode', async () => {
			binaryDataConfig.mode = 'filesystem';
			await binaryDataService.init();

			const inputBuffer = Buffer.from('filesystem binary data', 'utf8');
			const binaryData = await setBinaryDataBuffer(
				{ mimeType: 'text/plain', data: '' },
				inputBuffer,
				workflowId,
				executionId,
			);

			const inputData: ITaskDataConnections = { main: [] };

			const result = await getBinaryDataBuffer(inputData, 0, binaryData, 0);
			expect(result).toEqual(inputBuffer);
		});

		it('should handle IBinaryData with different mime types', async () => {
			binaryDataConfig.mode = 'default';
			await binaryDataService.init();

			const jsonBuffer = Buffer.from('{"test": "json"}', 'utf8');
			const binaryData = await setBinaryDataBuffer(
				{ mimeType: 'application/json', data: '', fileName: 'test.json' },
				jsonBuffer,
				workflowId,
				executionId,
			);

			const inputData: ITaskDataConnections = { main: [] };

			const result = await getBinaryDataBuffer(inputData, 0, binaryData, 0);
			expect(result).toEqual(jsonBuffer);
		});

		it('should handle IBinaryData with all properties', async () => {
			binaryDataConfig.mode = 'default';
			await binaryDataService.init();

			const inputBuffer = Buffer.from('comprehensive test data', 'utf8');
			const binaryData = await setBinaryDataBuffer(
				{
					mimeType: 'text/plain',
					data: '',
					fileName: 'test.txt',
					fileExtension: 'txt',
					fileType: 'text',
					directory: '/tmp',
				},
				inputBuffer,
				workflowId,
				executionId,
			);

			const inputData: ITaskDataConnections = { main: [] };

			const result = await getBinaryDataBuffer(inputData, 0, binaryData, 0);
			expect(result).toEqual(inputBuffer);
		});

		it('should handle empty buffer with IBinaryData', async () => {
			binaryDataConfig.mode = 'default';
			await binaryDataService.init();

			const emptyBuffer = Buffer.alloc(0);
			const binaryData = await setBinaryDataBuffer(
				{ mimeType: 'application/octet-stream', data: '' },
				emptyBuffer,
				workflowId,
				executionId,
			);

			const inputData: ITaskDataConnections = { main: [] };

			const result = await getBinaryDataBuffer(inputData, 0, binaryData, 0);
			expect(result).toEqual(emptyBuffer);
			expect(result.length).toBe(0);
		});

		it('should handle large binary data with IBinaryData', async () => {
			binaryDataConfig.mode = 'default';
			await binaryDataService.init();

			// Create a 1MB buffer
			const largeBuffer = Buffer.alloc(1024 * 1024, 'A');
			const binaryData = await setBinaryDataBuffer(
				{ mimeType: 'application/octet-stream', data: '' },
				largeBuffer,
				workflowId,
				executionId,
			);

			const inputData: ITaskDataConnections = { main: [] };

			const result = await getBinaryDataBuffer(inputData, 0, binaryData, 0);
			expect(result).toEqual(largeBuffer);
			expect(result.length).toBe(1024 * 1024);
		});

		it('should handle binary data with special characters using IBinaryData', async () => {
			binaryDataConfig.mode = 'default';
			await binaryDataService.init();

			const specialBuffer = Buffer.from('Hello 世界! 🚀 Special chars: àáâãäå', 'utf8');
			const binaryData = await setBinaryDataBuffer(
				{ mimeType: 'text/plain', data: '' },
				specialBuffer,
				workflowId,
				executionId,
			);

			const inputData: ITaskDataConnections = { main: [] };

			const result = await getBinaryDataBuffer(inputData, 0, binaryData, 0);
			expect(result).toEqual(specialBuffer);
		});

		it('should throw UnexpectedError for invalid parameter types', async () => {
			const inputData: ITaskDataConnections = { main: [] };

			// Test with number
			await expect(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				getBinaryDataBuffer(inputData, 0, 123 as any, 0),
			).rejects.toThrow('Provided parameter is not a string or binary data object.');

			// Test with null
			await expect(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				getBinaryDataBuffer(inputData, 0, null as any, 0),
			).rejects.toThrow('Provided parameter is not a string or binary data object.');

			// Test with undefined
			await expect(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				getBinaryDataBuffer(inputData, 0, undefined as any, 0),
			).rejects.toThrow('Provided parameter is not a string or binary data object.');

			// Test with plain object (not IBinaryData)
			await expect(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				getBinaryDataBuffer(inputData, 0, { notBinary: true } as any, 0),
			).rejects.toThrow('Provided parameter is not a string or binary data object.');

			// Test with array
			await expect(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				getBinaryDataBuffer(inputData, 0, [] as any, 0),
			).rejects.toThrow('Provided parameter is not a string or binary data object.');
		});
	});
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
				const incomingMessage = bufferToIncomingMessage(buffer, encoding);
				const data = await binaryToString(incomingMessage);
				expect(data).toBe(text);
			});
		}
	});

	it('should handle undefined encoding', async () => {
		const buffer = Buffer.from('Test');
		const result = await binaryToString(buffer);
		expect(result).toBe('Test');
	});

	it('should handle stream with no explicit encoding', async () => {
		const stream = Readable.from(Buffer.from('Test'));
		const result = await binaryToString(stream);
		expect(result).toBe('Test');
	});
});

describe('detectBinaryEncoding', () => {
	it('should detect encoding for utf-8 buffers', () => {
		const utf8Buffer = Buffer.from('Hello, 世界');
		expect(detectBinaryEncoding(utf8Buffer)).toBe('UTF-8');
	});

	it('should detect encoding for latin1 buffers', () => {
		const latinBuffer = Buffer.from('señor', 'latin1');
		expect(detectBinaryEncoding(latinBuffer)).toBe('ISO-8859-1');
	});

	it('should handle empty buffer', () => {
		const emptyBuffer = Buffer.from('');
		expect(detectBinaryEncoding(emptyBuffer)).toBeDefined();
	});
});

describe('assertBinaryData', () => {
	const mockNode = mock<INode>({ name: 'Test Node' });

	it('should throw error when no binary data exists', () => {
		const inputData = { main: [[{ json: {} }]] };

		expect(() => assertBinaryData(inputData, mockNode, 0, 'testFile', 0)).toThrow(
			"expects the node's input data to contain a binary file",
		);
	});

	it('should throw error when specific binary property does not exist', () => {
		const inputData = {
			main: [
				[
					{
						json: {},
						binary: {
							otherFile: mock<IBinaryData>(),
						},
					},
				],
			],
		};

		expect(() => assertBinaryData(inputData, mockNode, 0, 'testFile', 0)).toThrow(
			'The item has no binary field',
		);
	});

	it('should return binary data when it exists', () => {
		const binaryData = mock<IBinaryData>({ fileName: 'test.txt' });
		const inputData = {
			main: [
				[
					{
						json: {},
						binary: {
							testFile: binaryData,
						},
					},
				],
			],
		};

		const result = assertBinaryData(inputData, mockNode, 0, 'testFile', 0);
		expect(result).toBe(binaryData);
	});

	it('should return IBinaryData directly when parameterData is IBinaryData', () => {
		const binaryData = mock<IBinaryData>({
			fileName: 'test.txt',
			mimeType: 'text/plain',
			data: 'base64data',
		});
		const inputData = { main: [[{ json: {} }]] };

		const result = assertBinaryData(inputData, mockNode, 0, binaryData, 0);
		expect(result).toBe(binaryData);
	});

	it('should return IBinaryData directly when parameterData is IBinaryData with minimal properties', () => {
		const binaryData: IBinaryData = {
			mimeType: 'application/octet-stream',
			data: 'somedata',
		};
		const inputData = { main: [[{ json: {} }]] };

		const result = assertBinaryData(inputData, mockNode, 0, binaryData, 0);
		expect(result).toBe(binaryData);
	});

	it('should return IBinaryData directly when parameterData is IBinaryData with all properties', () => {
		const binaryData: IBinaryData = {
			fileName: 'document.pdf',
			mimeType: 'application/pdf',
			data: 'pdfbase64data',
			fileExtension: 'pdf',
			fileType: 'pdf',
			directory: '/tmp',
		};
		const inputData = { main: [[{ json: {} }]] };

		const result = assertBinaryData(inputData, mockNode, 0, binaryData, 0);
		expect(result).toBe(binaryData);
		expect(result.fileName).toBe('document.pdf');
		expect(result.mimeType).toBe('application/pdf');
		expect(result.fileExtension).toBe('pdf');
		expect(result.fileType).toBe('pdf');
		expect(result.directory).toBe('/tmp');
	});

	it('should throw error when parameterData is neither string nor IBinaryData', () => {
		const inputData = { main: [[{ json: {} }]] };

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(() => assertBinaryData(inputData, mockNode, 0, 123 as any, 0)).toThrow(
			'Provided parameter is not a string or binary data object.',
		);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(() => assertBinaryData(inputData, mockNode, 0, null as any, 0)).toThrow(
			'Provided parameter is not a string or binary data object.',
		);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(() => assertBinaryData(inputData, mockNode, 0, undefined as any, 0)).toThrow(
			'Provided parameter is not a string or binary data object.',
		);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(() => assertBinaryData(inputData, mockNode, 0, {} as any, 0)).toThrow(
			'Provided parameter is not a string or binary data object.',
		);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(() => assertBinaryData(inputData, mockNode, 0, [] as any, 0)).toThrow(
			'Provided parameter is not a string or binary data object.',
		);
	});
});

describe('copyBinaryFile', () => {
	const fileName = 'test.txt';
	const filePath = `/path/to/${fileName}`;
	const binaryData: IBinaryData = {
		data: '',
		mimeType: 'text/plain',
		fileName,
	};

	const binaryDataService = mock<BinaryDataService>();

	beforeEach(() => {
		jest.resetAllMocks();
		Container.set(BinaryDataService, binaryDataService);
		binaryDataService.copyBinaryFile.mockResolvedValueOnce(binaryData);
	});

	it('should handle files without explicit mime type', async () => {
		const result = await copyBinaryFile(workflowId, executionId, filePath, fileName);

		expect(result.fileName).toBe(fileName);
		expect(binaryDataService.copyBinaryFile).toHaveBeenCalledWith(
			workflowId,
			executionId,
			{
				...binaryData,
				fileExtension: 'txt',
				fileType: 'text',
			},
			filePath,
		);
	});

	it('should use provided mime type', async () => {
		const result = await copyBinaryFile(
			workflowId,
			executionId,
			filePath,
			fileName,
			'application/octet-stream',
		);

		expect(result.fileName).toBe(fileName);
		expect(binaryDataService.copyBinaryFile).toHaveBeenCalledWith(
			workflowId,
			executionId,
			{
				...binaryData,
				fileExtension: 'bin',
				fileType: undefined,
				mimeType: 'application/octet-stream',
			},
			filePath,
		);
	});
});

describe('prepareBinaryData', () => {
	const buffer: Buffer = Buffer.from('test', 'utf8');
	const binaryDataService = mock<BinaryDataService>();

	beforeEach(() => {
		jest.resetAllMocks();
		Container.set(BinaryDataService, binaryDataService);

		binaryDataService.store.mockImplementation(async (_w, _e, _b, binaryData) => binaryData);
	});

	it('parses filenames correctly', async () => {
		const fileName = 'test-file';

		const result = await prepareBinaryData(buffer, executionId, workflowId, fileName);

		expect(result.fileName).toEqual(fileName);
		expect(binaryDataService.store).toHaveBeenCalledWith(workflowId, executionId, buffer, {
			data: '',
			fileExtension: undefined,
			fileName,
			fileType: 'text',
			mimeType: 'text/plain',
		});
	});

	it('handles IncomingMessage with responseUrl', async () => {
		const incomingMessage = bufferToIncomingMessage(buffer);
		incomingMessage.responseUrl = 'http://example.com/file.txt';

		const result = await prepareBinaryData(incomingMessage, executionId, workflowId);

		expect(result.fileName).toBe('file.txt');
		expect(result.mimeType).toBe('text/plain');
	});

	it('handles buffer with no detectable mime type', async () => {
		const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);

		const result = await prepareBinaryData(buffer, executionId, workflowId);

		expect(result.mimeType).toBe('text/plain');
	});

	it('handles IncomingMessage with no content type or filename', async () => {
		const incomingMessage = bufferToIncomingMessage(Buffer.from('test'));
		delete incomingMessage.headers['content-type'];
		delete incomingMessage.contentDisposition;

		const result = await prepareBinaryData(incomingMessage, executionId, workflowId);

		expect(result.mimeType).toBe('text/plain');
	});
});

describe('setBinaryDataBuffer', () => {
	it('should handle empty buffer', async () => {
		const emptyBuffer = Buffer.from('');
		const binaryData: IBinaryData = {
			mimeType: 'text/plain',
			data: '',
		};

		const result = await setBinaryDataBuffer(binaryData, emptyBuffer, workflowId, executionId);

		expect(result).toBeDefined();
		expect(result.data).toBe('');
	});
});

describe('getBinaryHelperFunctions', () => {
	it('should return helper functions with correct context', async () => {
		const additionalData = { executionId } as IWorkflowExecuteAdditionalData;

		const helperFunctions = getBinaryHelperFunctions(additionalData, workflowId);

		const expectedMethods = [
			'getBinaryPath',
			'getBinaryStream',
			'getBinaryMetadata',
			'binaryToBuffer',
			'binaryToString',
			'prepareBinaryData',
			'setBinaryDataBuffer',
			'copyBinaryFile',
		] as const;

		expectedMethods.forEach((method) => {
			expect(helperFunctions).toHaveProperty(method);
			expect(typeof helperFunctions[method]).toBe('function');
		});

		await expect(async () => await helperFunctions.copyBinaryFile()).rejects.toThrow(
			'`copyBinaryFile` has been removed',
		);
	});
});

describe('createBinarySignedUrl', () => {
	const restApiUrl = 'https://n8n.host/rest';

	it('should get a signed url', async () => {
		const additionalData = { restApiUrl } as IWorkflowExecuteAdditionalData;
		const helperFunctions = getBinaryHelperFunctions(additionalData, workflowId);

		const binaryData = mock<IBinaryData>();
		const token = 'signed-token';

		const binaryDataService = mock<BinaryDataService>();
		Container.set(BinaryDataService, binaryDataService);
		binaryDataService.createSignedToken.mockReturnValueOnce(token);

		const result = helperFunctions.createBinarySignedUrl(binaryData);

		expect(result).toBe(`${restApiUrl}/binary-data/signed?token=${token}`);
		expect(binaryDataService.createSignedToken).toHaveBeenCalledWith(binaryData, undefined);
	});
});
