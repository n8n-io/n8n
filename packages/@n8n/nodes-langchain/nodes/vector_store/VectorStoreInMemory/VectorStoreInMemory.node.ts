import type { Embeddings } from '@langchain/core/embeddings';
import type { MemoryVectorStore } from 'langchain/vectorstores/memory';
import {
	type INodeProperties,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
	type IDataObject,
	type NodeParameterValueType,
	type IExecuteFunctions,
	type ISupplyDataFunctions,
	ApplicationError,
} from 'n8n-workflow';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { MemoryVectorStoreManager } from '../shared/MemoryManager/MemoryVectorStoreManager';

const warningBanner: INodeProperties = {
	displayName:
		'<strong>For experimental use only</strong>: Data is stored in memory and will be lost if n8n restarts. Data may also be cleared if available memory gets low, and is accessible to all users of this instance. <a href="https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/">More info</a>',
	name: 'notice',
	type: 'notice',
	default: '',
};

const insertFields: INodeProperties[] = [
	{
		displayName: 'Clear Store',
		name: 'clearStore',
		type: 'boolean',
		default: false,
		description: 'Whether to clear the store before inserting new data',
	},
	warningBanner,
];

const DEFAULT_MEMORY_KEY = 'vector_store_key';

function getMemoryKey(context: IExecuteFunctions | ISupplyDataFunctions, itemIndex: number) {
	const node = context.getNode();
	if (node.typeVersion <= 1.1) {
		const memoryKeyParam = context.getNodeParameter('memoryKey', itemIndex) as string;
		const workflowId = context.getWorkflow().id;

		return `${workflowId}__${memoryKeyParam}`;
	} else {
		const memoryKeyParam = context.getNodeParameter('memoryKey', itemIndex) as {
			mode: string;
			value: string;
		};

		return memoryKeyParam.value;
	}
}

export class VectorStoreInMemory extends createVectorStoreNode<MemoryVectorStore>({
	meta: {
		displayName: 'Simple Vector Store',
		name: 'vectorStoreInMemory',
		description: 'The easiest way to experiment with vector stores, without external setup.',
		icon: 'fa:database',
		iconColor: 'black',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/',
		categories: ['AI'],
		subcategories: {
			AI: ['Vector Stores', 'Tools', 'Root Nodes'],
			'Vector Stores': ['For Beginners'],
			Tools: ['Other Tools'],
		},
	},
	sharedFields: [
		{
			displayName: 'Memory Key',
			name: 'memoryKey',
			type: 'string',
			default: DEFAULT_MEMORY_KEY,
			description:
				'The key to use to store the vector memory in the workflow data. The key will be prefixed with the workflow ID to avoid collisions.',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { lte: 1.1 } }],
				},
			},
		},
		{
			displayName: 'Memory Key',
			name: 'memoryKey',
			type: 'resourceLocator',
			required: true,
			default: { mode: 'list', value: DEFAULT_MEMORY_KEY },
			description:
				'The key to use to store the vector memory in the workflow data. These keys are shared between workflows.',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { gte: 1.2 } }],
				},
			},
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'vectorStoresSearch',
						searchable: true,
						allowNewResource: {
							label: 'resourceLocator.mode.list.addNewResource.vectorStoreInMemory',
							defaultName: DEFAULT_MEMORY_KEY,
							method: 'createVectorStore',
						},
					},
				},
				{
					displayName: 'Manual',
					name: 'id',
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
					{} as Embeddings, // Real Embeddings are provided when executing the node
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

				const { name } = payload;

				const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(
					{} as Embeddings, // Real Embeddings are provided when executing the node
					this.logger,
				);

				const memoryKey = !!name ? (name as string) : DEFAULT_MEMORY_KEY;
				await vectorStoreSingleton.getVectorStore(memoryKey);

				return memoryKey;
			},
		},
	},
	insertFields,
	loadFields: [warningBanner],
	retrieveFields: [warningBanner],
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const memoryKey = getMemoryKey(context, itemIndex);
		const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(embeddings, context.logger);

		return await vectorStoreSingleton.getVectorStore(memoryKey);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const memoryKey = getMemoryKey(context, itemIndex);
		const clearStore = context.getNodeParameter('clearStore', itemIndex) as boolean;
		const vectorStoreInstance = MemoryVectorStoreManager.getInstance(embeddings, context.logger);

		await vectorStoreInstance.addDocuments(memoryKey, documents, clearStore);
	},
}) {}
