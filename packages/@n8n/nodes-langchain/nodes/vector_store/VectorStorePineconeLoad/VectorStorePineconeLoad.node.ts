import { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { PineconeClient } from '@pinecone-database/pinecone'
import { Embeddings } from 'langchain/embeddings/base';
import { logWrapper } from '../../../utils/logWrapper';
import { getAndValidateSupplyInput } from '../../../utils/getAndValidateSupplyInput';

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
		const embeddings = await getAndValidateSupplyInput(this, 'embedding', true) as Embeddings;

		const client = new PineconeClient()
		await client.init({
				apiKey: credentials.apiKey as string,
				environment: credentials.environment as string,
		})

		const pineconeIndex = client.Index(index);
		const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
			namespace: namespace || undefined,
			pineconeIndex,
		})

		return {
			response: logWrapper(vectorStore, this)
		}
	}
}
