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
		'<strong>Database Persistence</strong>: Vectors are stored in the n8n instance database and will persist across restarts. <a href="https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreinmemory/">More info</a>',
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
		displayName: 'Clear Store',
		name: 'clearStore',
		type: 'boolean',
		default: false,
		description: 'Whether to clear the store before inserting new data',
	},
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

export class VectorStoreInMemory extends createVectorStoreNode<
	MemoryVectorStore | DatabaseVectorStore
>({
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
			displayName: 'Enable Persistence',
			name: 'enablePersistence',
			type: 'boolean',
			default: false,
			description: 'Whether to store vectors in the instance database instead of memory',
		},
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
				'The key to use to store the vector memory in the workflow data. These keys are shared between workflows and stored in memory.',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { gte: 1.2 } }],
					enablePersistence: [false],
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
		{
			displayName: 'Memory Key',
			name: 'memoryKey',
			type: 'resourceLocator',
			required: true,
			default: { mode: 'list', value: DEFAULT_MEMORY_KEY },
			description:
				'The key to use to store the vector memory in the workflow data. These keys are scoped to your workflows and persisted in the database.',
			displayOptions: {
				show: {
					'@version': [{ _cnd: { gte: 1.2 } }],
					enablePersistence: [true],
				},
			},
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'persistedVectorStoresSearch',
						searchable: true,
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
		warningBanner,
		persistenceBanner,
	],
	methods: {
		listSearch: {
			async vectorStoresSearch(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// Query in-memory vector stores
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
			async persistedVectorStoresSearch(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				// Access vector store service from helpers (similar to DataTable pattern)
				const service = this.helpers.getVectorStoreService?.();

				if (!service) {
					// Service not available (module might be disabled)
					return { results: [] };
				}

				const workflowId = this.getWorkflow().id;

				if (!workflowId) {
					return { results: [] };
				}

				// Query the database for persisted vector store keys
				const memoryKeys = await service.listStores(workflowId, filter);

				return {
					results: memoryKeys.map((key: string) => ({ name: key, value: key })),
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
		},
		warningBanner,
		persistenceBanner,
	],
	retrieveFields: [],
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const memoryKey = getMemoryKey(context, itemIndex);
		const enablePersistence = context.getNodeParameter(
			'enablePersistence',
			itemIndex,
			false,
		) as boolean;

		if (enablePersistence) {
			// Use database-backed vector store
			const service = context.helpers.getVectorStoreService?.();

			if (!service) {
				throw new ApplicationError(
					'Vector store persistence is not available. The vector-store module may not be loaded.',
				);
			}

			const workflowId = context.getWorkflow().id;
			if (!workflowId) {
				throw new ApplicationError(
					'Workflow ID is required for vector store persistence. This execution may not be associated with a workflow.',
				);
			}

			return new DatabaseVectorStore(embeddings, service, memoryKey, workflowId);
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

			const workflowId = context.getWorkflow().id;
			if (!workflowId) {
				throw new ApplicationError(
					'Workflow ID is required for vector store persistence. This execution may not be associated with a workflow.',
				);
			}

			const vectorStore = new DatabaseVectorStore(
				embeddings,
				vectorStoreService,
				memoryKey,
				workflowId,
			);

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
