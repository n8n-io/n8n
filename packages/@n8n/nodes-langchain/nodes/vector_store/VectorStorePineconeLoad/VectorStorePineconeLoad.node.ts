import { IExecuteFunctions, INodeType, INodeTypeDescription, NodeOperationError, SupplyData } from 'n8n-workflow';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { PineconeClient } from '@pinecone-database/pinecone'
import { Embeddings } from 'langchain/embeddings/base';
import { logWrapper } from '../../../utils/logWrapper';

export class VectorStorePineconeLoad implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Pinecone: Load',
		name: 'vectorStorePineconeLoad',
		icon: 'file:pinecone.png',
		group: ['transform'],
		version: 1,
		description: 'Load data from Pinecone Vector Store index',
		defaults: {
			name: 'LangChain - Pinecone: Load'
		},
		credentials: [
			{
				name: 'pineconeApi',
				required: true,
			},
		],
		inputs: ['embedding'],
		inputNames: ['Embedding'],
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
		],
	};

	async supplyData(this: IExecuteFunctions):  Promise<SupplyData> {
		this.logger.verbose('Supplying data for Pinecone Load Vector Store');
		const namespace = this.getNodeParameter('pineconeNamespace', 0) as string;
		const index = this.getNodeParameter('pineconeIndex', 0) as string;

		const credentials = await this.getCredentials('pineconeApi');

		const embeddingNodes = await this.getInputConnectionData('embedding', 0);
		if (embeddingNodes.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'At least one Embedding model has to be connected!',
			);
		} else if (embeddingNodes.length > 1) {
			throw new NodeOperationError(this.getNode(), 'Only one Embedding model is allowed to be connected!');
		}


		const embeddings = (embeddingNodes || [])[0]?.response as Embeddings;

		const client = new PineconeClient()
		await client.init({
				apiKey: credentials.apiKey as string,
				environment: credentials.environment as string,
		})

		try {
			const pineconeIndex = client.Index(index);

			const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
				namespace: namespace || undefined,
				pineconeIndex,
			})


			return {
				response: logWrapper(vectorStore, this)
			}
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				'Failed to load vector store from Pinecone index',
			);
		}
	}
}
