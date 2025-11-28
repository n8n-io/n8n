import { testDb } from '@n8n/backend-test-utils';
import { BinaryDataRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { BinaryDataConfig } from 'n8n-core';
import { FileTooLargeError, InvalidSourceTypeError, MissingSourceIdError } from 'n8n-core';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { v4 as uuid } from 'uuid';

import { DatabaseManager } from '@/binary-data/database.manager';

jest.unmock('node:fs/promises');

let repository: BinaryDataRepository;
let dbManager: DatabaseManager;

const dbMaxFileSize = 10; // MB
const workflowId = 'wf-123';
const executionId = 'exec-123';
const buffer = Buffer.from('test file content');

beforeAll(async () => {
	await testDb.init();
	repository = Container.get(BinaryDataRepository);
	dbManager = new DatabaseManager(repository, mock<BinaryDataConfig>({ dbMaxFileSize }));
});

beforeEach(async () => {
	await testDb.truncate(['BinaryDataFile']);
});

afterAll(async () => {
	await testDb.terminate();
});

it('should store and retrieve a buffer with metadata', async () => {
	const { fileId, fileSize } = await dbManager.store(
		{ type: 'execution', workflowId, executionId },
		buffer,
		{ mimeType: 'text/plain', fileName: 'test.txt' },
	);

	const retrieved = await dbManager.getAsBuffer(fileId);
	expect(fileSize).toBe(buffer.length);
	expect(retrieved).toEqual(buffer);

	const metadata = await dbManager.getMetadata(fileId);
	expect(metadata).toEqual({
		fileName: 'test.txt',
		mimeType: 'text/plain',
		fileSize: buffer.length,
	});
});

it('should store a stream and convert to buffer', async () => {
	const stream = new Readable();
	stream.push(buffer);
	stream.push(null);

	const { fileId } = await dbManager.store({ type: 'execution', workflowId, executionId }, stream, {
		mimeType: 'image/png',
	});

	const retrieved = await dbManager.getAsBuffer(fileId);
	expect(retrieved).toEqual(buffer);
});

it('should store with custom source type', async () => {
	const MSG_ID = 'msg-123';
	const FILE_NAME = 'document.pdf';
	const SOURCE_TYPE = 'chat_message_attachment';

	const { fileId } = await dbManager.store(
		{
			type: 'custom',
			pathSegments: ['chat-hub', 'sessions', 'abc'],
			sourceType: SOURCE_TYPE,
			sourceId: MSG_ID,
		},
		buffer,
		{ mimeType: 'application/pdf', fileName: FILE_NAME },
	);

	const file = await repository.findOneByOrFail({ fileId });

	expect(file.sourceType).toBe(SOURCE_TYPE);
	expect(file.sourceId).toBe(MSG_ID);
	expect(file.fileName).toBe(FILE_NAME);
});

it('should throw FileTooLargeError when file exceeds size limit', async () => {
	const oversizedBuffer = Buffer.alloc((dbMaxFileSize + 1) * 1024 * 1024);

	const promise = dbManager.store({ type: 'execution', workflowId, executionId }, oversizedBuffer, {
		mimeType: 'video/mp4',
		fileName: 'large.mp4',
	});

	await expect(promise).rejects.toThrow(FileTooLargeError);

	const count = await repository.count();
	expect(count).toBe(0);
});

it('should tolerate missing MIME type and file name', async () => {
	const { fileId } = await dbManager.store(
		{ type: 'execution', workflowId, executionId },
		buffer,
		{},
	);

	const retrieved = await dbManager.getMetadata(fileId);

	expect(retrieved.fileName).toBeUndefined();
	expect(retrieved.mimeType).toBeUndefined();
	expect(retrieved.fileSize).toBe(buffer.length);
});

it('should delete files by execution IDs', async () => {
	const execution1 = 'exec-1';
	const execution2 = 'exec-2';
	const execution3 = 'exec-3';

	await dbManager.store({ type: 'execution', workflowId, executionId: execution1 }, buffer, {});
	await dbManager.store({ type: 'execution', workflowId, executionId: execution2 }, buffer, {});
	await dbManager.store({ type: 'execution', workflowId, executionId: execution3 }, buffer, {});

	await dbManager.deleteMany([
		{ type: 'execution', workflowId, executionId: execution1 },
		{ type: 'execution', workflowId, executionId: execution2 },
	]);

	const remaining = await repository.find();
	expect(remaining).toHaveLength(1);
	expect(remaining.at(0)?.sourceId).toBe(execution3);
});

it('should skip deletion on empty array', async () => {
	await dbManager.store({ type: 'execution', workflowId, executionId }, buffer, {});

	await dbManager.deleteMany([]);

	const count = await repository.count();
	expect(count).toBe(1);
});

it('should delete files by file IDs', async () => {
	const { fileId: fileId1 } = await dbManager.store(
		{ type: 'execution', workflowId, executionId: 'exec-1' },
		buffer,
		{},
	);
	const { fileId: fileId2 } = await dbManager.store(
		{ type: 'execution', workflowId, executionId: 'exec-2' },
		buffer,
		{},
	);
	const { fileId: fileId3 } = await dbManager.store(
		{ type: 'execution', workflowId, executionId: 'exec-3' },
		buffer,
		{},
	);

	await dbManager.deleteManyByFileId([fileId1, fileId2]);

	const remaining = await repository.find();
	expect(remaining).toHaveLength(1);
	expect(remaining.at(0)?.fileId).toBe(fileId3);
});

it('should copy a file by file ID', async () => {
	const { fileId: sourceFileId } = await dbManager.store(
		{ type: 'execution', workflowId, executionId: 'source-exec' },
		buffer,
		{ mimeType: 'text/plain', fileName: 'original.txt' },
	);

	const targetFileId = await dbManager.copyByFileId(
		{ type: 'execution', workflowId, executionId: 'target-exec' },
		sourceFileId,
	);

	expect(targetFileId).not.toBe(sourceFileId);

	const sourceFile = await repository.findOneByOrFail({ fileId: sourceFileId });
	const targetFile = await repository.findOneByOrFail({ fileId: targetFileId });

	expect(targetFile.data).toEqual(sourceFile.data);
	expect(targetFile.mimeType).toBe(sourceFile.mimeType);
	expect(targetFile.fileName).toBe(sourceFile.fileName);
	expect(targetFile.sourceId).toBe('target-exec');
	expect(sourceFile.sourceId).toBe('source-exec');
});

it('should rename a file', async () => {
	const { fileId: oldFileId } = await dbManager.store(
		{ type: 'execution', workflowId, executionId },
		buffer,
		{ mimeType: 'text/plain', fileName: 'old.txt' },
	);
	const newFileId = uuid();

	await dbManager.rename(oldFileId, newFileId);

	const oldExists = await repository.existsBy({ fileId: oldFileId });
	expect(oldExists).toBeFalsy();

	const newFile = await repository.findOneByOrFail({ fileId: newFileId });
	expect(newFile.data).toEqual(buffer);
	expect(newFile.fileName).toBe('old.txt');
});

it('should throw `BinaryDataFileNotFoundError` when renaming non-existent file', async () => {
	const nonExistentFileId = uuid();
	const newFileId = uuid();

	const promise = dbManager.rename(nonExistentFileId, newFileId);

	await expect(promise).rejects.toThrow('Binary data file not found');
});

it('should throw `BinaryDataFileNotFoundError` when copying non-existent file', async () => {
	const nonExistentFileId = uuid();

	const promise = dbManager.copyByFileId(
		{ type: 'execution', workflowId, executionId: 'target-exec' },
		nonExistentFileId,
	);

	await expect(promise).rejects.toThrow('Binary data file not found');
});

it('should error on custom file with invalid `sourceType`', async () => {
	const promise = dbManager.store(
		{
			type: 'custom',
			pathSegments: ['invalid'],
			sourceType: 'this_is_an_invalid_type',
			sourceId: 'test',
		},
		buffer,
		{},
	);

	await expect(promise).rejects.toThrow(InvalidSourceTypeError);
});

it('should error on custom file with missing `sourceId`', async () => {
	const promise = dbManager.store(
		{
			type: 'custom',
			pathSegments: ['test'],
			sourceType: 'execution',
			// no sourceId
		},
		buffer,
		{},
	);

	await expect(promise).rejects.toThrow(MissingSourceIdError);
});

it('should accept 255-char filename', async () => {
	const longFileName = 'a'.repeat(255);

	const { fileId } = await dbManager.store({ type: 'execution', workflowId, executionId }, buffer, {
		fileName: longFileName,
	});

	const metadata = await dbManager.getMetadata(fileId);
	expect(metadata.fileName).toBe(longFileName);
});

it('should accept Unicode filename', async () => {
	const unicodeFileName = '测试文件名-émojis-🎉🎊.pdf';

	const { fileId } = await dbManager.store({ type: 'execution', workflowId, executionId }, buffer, {
		fileName: unicodeFileName,
		mimeType: 'application/pdf',
	});

	const metadata = await dbManager.getMetadata(fileId);
	expect(metadata.fileName).toBe(unicodeFileName);
});

it('should copy file by path', async () => {
	const tempDir = await mkdtemp(join(tmpdir(), 'n8n-test-'));
	const tempFilePath = join(tempDir, 'test-file.txt');

	try {
		await writeFile(tempFilePath, buffer);

		const { fileId, fileSize } = await dbManager.copyByFilePath(
			{ type: 'execution', workflowId, executionId },
			tempFilePath,
			{ mimeType: 'text/plain', fileName: 'copied.txt' },
		);

		expect(fileSize).toBe(buffer.length);

		const retrieved = await dbManager.getAsBuffer(fileId);
		expect(retrieved).toEqual(buffer);

		const metadata = await dbManager.getMetadata(fileId);
		expect(metadata).toEqual({
			fileName: 'copied.txt',
			mimeType: 'text/plain',
			fileSize: buffer.length,
		});
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});

it('should throw FileTooLargeError when copying oversized file by path', async () => {
	const tempDir = await mkdtemp(join(tmpdir(), 'n8n-test-'));
	const tempFilePath = join(tempDir, 'large-file.bin');

	try {
		const oversizedBuffer = Buffer.alloc((dbMaxFileSize + 1) * 1024 * 1024);
		await writeFile(tempFilePath, oversizedBuffer);

		const promise = dbManager.copyByFilePath(
			{ type: 'execution', workflowId, executionId },
			tempFilePath,
			{ mimeType: 'application/octet-stream', fileName: 'large.bin' },
		);

		await expect(promise).rejects.toThrow(FileTooLargeError);

		const count = await repository.count();
		expect(count).toBe(0);
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
});
