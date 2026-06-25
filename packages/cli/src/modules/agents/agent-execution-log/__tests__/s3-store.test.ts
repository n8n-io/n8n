/* eslint-disable @typescript-eslint/unbound-method */

import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { ObjectStoreService } from 'n8n-core/dist/binary-data/object-store/object-store.service.ee';

import { S3BlobStore } from '@/executions/blob-storage/s3-blob-store.ee';

import { S3Store } from '../s3-store';
import type { AgentExecutionLogPayload, AgentExecutionLogRef } from '../types';

const ref: AgentExecutionLogRef = {
	agentId: 'agent-1',
	threadId: 'thread-1',
	executionId: 'execution-1',
};

const payload: AgentExecutionLogPayload = {
	assistantResponse: 'Done',
	toolCalls: null,
	timeline: null,
	error: null,
};

const key = 'agents/agent-1/threads/thread-1/executions/execution-1/execution_log/bundle.json';

const wrappedS3Error = (cause: unknown) => new Error('Request to S3 failed', { cause });

describe('Agent execution log S3Store', () => {
	let objectStoreService: ReturnType<typeof mock<ObjectStoreService>>;
	let s3Store: S3Store;

	beforeEach(() => {
		objectStoreService = mock<ObjectStoreService>();
		s3Store = new S3Store(new S3BlobStore(objectStoreService), mock<ErrorReporter>());
	});

	it('writes the versioned bundle at the agent execution log key', async () => {
		await s3Store.write(ref, payload);

		const [actualKey, body, metadata] = objectStoreService.put.mock.calls[0];
		expect(actualKey).toBe(key);
		expect(JSON.parse(body.toString('utf-8'))).toMatchObject({ ...payload, version: 1 });
		expect(metadata).toEqual({ mimeType: 'application/json' });
	});

	it('returns null for a missing object', async () => {
		objectStoreService.get.mockRejectedValueOnce(
			wrappedS3Error(Object.assign(new Error('missing'), { name: 'NoSuchKey' })),
		);

		await expect(s3Store.read(ref)).resolves.toBeNull();
	});

	it('deletes by exact key', async () => {
		await s3Store.delete(ref);

		expect(objectStoreService.deleteByKeys).toHaveBeenCalledWith([key]);
	});
});
