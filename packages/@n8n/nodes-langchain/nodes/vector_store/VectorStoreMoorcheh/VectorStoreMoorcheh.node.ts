import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import { VectorStore } from '@langchain/core/vectorstores';
import { NodeOperationError, type IDataObject, type INodeProperties } from 'n8n-workflow';

import { createMoorchehClient, type MoorchehCredential } from './Moorcheh.utils';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';
import { moorchehNamespacesSearch } from '../shared/createVectorStoreNode/methods/listSearch';
import { moorchehNamespaceRLC } from '../shared/descriptions';

// Custom VectorStore implementation for Moorcheh
class MoorchehVectorStore extends VectorStore {
	private client: any;
	private namespace: string;
	public embeddings: Embeddings;
	private uploadBatchSize: number;

	constructor(embeddings: Embeddings, client: any, namespace: string, uploadBatchSize = 500) {
		super(embeddings, {});
		this.client = client;
		this.namespace = namespace;
		this.embeddings = embeddings;
		this.uploadBatchSize = Math.max(1, Math.min(500, uploadBatchSize ?? 500));
	}

	_vectorstoreType(): string {
		return 'moorcheh';
	}

	async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
		if (vectors.length !== documents.length) {
			throw new Error(
				`Vectors and documents arrays must have the same length. Got ${vectors.length} vectors and ${documents.length} documents.`,
			);
		}

		const vectorsWithMetadata = vectors.map((vector, i) => ({
			id: `doc_${Date.now()}_${i}`,
			vector,
			metadata: {
				pageContent: documents[i].pageContent,
				...documents[i].metadata,
			},
		}));

		await this.client.uploadVectors(this.namespace, vectorsWithMetadata);
	}

	static async fromExistingNamespace(
		embeddings: Embeddings,
		client: any,
		namespace: string,
		uploadBatchSize = 500,
	): Promise<MoorchehVectorStore> {
		return new MoorchehVectorStore(embeddings, client, namespace, uploadBatchSize);
	}

	static async fromDocuments(
		documents: Document[],
		embeddings: Embeddings,
		dbConfig: { client: any; namespace: string; uploadBatchSize?: number },
	): Promise<MoorchehVectorStore> {
		const {
			client,
			namespace,
			uploadBatchSize,
		}: {
			client: any;
			namespace: string;
			uploadBatchSize?: number;
		} = dbConfig;
		const vectorStore = new MoorchehVectorStore(
			embeddings,
			client,
			namespace,
			uploadBatchSize ?? 500,
		);

		// Create namespace if it doesn't exist
		try {
			await client.createNamespace(namespace, 'vector', 1536); // Default dimension
		} catch (error) {
			// Namespace might already exist, continue
		}

		await vectorStore.addDocuments(documents);
		return vectorStore;
	}

	async addDocuments(documents: Document[], options?: { ids?: string[] }): Promise<void> {
		if (!documents.length) return;

		// Prefer batch embeddings for performance
		const contents = documents.map((d) => d.pageContent ?? '');
		let vectorsArray: number[][];
		if (typeof (this.embeddings as any).embedDocuments === 'function') {
			vectorsArray = await (this.embeddings as any).embedDocuments(contents);
		} else {
			// Fallback to per-document embedding
			vectorsArray = [];
			for (const content of contents) {
				vectorsArray.push(await this.embeddings.embedQuery(content));
			}
		}

		const toUpload = documents.map((doc, i) => {
			// Stable ID: prefer metadata.id, then provided ids[], else hash-like fallback
			const providedId = options?.ids?.[i];
			const metadataId = (doc.metadata as any)?.id as string | undefined;
			const fallbackId = `doc_${Date.now()}_${i}`;
			const id = providedId || metadataId || fallbackId;
			return {
				id,
				vector: vectorsArray[i],
				metadata: {
					pageContent: doc.pageContent,
					...doc.metadata,
				},
			};
		});

		// Chunk uploads to avoid payload limits (max 500 per request)
		const chunkSize = Math.max(1, Math.min(500, this.uploadBatchSize));
		for (let start = 0; start < toUpload.length; start += chunkSize) {
			const chunk = toUpload.slice(start, start + chunkSize);
			await this.client.uploadVectors(this.namespace, chunk);
		}
	}

	async similaritySearch(
		query: string,
		k: number = 4,
		_filter?: IDataObject,
		_callbacks?: Callbacks,
	): Promise<Document[]> {
		const queryVector = await this.embeddings.embedQuery(query);
		const results = await this.similaritySearchVectorWithScore(queryVector, k);
		return results.map(([doc]) => doc);
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number = 4,
		_filter?: IDataObject,
	): Promise<Array<[Document, number]>> {
		const results = await this.client.search(query, [this.namespace], k);

		return results.map((result: any) => {
			const metadata = result.metadata ?? {};
			const pageContent = typeof metadata.pageContent === 'string' ? metadata.pageContent : '';
			return [new Document({ pageContent, metadata }), result.score];
		});
	}

	async delete(ids: string[]): Promise<void> {
		await this.client.deleteVectors(this.namespace, ids);
	}
}

const sharedFields: INodeProperties[] = [moorchehNamespaceRLC];

const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Vector Dimension',
				name: 'vectorDimension',
				type: 'number',
				default: 1536,
				description: 'Dimension of vectors for this namespace',
			},
		],
	},
];

const retrieveFields: INodeProperties[] = [];

const updateFields: INodeProperties[] = [];

export class VectorStoreMoorcheh extends createVectorStoreNode({
	meta: {
		displayName: 'Moorcheh Vector Store',
		name: 'vectorStoreMoorcheh',
		description: 'Work with your data in Moorcheh vector store',
		icon: 'file:moorcheh.svg',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoremoorcheh/',
		credentials: [
			{
				name: 'moorchehApi',
				required: true,
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'retrieve-as-tool'],
	},
	methods: { listSearch: { moorchehNamespacesSearch } },
	sharedFields,
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	updateFields,
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const namespace = context.getNodeParameter('moorchehNamespace', itemIndex, '', {
			extractValue: true,
		}) as string;

		const credentials = await context.getCredentials('moorchehApi');
		const client = createMoorchehClient(credentials as MoorchehCredential);

		// Validate that provided namespace exists and is vector-type when possible
		try {
			const namespacesAny = (await client.listNamespaces()) as any[];
			const match = namespacesAny.find((ns: any) => {
				const name =
					ns?.name ||
					ns?.namespace_name ||
					ns?.namespace ||
					(ns?.id != null ? String(ns.id) : undefined);
				return String(name) === namespace;
			});
			if (!match) {
				throw new NodeOperationError(context.getNode(), `Namespace "${namespace}" not found`, {
					itemIndex,
					description:
						'Choose an existing vector namespace from the list or create one via Insert operation.',
				});
			}
			const type = (match?.type ?? '').toString().toLowerCase();
			const looksVector =
				type === 'vector' ||
				typeof match?.vector_dimension === 'number' ||
				typeof match?.dimension === 'number';
			if (type && type !== 'vector') {
				throw new NodeOperationError(
					context.getNode(),
					`Namespace "${namespace}" is not a vector namespace`,
					{
						itemIndex,
						description: 'Use a vector namespace or create one via Insert operation.',
					},
				);
			}
			if (!looksVector) {
				// If we can't infer vector-ness, proceed but it's likely fine for older APIs
			}
		} catch (err) {
			if (err instanceof NodeOperationError) throw err;
			// If validation fails due to API error, continue to avoid blocking
		}

		return await MoorchehVectorStore.fromExistingNamespace(embeddings, client, namespace);
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const namespaceName = context.getNodeParameter('moorchehNamespace', itemIndex, '', {
			extractValue: true,
		}) as string;

		const { vectorDimension } = context.getNodeParameter('options', itemIndex, {}) as {
			vectorDimension?: number;
		};

		const credentials = await context.getCredentials('moorchehApi');
		const client = createMoorchehClient(credentials as MoorchehCredential);

		// Create namespace if it doesn't exist
		try {
			await client.createNamespace(namespaceName, 'vector', vectorDimension || 1536);
		} catch (error) {
			// Namespace might already exist, continue
		}

		await MoorchehVectorStore.fromDocuments(documents, embeddings, {
			client,
			namespace: namespaceName,
		});
	},
	// Optional: cleanup function for resource management
	releaseVectorStoreClient(_vectorStore) {
		// Moorcheh client doesn't need explicit cleanup, but we can add it if needed
		// For example, if the client has a close() method:
		// vectorStore.client?.close();
	},
}) {}
