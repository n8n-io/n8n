import type { INodeProperties } from 'n8n-workflow';
import { createVectorStoreNode } from '../shared/createVectorStoreNode';
import { MemoryVectorStoreManager } from '../shared/MemoryVectorStoreManager';

const insertFields: INodeProperties[] = [
	{
		displayName:
			'The embbded data are stored in the server memory, so they will be lost when the server is restarted. Additionally, if the amount of data is too large, it may cause the server to crash due to insufficient memory.',
		name: 'notice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Clear Store',
		name: 'clearStore',
		type: 'boolean',
		default: false,
		description: 'Whether to clear the store before inserting new data',
	},
];

export const VectorStoreInMemory = createVectorStoreNode({
	meta: {
		displayName: 'In-Memory Vector Store',
		name: 'vectorStoreInMemory',
		description: 'Work with your data in In-Memory Vector Store',
		icon: 'fa:database',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/',
	},
	sharedFields: [
		{
			displayName: 'Memory Key',
			name: 'memoryKey',
			type: 'string',
			default: 'vector_store_key',
			description:
				'The key to use to store the vector memory in the workflow data. The key will be prefixed with the workflow ID to avoid collisions.',
		},
	],
	insertFields,
	loadFields: [],
	retrieveFields: [],
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const workflowId = context.getWorkflow().id;
		const memoryKey = context.getNodeParameter('memoryKey', itemIndex) as string;
		const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(embeddings);

		return await vectorStoreSingleton.getVectorStore(`${workflowId}__${memoryKey}`);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const memoryKey = context.getNodeParameter('memoryKey', itemIndex) as string;
		const clearStore = context.getNodeParameter('clearStore', itemIndex) as boolean;
		const workflowId = context.getWorkflow().id;
		const vectorStoreInstance = MemoryVectorStoreManager.getInstance(embeddings);

		void vectorStoreInstance.addDocuments(`${workflowId}__${memoryKey}`, documents, clearStore);
	},
});
