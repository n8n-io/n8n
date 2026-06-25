/* eslint-disable @typescript-eslint/unbound-method */

import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { AzureBlobService } from 'n8n-core/dist/binary-data/azure-blob/azure-blob.service.ee';

import { AzureBlobStore } from '@/executions/blob-storage/azure-blob-store.ee';

import { AzureStore } from '../azure-store';
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

const wrappedAzureError = (cause: unknown) =>
	new Error('Request to Azure Blob storage failed', { cause });

describe('Agent execution log AzureStore', () => {
	let azureBlob: ReturnType<typeof mock<AzureBlobService>>;
	let azureStore: AzureStore;

	beforeEach(() => {
		azureBlob = mock<AzureBlobService>();
		azureStore = new AzureStore(new AzureBlobStore(azureBlob), mock<ErrorReporter>());
	});

	it('writes the versioned bundle at the agent execution log key', async () => {
		await azureStore.write(ref, payload);

		const [actualKey, body, metadata] = azureBlob.put.mock.calls[0];
		expect(actualKey).toBe(key);
		expect(JSON.parse(body.toString('utf-8'))).toMatchObject({ ...payload, version: 1 });
		expect(metadata).toEqual({ mimeType: 'application/json' });
	});

	it('returns null for a missing blob', async () => {
		azureBlob.get.mockRejectedValueOnce(
			wrappedAzureError(Object.assign(new Error('missing'), { code: 'BlobNotFound' })),
		);

		await expect(azureStore.read(ref)).resolves.toBeNull();
	});

	it('deletes by exact key', async () => {
		await azureStore.delete(ref);

		expect(azureBlob.delete).toHaveBeenCalledWith(key);
	});
});
