import type { ByteStore } from '@n8n/blob-storage';
import { mock } from 'vitest-mock-extended';

import { BinaryDataBlobManager } from '@/binary-data/blob.manager';
import type { ErrorReporter } from '@/errors';
import { FileNotFoundError } from '@/errors/file-not-found.error';
import { toFileId } from '@test/utils';

/**
 * Native-metadata backend (S3, Azure): `getMetadata` present,
 * no prefix deletion, not addressed by filesystem path.
 */
type NativeByteStore = Required<Omit<ByteStore, 'deletePrefix' | 'getAbsolutePath' | 'init'>>;

const workflowId = 'ObogjVbqpNOQpiyV';
const executionId = '999';
const location = { type: 'execution', workflowId, executionId } as const;
const fileId = toFileId(workflowId, executionId, '71f6209b-5d48-41a2-a224-80d529d8bb32');
const body = Buffer.from('Test data', 'utf-8');

let byteStore: ReturnType<typeof mock<NativeByteStore>>;
let errorReporter: ReturnType<typeof mock<ErrorReporter>>;
let manager: BinaryDataBlobManager;

beforeEach(() => {
	byteStore = mock<NativeByteStore>();
	Object.assign(byteStore, { deletePrefix: undefined, getAbsolutePath: undefined });
	errorReporter = mock<ErrorReporter>();
	manager = new BinaryDataBlobManager(byteStore, errorReporter);
});

describe('store', () => {
	it('writes the bytes with native metadata and no metadata file', async () => {
		byteStore.write.mockResolvedValue(body.length);
		const metadata = { mimeType: 'text/plain', fileName: 'file.txt' };

		const result = await manager.store(location, body, metadata);

		expect(byteStore.write).toHaveBeenCalledTimes(1);
		expect(byteStore.write).toHaveBeenCalledWith(
			expect.stringMatching(
				new RegExp(`^workflows/${workflowId}/executions/${executionId}/binary_data/`),
			),
			body,
			metadata,
		);
		expect(result.fileSize).toBe(body.length);
	});
});

describe('getPath', () => {
	it('returns the file id unchanged', () => {
		expect(manager.getPath(fileId)).toBe(fileId);
	});
});

describe('getAsBuffer / getAsStream', () => {
	it('throws FileNotFoundError when the object is missing', async () => {
		byteStore.read.mockResolvedValue(null);
		byteStore.readStream.mockResolvedValue(null);

		await expect(manager.getAsBuffer(fileId)).rejects.toThrow(FileNotFoundError);
		await expect(manager.getAsStream(fileId)).rejects.toThrow(FileNotFoundError);
	});

	it('forwards chunkSize to the byte store', async () => {
		const stream = mock<NodeJS.ReadableStream>();
		byteStore.readStream.mockResolvedValue(stream as never);

		await manager.getAsStream(fileId, 1024);

		expect(byteStore.readStream).toHaveBeenCalledWith(fileId, { chunkSize: 1024 });
	});
});

describe('getMetadata', () => {
	it('returns native metadata without reading a metadata file', async () => {
		const metadata = { fileSize: 9, mimeType: 'text/plain' };
		byteStore.getMetadata.mockResolvedValue(metadata);

		expect(await manager.getMetadata(fileId)).toEqual(metadata);
		expect(byteStore.read).not.toHaveBeenCalled();
	});

	it('throws FileNotFoundError when the object is missing', async () => {
		byteStore.getMetadata.mockResolvedValue(null);

		await expect(manager.getMetadata(fileId)).rejects.toThrow(FileNotFoundError);
	});
});

describe('copyByFileId', () => {
	it('issues a single copy, relying on native metadata preservation', async () => {
		const targetFileId = await manager.copyByFileId(location, fileId);

		expect(byteStore.copy).toHaveBeenCalledTimes(1);
		expect(byteStore.copy).toHaveBeenCalledWith(fileId, targetFileId);
	});
});

describe('rename', () => {
	it('issues a single rename, relying on native metadata preservation', async () => {
		const newFileId = toFileId(workflowId, '1000', '71f6209b-5d48-41a2-a224-80d529d8bb33');

		await manager.rename(fileId, newFileId);

		expect(byteStore.rename).toHaveBeenCalledTimes(1);
		expect(byteStore.rename).toHaveBeenCalledWith(fileId, newFileId);
	});
});

describe('deletion', () => {
	it('deleteMany is a no-op without prefix deletion (delegated to lifecycle policies)', async () => {
		await manager.deleteMany([location]);

		expect(byteStore.delete).not.toHaveBeenCalled();
	});

	it('deleteManyByFileId is a no-op without prefix deletion, even for malformed ids', async () => {
		await manager.deleteManyByFileId([fileId, 'malformed-id']);

		expect(byteStore.delete).not.toHaveBeenCalled();
		expect(errorReporter.warn).not.toHaveBeenCalled();
	});
});
