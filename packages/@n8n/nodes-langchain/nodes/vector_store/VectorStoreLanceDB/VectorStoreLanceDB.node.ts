import type { INodeProperties } from 'n8n-workflow';
import { createVectorStoreNode } from '../shared/createVectorStoreNode';
import { MemoryVectorStoreManager } from '../shared/MemoryVectorStoreManager';

const insertFields: INodeProperties[] = [
	{
		displayName: 'The notice about file system storage',
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

export const VectorStoreLanceDB = createVectorStoreNode({
	meta: {
		displayName: 'LanceDB Vector Store',
		name: 'vectorStoreLanceDB',
		description: 'LanceDB description',
		icon: 'file:lancedb.png',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorelancedb/',
	},
	sharedFields: [
		{
			displayName: 'Directory Path',
			name: 'directoryPath',
			type: 'string',
			default: '',
			required: true,
			placeholder: '/tmp/lancedb/',
			description: 'Path of the LanceDB directory',
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
