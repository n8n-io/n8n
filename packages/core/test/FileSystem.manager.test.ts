import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { FileSystemManager } from '@/BinaryData/FileSystem.manager';
import { isStream } from '@/ObjectStore/utils';
import { toFileId, toStream } from './utils';

jest.mock('fs');
jest.mock('fs/promises');

const storagePath = tmpdir();

const fsManager = new FileSystemManager(storagePath);

const toFullFilePath = (fileId: string) => path.join(storagePath, fileId);

const workflowId = 'ObogjVbqpNOQpiyV';
const executionId = '999';
const fileUuid = '71f6209b-5d48-41a2-a224-80d529d8bb32';
const fileId = toFileId(workflowId, executionId, fileUuid);

const otherWorkflowId = 'FHio8ftV6SrCAfPJ';
const otherExecutionId = '888';
const otherFileUuid = '71f6209b-5d48-41a2-a224-80d529d8bb33';
const otherFileId = toFileId(otherWorkflowId, otherExecutionId, otherFileUuid);

const mockBuffer = Buffer.from('Test data');
const mockStream = toStream(mockBuffer);

afterAll(() => {
	jest.restoreAllMocks();
});

describe('store()', () => {
	it('should store a buffer', async () => {
		const metadata = { mimeType: 'text/plain' };

		const result = await fsManager.store(workflowId, executionId, mockBuffer, metadata);

		expect(result.fileSize).toBe(mockBuffer.length);
	});
});

describe('getPath()', () => {
	it('should return a path', async () => {
		const filePath = fsManager.getPath(fileId);

		expect(filePath).toBe(toFullFilePath(fileId));
	});
});

describe('getAsBuffer()', () => {
	it('should return a buffer', async () => {
		fsp.readFile = jest.fn().mockResolvedValue(mockBuffer);

		const result = await fsManager.getAsBuffer(fileId);

		expect(Buffer.isBuffer(result)).toBe(true);
		expect(fsp.readFile).toHaveBeenCalledWith(toFullFilePath(fileId));
	});
});

describe('getAsStream()', () => {
	it('should return a stream', async () => {
		fs.createReadStream = jest.fn().mockReturnValue(mockStream);

		const stream = await fsManager.getAsStream(fileId);

		expect(isStream(stream)).toBe(true);
		expect(fs.createReadStream).toHaveBeenCalledWith(toFullFilePath(fileId), {
			highWaterMark: undefined,
		});
	});
});

describe('getMetadata()', () => {
	it('should return metadata', async () => {
		const mimeType = 'text/plain';
		const fileName = 'file.txt';

		fsp.readFile = jest.fn().mockResolvedValue(
			JSON.stringify({
				fileSize: 1,
				mimeType,
				fileName,
			}),
		);

		const metadata = await fsManager.getMetadata(fileId);

		expect(metadata).toEqual(expect.objectContaining({ fileSize: 1, mimeType, fileName }));
	});
});

describe('copyByFileId()', () => {
	it('should copy by file ID and return the file ID', async () => {
		fsp.copyFile = jest.fn().mockResolvedValue(undefined);

		// @ts-expect-error - private method
		jest.spyOn(fsManager, 'toFileId').mockReturnValue(otherFileId);

		const targetFileId = await fsManager.copyByFileId(workflowId, executionId, fileId);

		const sourcePath = toFullFilePath(fileId);
		const targetPath = toFullFilePath(targetFileId);

		expect(fsp.copyFile).toHaveBeenCalledWith(sourcePath, targetPath);
	});
});

describe('copyByFilePath()', () => {
	test('should copy by file path and return the file ID and size', async () => {
		const sourceFilePath = tmpdir();
		const metadata = { mimeType: 'text/plain' };

		// @ts-expect-error - private method
		jest.spyOn(fsManager, 'toFileId').mockReturnValue(otherFileId);

		// @ts-expect-error - private method
		jest.spyOn(fsManager, 'getSize').mockReturnValue(mockBuffer.length);

		const targetPath = toFullFilePath(otherFileId);

		fsp.cp = jest.fn().mockResolvedValue(undefined);

		const result = await fsManager.copyByFilePath(
			workflowId,
			executionId,
			sourceFilePath,
			metadata,
		);

		expect(fsp.cp).toHaveBeenCalledWith(sourceFilePath, targetPath);
		expect(result.fileSize).toBe(mockBuffer.length);
	});
});

describe('deleteMany()', () => {
	it('should delete many files by workflow ID and execution ID', async () => {
		const ids = [
			{ workflowId, executionId },
			{ workflowId: otherWorkflowId, executionId: otherExecutionId },
		];

		fsp.rm = jest.fn().mockResolvedValue(undefined);

		const promise = fsManager.deleteMany(ids);

		await expect(promise).resolves.not.toThrow();

		expect(fsp.rm).toHaveBeenCalledTimes(2);
	});

	it('should suppress error on non-existing filepath', async () => {
		const ids = [{ workflowId: 'does-not-exist', executionId: 'does-not-exist' }];

		fsp.rm = jest.fn().mockResolvedValue(undefined);

		const promise = fsManager.deleteMany(ids);

		await expect(promise).resolves.not.toThrow();

		expect(fsp.rm).toHaveBeenCalledTimes(1);
	});
});

describe('rename()', () => {
	it('should rename a file', async () => {
		fsp.rename = jest.fn().mockResolvedValue(undefined);
		fsp.rm = jest.fn().mockResolvedValue(undefined);

		const promise = fsManager.rename(fileId, otherFileId);

		const oldPath = toFullFilePath(fileId);
		const newPath = toFullFilePath(otherFileId);

		await expect(promise).resolves.not.toThrow();

		expect(fsp.rename).toHaveBeenCalledTimes(2);
		expect(fsp.rename).toHaveBeenCalledWith(oldPath, newPath);
		expect(fsp.rename).toHaveBeenCalledWith(`${oldPath}.metadata`, `${newPath}.metadata`);
	});
});
