/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable n8n-local-rules/no-uncaught-json-parse */

import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { FsByteStore } from '@/blob-storage/fs-byte-store';

import { CorruptedExecutionDataError } from '../corrupted-execution-data.error';
import { ExecutionDataJsonStore } from '../execution-data-json-store';
import { ExecutionDataWriteError } from '../execution-data-write.error';
import { createExecutionRef } from '../types';
import { executionId, payload, ref, workflowId } from './mocks';

let fsByteStore: ReturnType<typeof mock<FsByteStore>>;
let errorReporter: ReturnType<typeof mock<ErrorReporter>>;
let store: ExecutionDataJsonStore;

beforeEach(() => {
	fsByteStore = mock<FsByteStore>();
	errorReporter = mock<ErrorReporter>();
	store = new ExecutionDataJsonStore(fsByteStore, errorReporter);
});

it('should serve `fs` out of the box, and `s3`/`az` only once registered at startup', () => {
	expect(store.hasLocation('fs')).toBe(true);
	expect(store.hasLocation('s3')).toBe(false);
	expect(store.hasLocation('az')).toBe(false);
});

it('should write the version-1 bundle at the stable execution-data key', async () => {
	await store.write(ref, payload, 'fs');
	expect(fsByteStore.write).toHaveBeenCalledWith(
		`workflows/${workflowId}/executions/${executionId}/execution_data/bundle.json`,
		expect.any(Buffer),
		'application/json',
	);
	const [_, body] = fsByteStore.write.mock.calls[0];
	expect(JSON.parse(body.toString('utf-8'))).toEqual({ ...payload, version: 1 });
});

it('should wrap a write failure in `ExecutionDataWriteError`', async () => {
	fsByteStore.write.mockRejectedValueOnce(new Error('access denied'));
	await expect(store.write(ref, payload, 'fs')).rejects.toThrow(ExecutionDataWriteError);
});

it('should surface a corrupted bundle as `CorruptedExecutionDataError`', async () => {
	fsByteStore.read.mockResolvedValueOnce(Buffer.from('invalid json{{{', 'utf-8'));
	await expect(store.read(ref, 'fs')).rejects.toThrow(CorruptedExecutionDataError);
});

it('should report corrupted bundles from a batch read to the error reporter', async () => {
	const good = createExecutionRef(workflowId, 'good');
	const bad = createExecutionRef(workflowId, 'bad');
	fsByteStore.read
		.mockResolvedValueOnce(Buffer.from(JSON.stringify({ ...payload, version: 1 }), 'utf-8'))
		.mockResolvedValueOnce(Buffer.from('invalid json{{{', 'utf-8'));

	const bundles = await store.readMany([
		{ ...good, storedAt: 'fs' },
		{ ...bad, storedAt: 'fs' },
	]);

	expect(bundles.has('good')).toBe(true);
	expect(bundles.has('bad')).toBe(false);
	expect(errorReporter.error).toHaveBeenCalledWith(expect.any(CorruptedExecutionDataError));
});
