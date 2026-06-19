/* eslint-disable n8n-local-rules/no-uncaught-json-parse */
/* eslint-disable @typescript-eslint/unbound-method */

import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { AzureBlobService } from 'n8n-core/dist/binary-data/azure-blob/azure-blob.service.ee';

import { AzureStore } from '../azure-store.ee';
import { CorruptedExecutionDataError } from '../corrupted-execution-data.error';
import { ExecutionDataWriteError } from '../execution-data-write.error';
import { createExecutionRef } from '../types';
import { executionId, payload, ref, workflowId } from './mocks';

const keyFor = (execId: string) =>
	`workflows/${workflowId}/executions/${execId}/execution_data/bundle.json`;

/** An Azure SDK error as surfaced by `AzureBlobService` (wrapped, original on `cause`). */
const wrappedAzureError = (cause: unknown) =>
	new Error('Request to Azure Blob storage failed', { cause });

const blobNotFound = () =>
	wrappedAzureError(Object.assign(new Error('missing'), { code: 'BlobNotFound', statusCode: 404 }));

const bundle = { ...payload, version: 1 as const };

describe('AzureStore', () => {
	let azureBlob: ReturnType<typeof mock<AzureBlobService>>;
	let errorReporter: ReturnType<typeof mock<ErrorReporter>>;
	let azureStore: AzureStore;

	beforeEach(() => {
		azureBlob = mock<AzureBlobService>();
		errorReporter = mock<ErrorReporter>();
		azureStore = new AzureStore(azureBlob, errorReporter);
	});

	describe('write', () => {
		it('should upload the versioned bundle as JSON at the execution key', async () => {
			await azureStore.write(ref, payload);

			expect(azureBlob.put).toHaveBeenCalledTimes(1);
			const [key, body] = azureBlob.put.mock.calls[0];
			expect(key).toBe(keyFor(executionId));
			expect(JSON.parse(body.toString('utf-8'))).toMatchObject(bundle);
		});

		it('should wrap a put failure in `ExecutionDataWriteError`', async () => {
			azureBlob.put.mockRejectedValueOnce(new Error('access denied'));

			await expect(azureStore.write(ref, payload)).rejects.toThrow(ExecutionDataWriteError);
		});
	});

	describe('read', () => {
		it('should retrieve and parse the stored bundle', async () => {
			azureBlob.get.mockResolvedValueOnce(Buffer.from(JSON.stringify(bundle)));

			const result = await azureStore.read(ref);

			expect(result).toEqual(bundle);
			expect(azureBlob.get).toHaveBeenCalledWith(keyFor(executionId));
		});

		it('should return `null` when the blob is missing (BlobNotFound)', async () => {
			azureBlob.get.mockRejectedValueOnce(blobNotFound());

			expect(await azureStore.read(ref)).toBeNull();
		});

		it('should not treat a missing container (ContainerNotFound) as a missing blob', async () => {
			// ContainerNotFound is also HTTP 404, but is an infra/config problem that must surface.
			const containerNotFound = wrappedAzureError(
				Object.assign(new Error('no container'), {
					code: 'ContainerNotFound',
					statusCode: 404,
				}),
			);
			azureBlob.get.mockRejectedValueOnce(containerNotFound);

			await expect(azureStore.read(ref)).rejects.toBe(containerNotFound);
		});

		it('should throw `CorruptedExecutionDataError` for non-parseable content', async () => {
			azureBlob.get.mockResolvedValueOnce(Buffer.from('invalid json{{{'));

			await expect(azureStore.read(ref)).rejects.toThrow(CorruptedExecutionDataError);
		});

		it('should rethrow a systemic error (not a missing blob)', async () => {
			const throttled = wrappedAzureError(
				Object.assign(new Error('slow down'), { code: 'ServerBusy' }),
			);
			azureBlob.get.mockRejectedValueOnce(throttled);

			await expect(azureStore.read(ref)).rejects.toBe(throttled);
		});
	});

	describe('readMany', () => {
		it('should return a map keyed by executionId, omitting missing blobs', async () => {
			const present = createExecutionRef(workflowId, 'exec-1');
			const missing = createExecutionRef(workflowId, 'exec-2');
			azureBlob.get
				.mockResolvedValueOnce(Buffer.from(JSON.stringify(bundle)))
				.mockRejectedValueOnce(blobNotFound());

			const bundles = await azureStore.readMany([present, missing]);

			expect(bundles.size).toBe(1);
			expect(bundles.get('exec-1')).toEqual(bundle);
			expect(bundles.has('exec-2')).toBe(false);
		});

		it('should report and drop a corrupted bundle instead of rejecting the whole read', async () => {
			const good = createExecutionRef(workflowId, 'good');
			const bad = createExecutionRef(workflowId, 'bad');
			azureBlob.get
				.mockResolvedValueOnce(Buffer.from(JSON.stringify(bundle)))
				.mockResolvedValueOnce(Buffer.from('invalid json{{{'));

			const bundles = await azureStore.readMany([good, bad]);

			expect(bundles.has('good')).toBe(true);
			expect(bundles.has('bad')).toBe(false);
			expect(errorReporter.error).toHaveBeenCalledWith(expect.any(CorruptedExecutionDataError));
		});

		it('should rethrow a systemic read error instead of swallowing it', async () => {
			const target = createExecutionRef(workflowId, 'exec-1');
			const throttled = wrappedAzureError(
				Object.assign(new Error('slow down'), { code: 'ServerBusy' }),
			);
			azureBlob.get.mockRejectedValueOnce(throttled);

			await expect(azureStore.readMany([target])).rejects.toBe(throttled);
			expect(errorReporter.error).not.toHaveBeenCalled();
		});

		it('should return an empty map for an empty array', async () => {
			const bundles = await azureStore.readMany([]);

			expect(bundles.size).toBe(0);
			expect(azureBlob.get).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('should delete the blob at the execution key for a single ref', async () => {
			await azureStore.delete(ref);

			expect(azureBlob.delete).toHaveBeenCalledTimes(1);
			expect(azureBlob.delete).toHaveBeenCalledWith(keyFor(executionId));
		});

		it('should delete the blob for each ref in an array', async () => {
			const first = createExecutionRef(workflowId, 'exec-1');
			const second = createExecutionRef(workflowId, 'exec-2');

			await azureStore.delete([first, second]);

			expect(azureBlob.delete).toHaveBeenCalledTimes(2);
			expect(azureBlob.delete).toHaveBeenCalledWith(keyFor('exec-1'));
			expect(azureBlob.delete).toHaveBeenCalledWith(keyFor('exec-2'));
		});

		it('should be a no-op for an empty array', async () => {
			await azureStore.delete([]);

			expect(azureBlob.delete).not.toHaveBeenCalled();
		});
	});
});
