import fs from 'node:fs/promises';
import { ObjectStoreManager } from '../src/BinaryData/ObjectStore.manager';
import { ObjectStoreService } from '..';
import { mockInstance, toStream } from './utils';
import { isStream } from '@/ObjectStore/utils';

jest.mock('fs/promises');

const objectStoreService = mockInstance(ObjectStoreService);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const objectStoreManager = new ObjectStoreManager(objectStoreService);

const toFileId = (workflowId: string, executionId: string, fileUuid: string): string =>
	`workflows/${workflowId}/executions/${executionId}/binary_data/${fileUuid}`;

const workflowId = 'ObogjVbqpNOQpiyV';
const executionId = '999';
const fileUuid = '71f6209b-5d48-41a2-a224-80d529d8bb32';
const fileId = toFileId(workflowId, executionId, fileUuid);

const otherWorkflowId = 'FHio8ftV6SrCAfPJ';
const otherExecutionId = '888';
const otherFileUuid = '71f6209b-5d48-41a2-a224-80d529d8bb33';
const otherFileId = toFileId(otherWorkflowId, otherExecutionId, otherFileUuid);

test('store() should store a buffer', async () => {
	const buffer = Buffer.from('Test data');
	const metadata = { mimeType: 'text/plain' };

	const result = await objectStoreManager.store(workflowId, executionId, buffer, metadata);

	const expectedPrefix = `workflows/${workflowId}/executions/${executionId}/binary_data/`;

	expect(result.fileId.startsWith(expectedPrefix)).toBe(true);
	expect(result.fileSize).toBe(buffer.length);
});

test('getPath() should return a path', async () => {
	const path = objectStoreManager.getPath(fileId);

	expect(path).toBe(fileId);
});

test('getAsBuffer() should return a buffer', async () => {
	const fileId =
		'workflows/ObogjVbqpNOQpiyV/executions/123/binary_data/71f6209b-5d48-41a2-a224-80d529d8bb32';

	// @ts-expect-error Overload signature seemingly causing Jest to misinfer the return type
	objectStoreService.get.mockResolvedValueOnce(Buffer.from('Test data'));

	const result = await objectStoreManager.getAsBuffer(fileId);

	expect(Buffer.isBuffer(result)).toBe(true);
	expect(objectStoreService.get).toHaveBeenCalledWith(fileId, { mode: 'buffer' });
});

test('getAsStream() should return a stream', async () => {
	objectStoreService.get.mockResolvedValueOnce(toStream(Buffer.from('Test data')));

	const stream = await objectStoreManager.getAsStream(fileId);

	expect(isStream(stream)).toBe(true);
	expect(objectStoreService.get).toHaveBeenCalledWith(fileId, { mode: 'stream' });
});

test('getMetadata() should return metadata', async () => {
	objectStoreService.getMetadata.mockResolvedValue({
		'content-length': '1',
		'content-type': 'text/plain',
		'x-amz-meta-filename': 'file.txt',
	});

	const metadata = await objectStoreManager.getMetadata(fileId);

	expect(metadata).toEqual(expect.objectContaining({ fileSize: 1 }));
	expect(objectStoreService.getMetadata).toHaveBeenCalledWith(fileId);
});

test('copyByFileId() should copy by file ID and return the file ID', async () => {
	const targetFileId = await objectStoreManager.copyByFileId(workflowId, executionId, fileId);

	const expectedPrefix = `workflows/${workflowId}/executions/${executionId}/binary_data/`;

	expect(targetFileId.startsWith(expectedPrefix)).toBe(true);
	expect(objectStoreService.get).toHaveBeenCalledWith(fileId, { mode: 'buffer' });
});

test('copyByFilePath() should copy by file path and return the file ID and size', async () => {
	const sourceFilePath = 'path/to/file/in/filesystem';
	const metadata = { mimeType: 'text/plain' };
	const buffer = Buffer.from('Test file content');

	fs.readFile = jest.fn().mockResolvedValueOnce(buffer);

	const result = await objectStoreManager.copyByFilePath(
		workflowId,
		executionId,
		sourceFilePath,
		metadata,
	);

	const expectedPrefix = `workflows/${workflowId}/executions/${executionId}/binary_data/`;

	expect(result.fileId.startsWith(expectedPrefix)).toBe(true);
	expect(fs.readFile).toHaveBeenCalledWith(sourceFilePath);
	expect(result.fileSize).toBe(buffer.length);
});

test('deleteMany() should delete many files by prefix', async () => {
	const ids = [
		{ workflowId, executionId },
		{ workflowId: otherWorkflowId, executionId: otherExecutionId },
	];

	const promise = objectStoreManager.deleteMany(ids);

	await expect(promise).resolves.not.toThrow();

	expect(objectStoreService.deleteMany).toHaveBeenCalledTimes(2);
});

test('rename() should rename a file', async () => {
	const promise = objectStoreManager.rename(fileId, otherFileId);

	await expect(promise).resolves.not.toThrow();

	expect(objectStoreService.get).toHaveBeenCalledWith(fileId, { mode: 'buffer' });
	expect(objectStoreService.getMetadata).toHaveBeenCalledWith(fileId);
	expect(objectStoreService.deleteOne).toHaveBeenCalledWith(fileId);
});
