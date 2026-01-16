import type { Embeddings } from '@langchain/core/embeddings';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import type { IExecuteFunctions, INodeProperties, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import * as path from 'path';
import * as fs from 'fs/promises';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { metadataFilterField } from '@utils/sharedFields';

const sharedFields: INodeProperties[] = [
	{
		displayName: 'Directory Path',
		name: 'directoryPath',
		type: 'string',
		default: '',
		required: true,
		description: 'The directory path where the FAISS index will be stored',
		placeholder: '/path/to/faiss/storage',
	},
];

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Clear Store',
				name: 'clearStore',
				type: 'boolean',
				default: false,
				description: 'Whether to clear the existing store before inserting new data',
			},
		],
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [metadataFilterField],
	},
];

async function ensureDirectoryExists(directoryPath: string): Promise<void> {
	try {
		await fs.access(directoryPath);
	} catch {
		await fs.mkdir(directoryPath, { recursive: true });
	}
}

async function checkIfStoreExists(directoryPath: string): Promise<boolean> {
	try {
		const faissIndexPath = path.join(directoryPath, 'faiss.index');
		await fs.access(faissIndexPath);
		return true;
	} catch {
		return false;
	}
}

export class VectorStoreFaiss extends createVectorStoreNode<FaissStore>({
	meta: {
		displayName: 'FAISS Vector Store',
		name: 'vectorStoreFaiss',
		description: 'Work with your data using FAISS - a local, file-based vector store',
		icon: 'file:faiss.svg',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorefaiss/',
		categories: ['AI'],
		subcategories: {
			AI: ['Vector Stores', 'Tools', 'Root Nodes'],
			'Vector Stores': ['For Beginners'],
			Tools: ['Other Tools'],
		},
	},
	sharedFields,
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(
		context: IExecuteFunctions | ISupplyDataFunctions,
		filter,
		embeddings: Embeddings,
		itemIndex: number,
	) {
		const directoryPath = context.getNodeParameter('directoryPath', itemIndex, '', {
			extractValue: true,
		}) as string;

		if (!directoryPath) {
			throw new NodeOperationError(
				context.getNode(),
				'Directory path is required for FAISS vector store',
			);
		}

		await ensureDirectoryExists(directoryPath);

		const storeExists = await checkIfStoreExists(directoryPath);

		if (!storeExists) {
			throw new NodeOperationError(
				context.getNode(),
				`No FAISS index found at ${directoryPath}. Please insert documents first using the "Insert Documents" mode.`,
			);
		}

		const vectorStore = await FaissStore.load(directoryPath, embeddings);

		// Apply filter if provided
		if (filter && Object.keys(filter).length > 0) {
			// FAISS doesn't have built-in filtering, so we'd need to implement post-filtering
			// For now, we'll return the store as-is and filtering will happen in the retrieval
			context.logger.warn(
				'FAISS does not support native metadata filtering. Results will be filtered after retrieval.',
			);
		}

		return vectorStore;
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const directoryPath = context.getNodeParameter('directoryPath', itemIndex, '', {
			extractValue: true,
		}) as string;

		if (!directoryPath) {
			throw new NodeOperationError(
				context.getNode(),
				'Directory path is required for FAISS vector store',
			);
		}

		await ensureDirectoryExists(directoryPath);

		const clearStore = context.getNodeParameter('options.clearStore', itemIndex, false) as boolean;
		const storeExists = await checkIfStoreExists(directoryPath);

		let vectorStore: FaissStore;

		if (storeExists && !clearStore) {
			// Load existing store and add documents
			vectorStore = await FaissStore.load(directoryPath, embeddings);
			await vectorStore.addDocuments(documents);
		} else {
			// Create new store
			vectorStore = await FaissStore.fromDocuments(documents, embeddings);
		}

		// Save the store to disk
		await vectorStore.save(directoryPath);
	},
}) {}
