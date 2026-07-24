import { AzureByteStore, S3ByteStore } from '@n8n/blob-storage';
import { AzureBlobService } from '@n8n/blob-storage/azure-blob';
import { ObjectStoreService } from '@n8n/blob-storage/object-store';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { ExecutionDataJsonStore } from '@/executions/execution-data/execution-data-json-store';

import type { AgentKnowledgeFileStore } from '../agent-knowledge-file-store';
import type { AgentExecutionLogStore } from '../execution-log/agent-execution-log-store';
import { registerAgentBlobByteStores } from '../register-blob-byte-stores';

describe('registerAgentBlobByteStores', () => {
	let executionDataJsonStore: ReturnType<typeof mock<ExecutionDataJsonStore>>;
	let agentExecutionLogStore: ReturnType<typeof mock<AgentExecutionLogStore>>;
	let agentKnowledgeFileStore: ReturnType<typeof mock<AgentKnowledgeFileStore>>;

	beforeEach(() => {
		Container.reset();
		executionDataJsonStore = mock<ExecutionDataJsonStore>();
		agentExecutionLogStore = mock<AgentExecutionLogStore>();
		agentKnowledgeFileStore = mock<AgentKnowledgeFileStore>();
		executionDataJsonStore.hasLocation.mockReturnValue(false);
		Container.set(ObjectStoreService, mock<ObjectStoreService>());
		Container.set(AzureBlobService, mock<AzureBlobService>());
	});

	it('registers nothing when neither s3 nor az is configured', async () => {
		await registerAgentBlobByteStores({
			executionDataJsonStore,
			agentExecutionLogStore,
			agentKnowledgeFileStore,
		});

		expect(agentExecutionLogStore.registerByteStore).not.toHaveBeenCalled();
		expect(agentKnowledgeFileStore.registerByteStore).not.toHaveBeenCalled();
	});

	it('registers the same S3ByteStore on both stores when s3 is configured', async () => {
		executionDataJsonStore.hasLocation.mockImplementation((loc) => loc === 's3');

		await registerAgentBlobByteStores({
			executionDataJsonStore,
			agentExecutionLogStore,
			agentKnowledgeFileStore,
		});

		expect(agentExecutionLogStore.registerByteStore).toHaveBeenCalledTimes(1);
		expect(agentKnowledgeFileStore.registerByteStore).toHaveBeenCalledTimes(1);
		expect(agentExecutionLogStore.registerByteStore).toHaveBeenCalledWith(
			's3',
			expect.any(S3ByteStore),
		);
		expect(agentKnowledgeFileStore.registerByteStore).toHaveBeenCalledWith(
			's3',
			expect.any(S3ByteStore),
		);
		expect(agentExecutionLogStore.registerByteStore.mock.calls[0][1]).toBe(
			agentKnowledgeFileStore.registerByteStore.mock.calls[0][1],
		);
	});

	it('registers the same AzureByteStore on both stores when az is configured', async () => {
		executionDataJsonStore.hasLocation.mockImplementation((loc) => loc === 'az');

		await registerAgentBlobByteStores({
			executionDataJsonStore,
			agentExecutionLogStore,
			agentKnowledgeFileStore,
		});

		expect(agentExecutionLogStore.registerByteStore).toHaveBeenCalledTimes(1);
		expect(agentKnowledgeFileStore.registerByteStore).toHaveBeenCalledTimes(1);
		expect(agentExecutionLogStore.registerByteStore).toHaveBeenCalledWith(
			'az',
			expect.any(AzureByteStore),
		);
		expect(agentKnowledgeFileStore.registerByteStore).toHaveBeenCalledWith(
			'az',
			expect.any(AzureByteStore),
		);
		expect(agentExecutionLogStore.registerByteStore.mock.calls[0][1]).toBe(
			agentKnowledgeFileStore.registerByteStore.mock.calls[0][1],
		);
	});
});
