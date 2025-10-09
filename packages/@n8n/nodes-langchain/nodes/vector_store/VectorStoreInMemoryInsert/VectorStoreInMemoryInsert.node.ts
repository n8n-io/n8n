import type { Embeddings } from '@langchain/core/embeddings';
import type { Document } from 'langchain/document';
import {
	NodeConnectionTypes,
	type INodeExecutionData,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import type { N8nJsonLoader } from '@utils/N8nJsonLoader';

import { MemoryVectorStoreManager } from '../shared/MemoryManager/MemoryVectorStoreManager';
import { processDocuments } from '../shared/processDocuments';

// This node is deprecated. Use VectorStoreInMemory instead.
export class VectorStoreInMemoryInsert implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'In Memory Vector Store Insert',
		name: 'vectorStoreInMemoryInsert',
		icon: 'fa:database',
		group: ['transform'],
		version: 1,
		hidden: true,
		description: 'Insert data into an in-memory vector store',
		defaults: {
			name: 'In Memory Vector Store Insert',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Vector Stores'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/',
					},
				],
			},
		},

		inputs: [
			NodeConnectionTypes.Main,
			{
				displayName: 'Document',
				maxConnections: 1,
				type: NodeConnectionTypes.AiDocument,
				required: true,
			},
			{
				displayName: 'Embedding',
				maxConnections: 1,
				type: NodeConnectionTypes.AiEmbedding,
				required: true,
			},
		],
		outputs: [NodeConnectionTypes.Main],
		properties: [
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
			{
				displayName: 'Memory Key',
				name: 'memoryKey',
				type: 'string',
				default: 'vector_store_key',
				description:
					'The key to use to store the vector memory in the workflow data. The key will be prefixed with the workflow ID to avoid collisions.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData(0);
		const embeddings = (await this.getInputConnectionData(
			NodeConnectionTypes.AiEmbedding,
			0,
		)) as Embeddings;

		const memoryKey = this.getNodeParameter('memoryKey', 0) as string;
		const clearStore = this.getNodeParameter('clearStore', 0) as boolean;
		const documentInput = (await this.getInputConnectionData(NodeConnectionTypes.AiDocument, 0)) as
			| N8nJsonLoader
			| Array<Document<Record<string, unknown>>>;

		const { processedDocuments, serializedDocuments } = await processDocuments(
			documentInput,
			items,
		);

		const workflowId = this.getWorkflow().id;

		const vectorStoreInstance = MemoryVectorStoreManager.getInstance(embeddings, this.logger);
		await vectorStoreInstance.addDocuments(
			`${workflowId}__${memoryKey}`,
			processedDocuments,
			clearStore,
		);

		return [serializedDocuments];
	}
}
