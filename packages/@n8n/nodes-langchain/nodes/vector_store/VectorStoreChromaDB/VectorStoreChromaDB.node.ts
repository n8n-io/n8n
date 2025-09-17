import { Chroma as ChromaVectorStore } from '@langchain/community/vectorstores/chroma';
import { NodeOperationError, type INodeProperties } from 'n8n-workflow';
import { ChromaClient, type Collection } from 'chromadb';
import { metadataFilterField } from '@utils/sharedFields';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { chromaCollectionRLC } from '../shared/descriptions';

const sharedFields: INodeProperties[] = [chromaCollectionRLC];

// Helper to parse a Chroma URL into ChromaClient constructor params
interface ChromaClientConnectionParams {
	host: string;
	port: number;
	ssl: boolean;
}

function parseChromaUrl(rawUrl?: string): {
	url: string;
	clientParams: ChromaClientConnectionParams;
} {
	const fallback = 'http://localhost:8000';
	let finalUrl = (rawUrl || fallback).trim();
	if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `http://${finalUrl}`; // ensure protocol for URL parser
	try {
		const u = new URL(finalUrl);
		const protocol = u.protocol.replace(':', '');
		const ssl = protocol === 'https';
		// ChromaClient (>=0.5) accepts { host, port, ssl } separately; keep full url for langchain store config
		const host = u.hostname;
		const port = u.port ? Number(u.port) : ssl ? 443 : 80;
		return { url: `${protocol}://${host}:${port}`, clientParams: { host, port, ssl } };
	} catch (e) {
		// Fallback to defaults if parsing fails
		return { url: fallback, clientParams: { host: 'localhost', port: 8000, ssl: false } };
	}
}

const chromaURLField: INodeProperties = {
	displayName: 'Chroma URL',
	name: 'chromaURL',
	type: 'string',
	default: 'http://localhost:8000',
	description: 'URL of the Chroma server',
};

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [chromaURLField, metadataFilterField],
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
				displayName: 'Clear Collection',
				name: 'clearCollection',
				type: 'boolean',
				default: false,
				description: 'Whether to clear the collection before inserting new data',
			},
			chromaURLField,
		],
	},
];

export class VectorStoreChromaDB extends createVectorStoreNode<ChromaVectorStore>({
	meta: {
		displayName: 'Chroma Vector Store',
		name: 'vectorStoreChromaDB',
		description: 'Work with your data in Chroma Vector Store',
		icon: { light: 'file:chroma.svg', dark: 'file:chroma.svg' },
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorechromadb/',
		credentials: [],
		operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'],
	},
	methods: {
		listSearch: {
			chromaCollectionsSearch: async function () {
				let chromaURL = '';
				try {
					chromaURL = (this.getNodeParameter('options.chromaURL', 0) as string) || '';
				} catch (_) {}
				const { clientParams } = parseChromaUrl(chromaURL);
				const client = new ChromaClient(clientParams);
				try {
					const collections = await client.listCollections();
					const results = collections.map((collection: Collection) => ({
						name: collection.name,
						value: collection.name,
					}));
					return { results };
				} catch (error) {
					return { results: [] };
				}
			},
		},
	},
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	sharedFields,

	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const collection = context.getNodeParameter('chromaCollection', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as { chromaURL?: string };
		const { url, clientParams } = parseChromaUrl(options.chromaURL);

		const client = new ChromaClient(clientParams);
		try {
			const collections = await client.listCollections();
			const collectionExists = collections.some((c: Collection) => c.name === collection);
			if (!collectionExists) {
				throw new NodeOperationError(context.getNode(), `Collection ${collection} not found`, {
					itemIndex,
					description: 'Please check that the collection exists in your vector store',
				});
			}
			const config = { collectionName: collection, url, filter };
			return await ChromaVectorStore.fromExistingCollection(embeddings, config);
		} catch (error: any) {
			throw new NodeOperationError(
				context.getNode(),
				`Error connecting to ChromaDB: ${error?.message || 'Unknown error'}`,
				{ itemIndex },
			);
		}
	},

	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const collection = context.getNodeParameter('chromaCollection', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			chromaURL?: string;
			clearCollection?: boolean;
		};
		const { url, clientParams } = parseChromaUrl(options.chromaURL);
		const client = new ChromaClient(clientParams);

		if (options.clearCollection) {
			try {
				await client.deleteCollection({ name: collection });
				context.logger.info(`Collection ${collection} deleted`);
			} catch (error) {
				context.logger.info(
					`Collection ${collection} does not exist yet or could not be deleted (continuing)`,
				);
			}
		}
		await ChromaVectorStore.fromDocuments(documents, embeddings, {
			collectionName: collection,
			url,
		});
	},
}) {}
