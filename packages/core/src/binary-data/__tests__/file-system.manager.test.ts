import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { FileSystemManager } from '@/binary-data/file-system.manager';
import type { ErrorReporter } from '@/errors';
import { toFileId, toStream } from '@test/utils';

import type { BinaryData } from '../types';

vi.mock('node:fs', async () => {
	const { mock: hoistedMock } = await import('vitest-mock-extended');
	const proxy = hoistedMock<typeof fs>();
	// Provide both `default` (for `import fs from`) and the proxy itself (for `import { x } from`).
	return new Proxy(proxy, {
		get: (target, prop, receiver) =>
			prop === 'default' ? receiver : Reflect.get(target, prop, receiver),
		has: (target, prop) => prop === 'default' || Reflect.has(target, prop),
	});
});
vi.mock('node:fs/promises', async () => {
	const { mock: hoistedMock } = await import('vitest-mock-extended');
	const proxy = hoistedMock<typeof fsp>();
	return new Proxy(proxy, {
		get: (target, prop, receiver) =>
			prop === 'default' ? receiver : Reflect.get(target, prop, receiver),
		has: (target, prop) => prop === 'default' || Reflect.has(target, prop),
	});
});

// @n8n/backend-common is loaded as compiled CJS and its `fs` references are not
// intercepted by our `vi.mock('node:fs/promises')`. Mock its `exists`/`assertDir`
// helpers directly so tests can control their behavior.
vi.mock('@n8n/backend-common', async (importOriginal) => {
	const actual =
		// eslint-disable-next-line @typescript-eslint/consistent-type-imports
		await importOriginal<typeof import('@n8n/backend-common')>();
	return {
		...actual,
		assertDir: vi.fn().mockResolvedValue(undefined),
		exists: vi.fn().mockResolvedValue(true),
	};
});

const mockFs = mock(fs);
const mockFsp = mock(fsp);

const storagePath = tmpdir();
const errorReporter = mock<ErrorReporter>();

const fsManager = new FileSystemManager(storagePath, errorReporter);

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

beforeEach(() => {
	vi.clearAllMocks();
});

afterAll(() => {
	vi.restoreAllMocks();
});

describe('store()', () => {
	it('should store a buffer', async () => {
		const metadata = { mimeType: 'text/plain' };
		mockFsp.stat.mockResolvedValue({ size: mockBuffer.length } as fs.Stats);

		const result = await fsManager.store(
			{ type: 'execution', workflowId, executionId },
			mockBuffer,
			metadata,
		);

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
		mockFsp.readFile.mockResolvedValue(mockBuffer);
		mockFsp.access.mockImplementation(async () => {});

		const result = await fsManager.getAsBuffer(fileId);

		expect(Buffer.isBuffer(result)).toBe(true);
		expect(mockFsp.readFile).toHaveBeenCalledWith(toFullFilePath(fileId));
	});
});

describe('getAsStream()', () => {
	it('should return a stream', async () => {
		mockFs.createReadStream.mockReturnValue(mockStream);
		mockFsp.access.mockImplementation(async () => {});

		const stream = await fsManager.getAsStream(fileId);

		expect(stream).toBeInstanceOf(Readable);
		expect(mockFs.createReadStream).toHaveBeenCalledWith(toFullFilePath(fileId), {
			highWaterMark: undefined,
		});
	});
});

describe('getMetadata()', () => {
	it('should return metadata', async () => {
		const mimeType = 'text/plain';
		const fileName = 'file.txt';

		mockFsp.readFile.mockResolvedValue(
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
		mockFsp.copyFile.mockResolvedValue(undefined);
		mockFsp.writeFile.mockResolvedValue(undefined);

		// @ts-expect-error - private method
		vi.spyOn(fsManager, 'toFileId').mockReturnValue(otherFileId);

		const targetFileId = await fsManager.copyByFileId(
			{ type: 'execution', workflowId, executionId },
			fileId,
		);

		const sourcePath = toFullFilePath(fileId);
		const targetPath = toFullFilePath(targetFileId);

		expect(mockFsp.copyFile).toHaveBeenCalledWith(sourcePath, targetPath);

		// Make sure metadata file was written
		expect(mockFsp.writeFile).toBeCalledTimes(1);
	});
});

describe('copyByFilePath()', () => {
	test('should copy by file path and return the file ID and size', async () => {
		const sourceFilePath = tmpdir();
		const metadata = { mimeType: 'text/plain' };

		// @ts-expect-error - private method
		vi.spyOn(fsManager, 'toFileId').mockReturnValue(otherFileId);

		// @ts-expect-error - private method
		vi.spyOn(fsManager, 'getSize').mockReturnValue(mockBuffer.length);

		const targetPath = toFullFilePath(otherFileId);

		mockFsp.cp.mockResolvedValue(undefined);
		mockFsp.writeFile.mockResolvedValue(undefined);

		const result = await fsManager.copyByFilePath(
			{ type: 'execution', workflowId, executionId },
			sourceFilePath,
			metadata,
		);

		expect(mockFsp.cp).toHaveBeenCalledWith(sourceFilePath, targetPath);
		expect(mockFsp.writeFile).toHaveBeenCalledWith(
			`${toFullFilePath(otherFileId)}.metadata`,
			JSON.stringify({ ...metadata, fileSize: mockBuffer.length }),
			{ encoding: 'utf-8' },
		);
		expect(result.fileSize).toBe(mockBuffer.length);
	});
});

describe('deleteMany()', () => {
	const rmOptions = {
		force: true,
		recursive: true,
	};

	it('should delete many files by workflow ID and execution ID', async () => {
		const ids: BinaryData.FileLocation[] = [
			{ type: 'execution', workflowId, executionId },
			{ type: 'execution', workflowId: otherWorkflowId, executionId: otherExecutionId },
		];

		mockFsp.rm.mockResolvedValue(undefined);

		const promise = fsManager.deleteMany(ids);

		await expect(promise).resolves.not.toThrow();

		expect(mockFsp.rm).toHaveBeenCalledTimes(2);
		expect(mockFsp.rm).toHaveBeenNthCalledWith(
			1,
			`${storagePath}/workflows/${workflowId}/executions/${executionId}`,
			rmOptions,
		);
		expect(mockFsp.rm).toHaveBeenNthCalledWith(
			2,
			`${storagePath}/workflows/${otherWorkflowId}/executions/${otherExecutionId}`,
			rmOptions,
		);
	});

	it('should suppress error on non-existing filepath', async () => {
		const ids: BinaryData.FileLocation[] = [
			{ type: 'execution', workflowId: 'does-not-exist', executionId: 'does-not-exist' },
		];

		mockFsp.rm.mockResolvedValue(undefined);

		const promise = fsManager.deleteMany(ids);

		await expect(promise).resolves.not.toThrow();

		expect(mockFsp.rm).toHaveBeenCalledTimes(1);
	});
});

describe('rename()', () => {
	it('should rename a file', async () => {
		mockFsp.rename.mockResolvedValue(undefined);
		mockFsp.rm.mockResolvedValue(undefined);

		const promise = fsManager.rename(fileId, otherFileId);

		const oldPath = toFullFilePath(fileId);
		const newPath = toFullFilePath(otherFileId);

		await expect(promise).resolves.not.toThrow();

		expect(mockFsp.rename).toHaveBeenCalledTimes(2);
		expect(mockFsp.rename).toHaveBeenCalledWith(oldPath, newPath);
		expect(mockFsp.rename).toHaveBeenCalledWith(`${oldPath}.metadata`, `${newPath}.metadata`);
	});
});
