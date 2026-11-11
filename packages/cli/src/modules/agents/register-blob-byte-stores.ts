import { AzureByteStore, S3ByteStore } from '@n8n/blob-storage';
import { Container } from '@n8n/di';

import type { ExecutionDataJsonStore } from '@/executions/execution-data/execution-data-json-store';

import type { AgentExecutionLogStore } from './execution-log/agent-execution-log-store';

/**
 * Registers s3/az byte stores on the agent execution-log store when
 * ExecutionDataJsonStore already has those locations configured (i.e.
 * base-command init succeeded). The fs backend is always available on the
 * store via its constructor. The knowledge module registers the same backends
 * on its own file store.
 */
export async function registerAgentBlobByteStores(stores: {
	executionDataJsonStore: ExecutionDataJsonStore;
	agentExecutionLogStore: AgentExecutionLogStore;
}): Promise<void> {
	const { executionDataJsonStore, agentExecutionLogStore } = stores;

	if (executionDataJsonStore.hasLocation('s3')) {
		const { ObjectStoreService } = await import('@n8n/blob-storage/object-store');
		agentExecutionLogStore.registerByteStore(
			's3',
			new S3ByteStore(Container.get(ObjectStoreService)),
		);
	}
	if (executionDataJsonStore.hasLocation('az')) {
		const { AzureBlobService } = await import('@n8n/blob-storage/azure-blob');
		agentExecutionLogStore.registerByteStore(
			'az',
			new AzureByteStore(Container.get(AzureBlobService)),
		);
	}
}
