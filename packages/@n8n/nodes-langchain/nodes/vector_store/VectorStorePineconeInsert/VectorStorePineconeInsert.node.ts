import { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { Document } from 'langchain/document';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { PineconeClient } from '@pinecone-database/pinecone'
import { Embeddings } from 'langchain/embeddings/base';
import { logWrapper } from '../../../utils/logWrapper';

export class VectorStorePineconeInsert implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Pinecone: Insert',
		name: 'vectorStorePineconeInsert',
		icon: 'file:pinecone.png',
		group: ['transform'],
		version: 1,
		description: 'Insert data into Pinecone Vector Store index',
		defaults: {
			name: 'LangChain - Pinecone: Insert',
		},
		credentials: [
			{
				name: 'pineconeApi',
				required: true,
			},
		],
		inputs: ['document', 'embedding'],
		inputNames: ['Document', 'Embedding'],
		outputs: ['vectorStore'],
		outputNames: ['Vector Store'],
		properties: [
			{
				displayName: 'Pinecone Index',
				name: 'pineconeIndex',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Pinecone Namespace',
				name: 'pineconeNamespace',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Clear Index',
				name: 'clearIndex',
				type: 'boolean',
				default: false,
				description: 'Clear the index before inserting new data',
			}
		],
	};

	async supplyData(this: IExecuteFunctions):  Promise<SupplyData> {
		this.logger.verbose('Supplying data for Pinecone Insert Vector Store');
		const namespace = this.getNodeParameter('pineconeNamespace', 0) as string;
		const clearIndex = this.getNodeParameter('clearIndex', 0) as boolean;
		const index = this.getNodeParameter('pineconeIndex', 0) as string;

		const documentsNodes = await this.getInputConnectionData('document', 0) || [];
		const documents = documentsNodes.flatMap((node) => node.response as Document);
		const credentials = await this.getCredentials('pineconeApi');

		const embeddingNodes = await this.getInputConnectionData('embedding', 0);
		if (embeddingNodes.length > 1) {
			throw new NodeOperationError(this.getNode(), 'Only one Embedding node is allowed to be connected!');
		}
		const embeddings = (embeddingNodes || [])[0]?.response as Embeddings;

		const client = new PineconeClient()
		await client.init({
				apiKey: credentials.apiKey as string,
				environment: credentials.environment as string,
		})

		try {
			const pineconeIndex = client.Index(index);

			if (namespace && clearIndex) {
				await pineconeIndex.delete1({ deleteAll: true, namespace: namespace });
			}

			const vectorStore = await PineconeStore.fromDocuments(documents, embeddings, {
				namespace: namespace || undefined,
				pineconeIndex,
			})

			return {
				response: logWrapper(vectorStore, this)
			}
		} catch (error) {
			throw new NodeApiError(this.getNode(), error, {
				message: 'Failed to insert embeddings into Pinecone index',
			});
		}
	}
}
