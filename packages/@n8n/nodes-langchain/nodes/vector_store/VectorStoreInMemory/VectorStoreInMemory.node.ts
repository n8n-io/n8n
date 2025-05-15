import type { Embeddings } from '@langchain/core/embeddings';
import type { MemoryVectorStore } from 'langchain/vectorstores/memory';
import {
	type INodeProperties,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
	type IDataObject,
	type NodeParameterValueType,
	ApplicationError,
} from 'n8n-workflow';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { MemoryVectorStoreManager } from '../shared/MemoryManager/MemoryVectorStoreManager';

const insertFields: INodeProperties[] = [
	{
		displayName:
			'<strong>For experimental use only</strong>: Data is stored in memory and will be lost if n8n restarts. Data may also be cleared if available memory gets low. <a href="https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/">More info</a>',
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

const DEFAULT_MEMORY_KEY = 'vector_store_key';

export class VectorStoreInMemory extends createVectorStoreNode<MemoryVectorStore>({
	meta: {
		displayName: 'Simple Vector Store',
		name: 'vectorStoreInMemory',
		description:
			"Work with your data in a Simple Vector Store. Don't use this for production usage.",
		icon: 'fa:database',
		iconColor: 'black',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/',
	},
	sharedFields: [
		{
			displayName: 'Memory Key',
			name: 'memoryKey',
			description:
				'The key to use to store the vector memory in the workflow data. The key will be prefixed with the workflow ID to avoid collisions.',
			type: 'resourceLocator',
			default: { mode: 'list', value: DEFAULT_MEMORY_KEY },
			required: true,
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'vectorStoresSearch',
						searchable: true,
						allowNewResource: true,
						allowNewResourceLabel: 'Create new vector store',
						addNewResourceMedhod: 'createVectorStore',
					},
				},
				{
					displayName: 'Manual',
					name: 'manual',
					type: 'string',
					placeholder: DEFAULT_MEMORY_KEY,
				},
			],
		},
	],
	methods: {
		listSearch: {
			async vectorStoresSearch(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(
					{} as Embeddings, // Real Embeddings are passed when executing the node
					this.logger,
				);

				const searchOptions: INodeListSearchResult['results'] = vectorStoreSingleton
					.getMemoryKeysList()
					.map((key) => {
						return {
							name: key,
							value: key,
						};
					});

				let results = searchOptions;
				if (filter) {
					results = results.filter((option) => option.name.includes(filter));
				}

				return {
					results,
				};
			},
		},
		actionHandler: {
			async createVectorStore(
				this: ILoadOptionsFunctions,
				payload: string | IDataObject | undefined,
			): Promise<NodeParameterValueType> {
				if (!payload || typeof payload === 'string') {
					throw new ApplicationError('Invalid payload type');
				}

				const { workflowId, name } = payload;

				const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(
					{} as Embeddings, // Real Embeddings are passed when executing the node
					this.logger,
				);

				const memoryKey = !!name ? (name as string) : DEFAULT_MEMORY_KEY;
				const prefixedMemoryKey = `${workflowId as string}__${memoryKey}`;

				await vectorStoreSingleton.getVectorStore(prefixedMemoryKey);

				return prefixedMemoryKey;
			},
		},
	},
	insertFields,
	loadFields: [],
	retrieveFields: [],
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const workflowId = context.getWorkflow().id;
		const memoryKey = context.getNodeParameter('memoryKey', itemIndex) as string;
		const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(embeddings, context.logger);

		return await vectorStoreSingleton.getVectorStore(`${workflowId}__${memoryKey}`);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const memoryKey = context.getNodeParameter('memoryKey', itemIndex) as string;
		const clearStore = context.getNodeParameter('clearStore', itemIndex) as boolean;
		const workflowId = context.getWorkflow().id;
		const vectorStoreInstance = MemoryVectorStoreManager.getInstance(embeddings, context.logger);

		await vectorStoreInstance.addDocuments(`${workflowId}__${memoryKey}`, documents, clearStore);
	},
}) {}
