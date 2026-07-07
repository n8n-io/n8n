/* eslint-disable n8n-local-rules/no-uncaught-json-parse */
/* eslint-disable @typescript-eslint/unbound-method */

import { mock } from 'vitest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { ObjectStoreService } from 'n8n-core/dist/binary-data/object-store/object-store.service.ee';
import type { Readable } from 'node:stream';

import { CorruptedExecutionDataError } from '../corrupted-execution-data.error';
import { ExecutionDataWriteError } from '../execution-data-write.error';
import { S3Store } from '../s3-store.ee';
import { createExecutionRef } from '../types';
import { executionId, payload, ref, workflowId } from './mocks';

const keyFor = (execId: string) =>
	`workflows/${workflowId}/executions/${execId}/execution_data/bundle.json`;

/** An S3 SDK error as surfaced by `ObjectStoreService` (wrapped, original on `cause`). */
const wrappedS3Error = (cause: unknown) => new Error('Request to S3 failed', { cause });

const notFoundByName = () =>
	wrappedS3Error(Object.assign(new Error('missing'), { name: 'NoSuchKey' }));

const bundle = { ...payload, version: 1 as const };

const bufferResult = (text: string) => Buffer.from(text) as unknown as Readable;

describe('S3Store', () => {
	let objectStoreService: ReturnType<typeof mock<ObjectStoreService>>;
	let errorReporter: ReturnType<typeof mock<ErrorReporter>>;
	let s3Store: S3Store;

	beforeEach(() => {
		objectStoreService = mock<ObjectStoreService>();
		errorReporter = mock<ErrorReporter>();
		s3Store = new S3Store(objectStoreService, errorReporter);
	});

	describe('write', () => {
		it('should put the versioned bundle as JSON at the execution key', async () => {
			const sizeBytes = await s3Store.write(ref, payload);

			expect(objectStoreService.put).toHaveBeenCalledTimes(1);
			const [key, body, metadata] = objectStoreService.put.mock.calls[0];
			expect(key).toBe(keyFor(executionId));
			expect(metadata).toEqual({ mimeType: 'application/json' });
			expect(JSON.parse(body.toString('utf-8'))).toMatchObject(bundle);
			expect(sizeBytes).toBe(body.length);
		});

		it('should wrap a put failure in `ExecutionDataWriteError`', async () => {
			objectStoreService.put.mockRejectedValueOnce(new Error('access denied'));

			await expect(s3Store.write(ref, payload)).rejects.toThrow(ExecutionDataWriteError);
		});
	});

	describe('read', () => {
		it('should retrieve and parse the stored bundle', async () => {
			objectStoreService.get.mockResolvedValueOnce(bufferResult(JSON.stringify(bundle)));

			const result = await s3Store.read(ref);

			expect(result).toEqual(bundle);
			expect(objectStoreService.get).toHaveBeenCalledWith(keyFor(executionId), { mode: 'buffer' });
		});

		it('should return `null` when the object is missing (NoSuchKey)', async () => {
			objectStoreService.get.mockRejectedValueOnce(notFoundByName());

			expect(await s3Store.read(ref)).toBeNull();
		});

		it('should not treat a bucket-level failure (NoSuchBucket) as a missing object', async () => {
			const noSuchBucket = wrappedS3Error(
				Object.assign(new Error('bucket missing'), {
					name: 'NoSuchBucket',
					$metadata: { httpStatusCode: 404 },
				}),
			);
			objectStoreService.get.mockRejectedValueOnce(noSuchBucket);

			await expect(s3Store.read(ref)).rejects.toBe(noSuchBucket);
		});

		it('should throw `CorruptedExecutionDataError` for non-parseable content', async () => {
			objectStoreService.get.mockResolvedValueOnce(bufferResult('invalid json{{{'));

			await expect(s3Store.read(ref)).rejects.toThrow(CorruptedExecutionDataError);
		});

		it('should rethrow a systemic error (not a missing object)', async () => {
			const throttled = wrappedS3Error(
				Object.assign(new Error('slow down'), { name: 'ThrottlingException' }),
			);
			objectStoreService.get.mockRejectedValueOnce(throttled);

			await expect(s3Store.read(ref)).rejects.toBe(throttled);
		});
	});

	describe('readMany', () => {
		it('should return a map keyed by executionId, omitting missing objects', async () => {
			const present = createExecutionRef(workflowId, 'exec-1');
			const missing = createExecutionRef(workflowId, 'exec-2');
			// `readMany` initiates gets in ref order, so queue results in that order.
			objectStoreService.get
				.mockResolvedValueOnce(bufferResult(JSON.stringify(bundle)))
				.mockRejectedValueOnce(notFoundByName());

			const bundles = await s3Store.readMany([present, missing]);

			expect(bundles.size).toBe(1);
			expect(bundles.get('exec-1')).toEqual(bundle);
			expect(bundles.has('exec-2')).toBe(false);
		});

		it('should report and drop a corrupted bundle instead of rejecting the whole read', async () => {
			const good = createExecutionRef(workflowId, 'good');
			const bad = createExecutionRef(workflowId, 'bad');
			objectStoreService.get
				.mockResolvedValueOnce(bufferResult(JSON.stringify(bundle)))
				.mockResolvedValueOnce(bufferResult('invalid json{{{'));

			const bundles = await s3Store.readMany([good, bad]);

			expect(bundles.has('good')).toBe(true);
			expect(bundles.has('bad')).toBe(false);
			expect(errorReporter.error).toHaveBeenCalledWith(expect.any(CorruptedExecutionDataError));
		});

		it('should rethrow a systemic read error instead of swallowing it', async () => {
			const target = createExecutionRef(workflowId, 'exec-1');
			const throttled = wrappedS3Error(
				Object.assign(new Error('slow down'), { name: 'ThrottlingException' }),
			);
			objectStoreService.get.mockRejectedValueOnce(throttled);

			await expect(s3Store.readMany([target])).rejects.toBe(throttled);
			expect(errorReporter.error).not.toHaveBeenCalled();
		});

		it('should return an empty map for an empty array', async () => {
			const bundles = await s3Store.readMany([]);

			expect(bundles.size).toBe(0);
			expect(objectStoreService.get).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('should delete the bundle object for a single ref', async () => {
			await s3Store.delete(ref);

			expect(objectStoreService.deleteByKeys).toHaveBeenCalledWith([keyFor(executionId)]);
		});

		it('should delete the bundle objects for multiple refs', async () => {
			const refs = [
				createExecutionRef(workflowId, 'exec-1'),
				createExecutionRef(workflowId, 'exec-2'),
			];

			await s3Store.delete(refs);

			expect(objectStoreService.deleteByKeys).toHaveBeenCalledWith([
				keyFor('exec-1'),
				keyFor('exec-2'),
			]);
		});

		it('should not send a request for an empty array', async () => {
			await s3Store.delete([]);

			expect(objectStoreService.deleteByKeys).not.toHaveBeenCalled();
		});
	});
});
