import type { Embeddings } from '@langchain/core/embeddings';
import type { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
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
import { DatabaseVectorStore } from './DatabaseVectorStore';

const warningBanner: INodeProperties = {
	displayName:
		'<strong>For experimental use only</strong>: Data is stored in memory and will be lost if n8n restarts. Data may also be cleared if available memory gets low, and is accessible to all users of this instance. <a href="https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/">More info</a>',
	name: 'notice',
	type: 'notice',
	default: '',
	displayOptions: {
		show: {
			enablePersistence: [false],
		},
	},
};

const persistenceBanner: INodeProperties = {
	displayName:
		'<strong>Database Persistence</strong>: Vectors are stored in the n8n instance database and will persist across restarts. Requires pgvector extension for PostgreSQL or uses sqlite-vec for SQLite. <a href="https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/">More info</a>',
	name: 'persistenceNotice',
	type: 'notice',
	default: '',
	displayOptions: {
		show: {
			enablePersistence: [true],
		},
	},
};

const insertFields: INodeProperties[] = [
	{
		displayName: 'Enable Persistence',
		name: 'enablePersistence',
		type: 'boolean',
		default: false,
		description: 'Whether to store vectors in the instance database instead of memory',
		hint: 'Requires pgvector extension for PostgreSQL instances',
	},
	{
		displayName: 'Clear Store',
		name: 'clearStore',
		type: 'boolean',
		default: false,
		description: 'Whether to clear the store before inserting new data',
	},
	warningBanner,
	persistenceBanner,
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

				const memoryKey = name ? (name as string) : DEFAULT_MEMORY_KEY;
				await vectorStoreSingleton.getVectorStore(memoryKey);

				return memoryKey;
			},
		},
	},
	insertFields,
	loadFields: [
		{
			displayName: 'Enable Persistence',
			name: 'enablePersistence',
			type: 'boolean',
			default: false,
			description: 'Whether to load vectors from the instance database instead of memory',
			hint: 'Requires pgvector extension for PostgreSQL instances',
		},
		warningBanner,
		persistenceBanner,
	],
	retrieveFields: [
		{
			displayName: 'Enable Persistence',
			name: 'enablePersistence',
			type: 'boolean',
			default: false,
			description: 'Whether to retrieve vectors from the instance database instead of memory',
			hint: 'Requires pgvector extension for PostgreSQL instances',
		},
		warningBanner,
		persistenceBanner,
	],
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const memoryKey = getMemoryKey(context, itemIndex);
		const enablePersistence = context.getNodeParameter(
			'enablePersistence',
			itemIndex,
			false,
		) as boolean;

		if (enablePersistence) {
			// Use database-backed vector store
			const vectorStoreService = context.helpers.getVectorStoreService?.();

			if (!vectorStoreService) {
				throw new ApplicationError(
					'Vector store persistence is not available. The vector-store module may not be loaded.',
				);
			}

			// Type assertion since we know the structure but it's typed as unknown
			const service = vectorStoreService as {
				canUsePersistence(): boolean;
			};

			if (!service.canUsePersistence()) {
				throw new ApplicationError(
					'Database persistence is not available. PostgreSQL requires pgvector extension to be installed.',
				);
			}

			return new DatabaseVectorStore(embeddings, vectorStoreService, memoryKey);
		} else {
			// Use in-memory vector store (existing behavior)
			const vectorStoreSingleton = MemoryVectorStoreManager.getInstance(embeddings, context.logger);
			return await vectorStoreSingleton.getVectorStore(memoryKey);
		}
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const memoryKey = getMemoryKey(context, itemIndex);
		const clearStore = context.getNodeParameter('clearStore', itemIndex) as boolean;
		const enablePersistence = context.getNodeParameter(
			'enablePersistence',
			itemIndex,
			false,
		) as boolean;

		if (enablePersistence) {
			// Use database-backed vector store
			const vectorStoreService = context.helpers.getVectorStoreService?.();

			if (!vectorStoreService) {
				throw new ApplicationError(
					'Vector store persistence is not available. The vector-store module may not be loaded.',
				);
			}

			// Type assertion since we know the structure but it's typed as unknown
			const service = vectorStoreService as {
				canUsePersistence(): boolean;
			};

			if (!service.canUsePersistence()) {
				throw new ApplicationError(
					'Database persistence is not available. PostgreSQL requires pgvector extension to be installed.',
				);
			}

			const vectorStore = new DatabaseVectorStore(embeddings, vectorStoreService, memoryKey);

			if (clearStore) {
				await vectorStore.clearStore();
			}

			await vectorStore.addDocuments(documents);
		} else {
			// Use in-memory vector store (existing behavior)
			const vectorStoreInstance = MemoryVectorStoreManager.getInstance(embeddings, context.logger);
			await vectorStoreInstance.addDocuments(memoryKey, documents, clearStore);
		}
	},
}) {}
