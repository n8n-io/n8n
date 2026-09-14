import type { ByteStore } from '@n8n/blob-storage';
import { mock } from 'vitest-mock-extended';

import { BinaryDataBlobManager, parseExecutionFileId } from '@/binary-data/blob.manager';
import { TEMP_EXECUTION_ID } from '@/binary-data/utils';
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

describe('parseExecutionFileId', () => {
	it('returns the workflow and the execution from an execution path', () => {
		expect(parseExecutionFileId(fileId)).toEqual({ workflowId, executionId });
	});

	it('returns the temp placeholder for a binary written before the execution row', () => {
		const tempFileId = toFileId(
			workflowId,
			TEMP_EXECUTION_ID,
			'71f6209b-5d48-41a2-a224-80d529d8bb32',
		);

		expect(parseExecutionFileId(tempFileId)).toEqual({
			workflowId,
			executionId: TEMP_EXECUTION_ID,
		});
	});

	it('returns null for a custom (non-execution) path', () => {
		const customFileId = 'chat-hub/sessions/s1/messages/m1/binary_data/71f6209b-5d48-41a2-a224';

		expect(parseExecutionFileId(customFileId)).toBeNull();
	});

	it('returns null for a malformed id', () => {
		expect(parseExecutionFileId('malformed-id')).toBeNull();
	});
});

describe('store', () => {
	// The read access check authorizes a temp binary on the workflow it parses out
	// of the path, so the writer and the parser must agree on that path.
	it('writes a missing execution id as a temp path the parser reads back', async () => {
		byteStore.write.mockResolvedValue(body.length);

		const { fileId: written } = await manager.store(
			{ type: 'execution', workflowId, executionId: '' },
			body,
			{},
		);

		expect(byteStore.write).toHaveBeenCalledWith(written, body, {});
		expect(parseExecutionFileId(written)).toEqual({
			workflowId,
			executionId: TEMP_EXECUTION_ID,
		});
	});

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

	it('deleteManyByFileId deletes objects by key, without metadata companions', async () => {
		await manager.deleteManyByFileId([fileId]);

		expect(byteStore.delete).toHaveBeenCalledWith([fileId]);
	});

	it('deleteManyByFileId warns on a malformed id without dropping the rest of the batch', async () => {
		await manager.deleteManyByFileId(['malformed-id', fileId]);

		expect(byteStore.delete).toHaveBeenCalledWith([fileId]);
		expect(errorReporter.warn).toHaveBeenCalledWith('Could not parse file ID. Skip deletion', {
			extra: { fileId: 'malformed-id' },
		});
	});

	it('deleteManyByFileId leaves the store untouched when every id is malformed', async () => {
		await manager.deleteManyByFileId(['malformed-id']);

		expect(byteStore.delete).not.toHaveBeenCalled();
	});
});
