import { AzureByteStore, S3ByteStore } from '@n8n/blob-storage';
import { Container } from '@n8n/di';

import type { ExecutionDataJsonStore } from '@/executions/execution-data/execution-data-json-store';

import type { AgentKnowledgeFileStore } from './agent-knowledge-file-store';
import type { AgentExecutionLogStore } from './execution-log/agent-execution-log-store';

/**
 * Registers s3/az byte stores on the agent execution-log and knowledge-file
 * stores when ExecutionDataJsonStore already has those locations configured
 * (i.e. base-command init succeeded). The fs backend is always available on
 * both stores via their constructors.
 */
export async function registerAgentBlobByteStores(stores: {
	executionDataJsonStore: ExecutionDataJsonStore;
	agentExecutionLogStore: AgentExecutionLogStore;
	agentKnowledgeFileStore: AgentKnowledgeFileStore;
}): Promise<void> {
	const { executionDataJsonStore, agentExecutionLogStore, agentKnowledgeFileStore } = stores;

	if (executionDataJsonStore.hasLocation('s3')) {
		const { ObjectStoreService } = await import('@n8n/blob-storage/object-store');
		const s3Store = new S3ByteStore(Container.get(ObjectStoreService));
		agentExecutionLogStore.registerByteStore('s3', s3Store);
		agentKnowledgeFileStore.registerByteStore('s3', s3Store);
	}
	if (executionDataJsonStore.hasLocation('az')) {
		const { AzureBlobService } = await import('@n8n/blob-storage/azure-blob');
		const azStore = new AzureByteStore(Container.get(AzureBlobService));
		agentExecutionLogStore.registerByteStore('az', azStore);
		agentKnowledgeFileStore.registerByteStore('az', azStore);
	}
}
