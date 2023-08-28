import { IExecuteFunctions, INodeType, INodeTypeDescription, INodeExecutionData } from 'n8n-workflow';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { PineconeClient } from '@pinecone-database/pinecone'
import { Embeddings } from 'langchain/embeddings/base';
import { N8nJsonLoader } from '../../document_loaders/DocumentJSONInputLoader/DocumentJSONInputLoader.node';
import { getAndValidateSupplyInput } from '../../../utils/getAndValidateSupplyInput';
import { Document } from 'langchain/document';
import { N8nBinaryLoader } from '../../document_loaders/DocumentBinaryInputLoader/DocumentBinaryInputLoader.node';

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
		inputs: ['main', 'document', 'embedding'],
		inputNames: ['', 'Document', 'Embedding'],
		outputs: ['main'],
		outputNames: [''],
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData(0);
		this.logger.verbose('Executing data for Pinecone Insert Vector Store');

		const namespace = this.getNodeParameter('pineconeNamespace', 0) as string;
		const index = this.getNodeParameter('pineconeIndex', 0) as string;
		const clearIndex = this.getNodeParameter('clearIndex', 0) as boolean;


		const credentials = await this.getCredentials('pineconeApi');

		const documentInput = await getAndValidateSupplyInput(this, 'document', true) as N8nJsonLoader | Document<Record<string, any>>[];
		const embeddings = await getAndValidateSupplyInput(this, 'embedding', true) as Embeddings;

		const client = new PineconeClient()
		await client.init({
				apiKey: credentials.apiKey as string,
				environment: credentials.environment as string,
		})

		const pineconeIndex = client.Index(index);

		if (namespace && clearIndex) {
			await pineconeIndex.delete1({ deleteAll: true, namespace: namespace });
		}

		let processedDocuments: Document[];

		if (documentInput instanceof N8nJsonLoader  || documentInput instanceof N8nBinaryLoader) {
			processedDocuments = await documentInput.process(items);
		} else {
			processedDocuments = documentInput;
		}

		await PineconeStore.fromDocuments(processedDocuments, embeddings, {
			namespace: namespace || undefined,
			pineconeIndex,
		})

		const serializedDocuments = processedDocuments
			.map(({ metadata, pageContent }) => ({ json: { metadata, pageContent } }));

		return this.prepareOutputData(serializedDocuments);
	}
}
