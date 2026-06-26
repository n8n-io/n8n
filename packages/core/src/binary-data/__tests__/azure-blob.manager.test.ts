import fs from 'node:fs/promises';
import { Readable } from 'node:stream';

import { AzureBlobService } from '@/binary-data/azure-blob/azure-blob.service.ee';
import { AzureBlobManager } from '@/binary-data/azure-blob.manager';
import type { BinaryData } from '@/binary-data/types';
import { mockInstance, toFileId, toStream } from '@test/utils';

vi.mock('fs/promises');

const azureBlobService = mockInstance(AzureBlobService);
const azureBlobManager = new AzureBlobManager(azureBlobService);

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

beforeEach(() => {
	vi.resetAllMocks();
});

describe('store()', () => {
	it('should store a buffer under a binary_data prefix and forward metadata', async () => {
		const metadata = { mimeType: 'text/plain' };

		const result = await azureBlobManager.store(
			{ type: 'execution', workflowId, executionId },
			mockBuffer,
			metadata,
		);

		expect(result.fileId.startsWith(prefix)).toBe(true);
		expect(result.fileSize).toBe(mockBuffer.length);
		expect(azureBlobService.put).toHaveBeenCalledWith(
			expect.stringContaining(prefix),
			mockBuffer,
			metadata,
		);
	});
});

describe('getPath()', () => {
	it('should return the fileId unchanged', () => {
		expect(azureBlobManager.getPath(fileId)).toBe(fileId);
	});
});

describe('getAsBuffer()', () => {
	it('should return a buffer', async () => {
		// @ts-expect-error Overload signature seemingly causing the return type to be misinferred
		azureBlobService.get.mockResolvedValue(mockBuffer);

		const result = await azureBlobManager.getAsBuffer(fileId);

		expect(Buffer.isBuffer(result)).toBe(true);
		expect(azureBlobService.get).toHaveBeenCalledWith(fileId, { mode: 'buffer' });
	});
});

describe('getAsStream()', () => {
	it('should return a stream', async () => {
		azureBlobService.get.mockResolvedValue(mockStream);

		const stream = await azureBlobManager.getAsStream(fileId);

		expect(stream).toBeInstanceOf(Readable);
		expect(azureBlobService.get).toHaveBeenCalledWith(fileId, {
			mode: 'stream',
			chunkSize: undefined,
		});
	});

	it('should forward chunkSize to the service', async () => {
		azureBlobService.get.mockResolvedValue(mockStream);

		const providedChunkSize = 5 * 1024 * 1024;
		await azureBlobManager.getAsStream(fileId, providedChunkSize);

		expect(azureBlobService.get).toHaveBeenCalledWith(fileId, {
			mode: 'stream',
			chunkSize: providedChunkSize,
		});
	});
});

describe('getMetadata()', () => {
	it('should delegate to the service', async () => {
		const metadata: BinaryData.Metadata = {
			fileSize: 1,
			mimeType: 'text/plain',
			fileName: 'file.txt',
		};
		azureBlobService.getMetadata.mockResolvedValue(metadata);

		const result = await azureBlobManager.getMetadata(fileId);

		expect(result).toEqual(metadata);
		expect(azureBlobService.getMetadata).toHaveBeenCalledWith(fileId);
	});
});

describe('copyByFileId()', () => {
	it('should copy by file ID, preserving source metadata, and return the new file ID', async () => {
		const sourceMetadata: BinaryData.Metadata = {
			fileSize: mockBuffer.length,
			mimeType: 'text/plain',
			fileName: 'file.txt',
		};
		// @ts-expect-error Overload signature seemingly causing the return type to be misinferred
		azureBlobService.get.mockResolvedValue(mockBuffer);
		azureBlobService.getMetadata.mockResolvedValue(sourceMetadata);

		const targetFileId = await azureBlobManager.copyByFileId(
			{ type: 'execution', workflowId, executionId },
			fileId,
		);

		expect(targetFileId.startsWith(prefix)).toBe(true);
		expect(azureBlobService.get).toHaveBeenCalledWith(fileId, { mode: 'buffer' });
		expect(azureBlobService.getMetadata).toHaveBeenCalledWith(fileId);
		expect(azureBlobService.put).toHaveBeenCalledWith(targetFileId, mockBuffer, sourceMetadata);
	});
});

describe('copyByFilePath()', () => {
	test('should copy by file path and return the file ID and size', async () => {
		const sourceFilePath = 'path/to/file/in/filesystem';
		const metadata = { mimeType: 'text/plain' };

		fs.readFile = vi.fn().mockResolvedValue(mockBuffer);

		const result = await azureBlobManager.copyByFilePath(
			{ type: 'execution', workflowId, executionId },
			sourceFilePath,
			metadata,
		);

		expect(result.fileId.startsWith(prefix)).toBe(true);
		expect(fs.readFile).toHaveBeenCalledWith(sourceFilePath);
		expect(result.fileSize).toBe(mockBuffer.length);
	});
});

describe('rename()', () => {
	it('should copy to the new id with preserved metadata, then delete the old blob', async () => {
		const oldMetadata: BinaryData.Metadata = {
			fileSize: mockBuffer.length,
			mimeType: 'text/plain',
		};
		// @ts-expect-error Overload signature seemingly causing the return type to be misinferred
		azureBlobService.get.mockResolvedValue(mockBuffer);
		azureBlobService.getMetadata.mockResolvedValue(oldMetadata);

		await expect(azureBlobManager.rename(fileId, otherFileId)).resolves.not.toThrow();

		expect(azureBlobService.get).toHaveBeenCalledWith(fileId, { mode: 'buffer' });
		expect(azureBlobService.getMetadata).toHaveBeenCalledWith(fileId);
		expect(azureBlobService.put).toHaveBeenCalledWith(otherFileId, mockBuffer, oldMetadata);
		expect(azureBlobService.delete).toHaveBeenCalledWith(fileId);
	});
});
