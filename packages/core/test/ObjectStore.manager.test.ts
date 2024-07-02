import fs from 'node:fs/promises';
import { mock } from 'jest-mock-extended';
import { ObjectStoreManager } from '@/BinaryData/ObjectStore.manager';
import { ObjectStoreService } from '@/ObjectStore/ObjectStore.service.ee';
import { isStream } from '@/ObjectStore/utils';
import type { MetadataResponseHeaders } from '@/ObjectStore/types';
import { mockInstance, toFileId, toStream } from './utils';

jest.mock('fs/promises');

const objectStoreService = mockInstance(ObjectStoreService);
const objectStoreManager = new ObjectStoreManager(objectStoreService);

const workflowId = 'ObogjVbqpNOQpiyV';
const executionId = '999';
const fileUuid = '71f6209b-5d48-41a2-a224-80d529d8bb32';
const fileId = toFileId(workflowId, executionId, fileUuid);
const prefix = `workflows/${workflowId}/executions/${executionId}/binary_data/`;

const otherWorkflowId = 'FHio8ftV6SrCAfPJ';
const otherExecutionId = '888';
const otherFileUuid = '71f6209b-5d48-41a2-a224-80d529d8bb33';
const otherFileId = toFileId(otherWorkflowId, otherExecutionId, otherFileUuid);

const mockBuffer = Buffer.from('Test data');
const mockStream = toStream(mockBuffer);

beforeAll(() => {
	jest.restoreAllMocks();
});

describe('store()', () => {
	it('should store a buffer', async () => {
		const metadata = { mimeType: 'text/plain' };

		const result = await objectStoreManager.store(workflowId, executionId, mockBuffer, metadata);

		expect(result.fileId.startsWith(prefix)).toBe(true);
		expect(result.fileSize).toBe(mockBuffer.length);
	});
});

describe('getPath()', () => {
	it('should return a path', async () => {
		const path = objectStoreManager.getPath(fileId);

		expect(path).toBe(fileId);
	});
});

describe('getAsBuffer()', () => {
	it('should return a buffer', async () => {
		// @ts-expect-error Overload signature seemingly causing the return type to be misinferred
		objectStoreService.get.mockResolvedValue(mockBuffer);

		const result = await objectStoreManager.getAsBuffer(fileId);

		expect(Buffer.isBuffer(result)).toBe(true);
		expect(objectStoreService.get).toHaveBeenCalledWith(fileId, { mode: 'buffer' });
	});
});

describe('getAsStream()', () => {
	it('should return a stream', async () => {
		objectStoreService.get.mockResolvedValue(mockStream);

		const stream = await objectStoreManager.getAsStream(fileId);

		expect(isStream(stream)).toBe(true);
		expect(objectStoreService.get).toHaveBeenCalledWith(fileId, { mode: 'stream' });
	});
});

describe('getMetadata()', () => {
	it('should return metadata', async () => {
		const mimeType = 'text/plain';
		const fileName = 'file.txt';

		objectStoreService.getMetadata.mockResolvedValue(
			mock<MetadataResponseHeaders>({
				'content-length': '1',
				'content-type': mimeType,
				'x-amz-meta-filename': fileName,
			}),
		);

		const metadata = await objectStoreManager.getMetadata(fileId);

		expect(metadata).toEqual(expect.objectContaining({ fileSize: 1, mimeType, fileName }));
		expect(objectStoreService.getMetadata).toHaveBeenCalledWith(fileId);
	});
});

describe('copyByFileId()', () => {
	it('should copy by file ID and return the file ID', async () => {
		const targetFileId = await objectStoreManager.copyByFileId(workflowId, executionId, fileId);

		expect(targetFileId.startsWith(prefix)).toBe(true);
		expect(objectStoreService.get).toHaveBeenCalledWith(fileId, { mode: 'buffer' });
	});
});

describe('copyByFilePath()', () => {
	test('should copy by file path and return the file ID and size', async () => {
		const sourceFilePath = 'path/to/file/in/filesystem';
		const metadata = { mimeType: 'text/plain' };

		fs.readFile = jest.fn().mockResolvedValue(mockBuffer);

		const result = await objectStoreManager.copyByFilePath(
			workflowId,
			executionId,
			sourceFilePath,
			metadata,
		);

		expect(result.fileId.startsWith(prefix)).toBe(true);
		expect(fs.readFile).toHaveBeenCalledWith(sourceFilePath);
		expect(result.fileSize).toBe(mockBuffer.length);
	});
});

describe('rename()', () => {
	it('should rename a file', async () => {
		const promise = objectStoreManager.rename(fileId, otherFileId);

		await expect(promise).resolves.not.toThrow();

		expect(objectStoreService.get).toHaveBeenCalledWith(fileId, { mode: 'buffer' });
		expect(objectStoreService.getMetadata).toHaveBeenCalledWith(fileId);
		expect(objectStoreService.deleteOne).toHaveBeenCalledWith(fileId);
	});
});
