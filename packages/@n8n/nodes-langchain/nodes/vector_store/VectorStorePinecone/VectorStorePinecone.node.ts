import { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { Document } from 'langchain/document';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { PineconeClient } from '@pinecone-database/pinecone'
import { Embeddings } from 'langchain/embeddings/base';
import { logWrapper } from '../../../utils/logWrapper';
import { VectorStoreRetriever } from 'langchain/vectorstores/base';
import { flatten } from 'lodash';

export class VectorStorePinecone implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Pinecore Vector Store',
		name: 'vectorStorePinecone',
		icon: 'file:pinecone.png',
		group: ['transform'],
		version: 1,
		description: 'Interact with Pinecone Vector Store',
		defaults: {
			name: 'LangChain - Pinecore Vector Store',
			color: '#1A82e2',
		},
		credentials: [
			{
				name: 'pineconeApi',
				required: true,
			},
		],
		inputs: ['document', 'embedding'],
		inputNames: ['Document', 'Embedding'],
		outputs: ['vectorRetriever', 'vectorStore'],
		outputNames: ['Vector Retriever', 'Vector Store'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Load Existing Index',
						value: 'load',
						description: 'Load embeddings from an existing index',
					},
					{
						name: 'Insert into Index',
						value: 'insert',
						description: 'Insert embeddings into an existing index',
					},
				],
				default: 'load',
			},
			{
				displayName: 'Output Type',
				name: 'outputType',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Retriever',
						value: 'retriever',
						description: 'Output as retriever',
					},
					{
						name: 'Vector Store',
						value: 'vectorStore',
						description: 'Output as vector store',
					},
				],
				default: 'Retriever',
			},
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
				displayName: 'Top K',
				name: 'topK',
				type: 'number',
				default: 4,
				description: 'Number of top results to fetch. Default to 4',
			},
		],
	};

	async supplyData(this: IExecuteFunctions):  Promise<SupplyData> {
		let response: VectorStoreRetriever | PineconeStore;
		let vectorStore: PineconeStore;

		const namespace = this.getNodeParameter('pineconeNamespace', 0) as string;
		const index = this.getNodeParameter('pineconeIndex', 0) as string;
		const mode = this.getNodeParameter('mode', 0) as 'load' | 'insert';
		const topK = this.getNodeParameter('topK', 0) as number;
		const outputType = this.getNodeParameter('outputType', 0) as 'retriever' | 'vectorStore';

		const documentsNodes = await this.getInputConnectionData('document', 0) || [];
		const documents = documentsNodes.flatMap((node) => node.response as Document);
		const embeddingNodes = await this.getInputConnectionData('embedding', 0);
		const embeddings = (embeddingNodes || [])[0]?.response as Embeddings;
		const credentials = await this.getCredentials('pineconeApi');

		const client = new PineconeClient()
		await client.init({
				apiKey: credentials.apiKey as string,
				environment: credentials.environment as string,
		})

		const pineconeIndex = client.Index(index);
		console.log('Initiated Pinecone Client', pineconeIndex)
		if (mode === 'insert') {
			const flattenedDocs = flatten(documents)
			console.log("🚀 ~ file: VectorStorePinecone.node.ts:120 ~ VectorStorePinecone ~ supplyData ~ flattenedDocs:", flattenedDocs)

			vectorStore = await PineconeStore.fromDocuments(documents, embeddings, {
				namespace: namespace || undefined,
				pineconeIndex: pineconeIndex
			})
		} else {
			console.log('Before fromExistingIndex', 'namespace', namespace, 'embeddings', embeddings)
			vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
				namespace: namespace || undefined,
				pineconeIndex: pineconeIndex,
			})
			// console.log('After constructing vectorStore', vectorStore)
		}

		if (outputType === 'retriever') {
			response = vectorStore.asRetriever(topK);
		} else {
			response = vectorStore;
			// response.k = topK;
		}

		return {
			response: logWrapper(response, this)
		}
	}

	// async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	// 	// @ts-ignore
	// 	let response: VectorStoreRetriever | PineconeStore;
	// 	let vectorStore: PineconeStore;

	// 	const namespace = this.getNodeParameter('pineconeNamespace', 0) as string;
	// 	const index = this.getNodeParameter('pineconeIndex', 0) as string;
	// 	const mode = this.getNodeParameter('mode', 0) as 'load' | 'insert';
	// 	const topK = this.getNodeParameter('topK', 0) as number;
	// 	const outputType = this.getNodeParameter('outputType', 0) as 'retriever' | 'vectorStore';

	// 	const documentsNodes = await this.getInputConnectionData('document', 0) || [];
	// 	const documents = documentsNodes.flatMap((node) => node.response as Document);
	// 	const embeddingNodes = await this.getInputConnectionData('embedding', 0);
	// 	const embeddings = (embeddingNodes || [])[0]?.response as Embeddings;
	// 	const credentials = await this.getCredentials('pineconeApi');

	// 	const client = new PineconeClient()
	// 	await client.init({
	// 			apiKey: credentials.apiKey as string,
	// 			environment: credentials.environment as string,
	// 	})

	// 	const pineconeIndex = client.Index(index);
	// 	console.log('Initiated Pinecone Client', pineconeIndex)
	// 	if (mode === 'insert') {
	// 		const flattenedDocs = flatten(documents)
	// 		console.log("🚀 ~ file: VectorStorePinecone.node.ts:172 ~ VectorStorePinecone ~ execute ~ flattenedDocs:", flattenedDocs)

	// 		vectorStore = await PineconeStore.fromDocuments(documents, embeddings, {
	// 			namespace: namespace || undefined,
	// 			pineconeIndex: pineconeIndex
	// 		})
	// 	} else {
	// 		console.log('Before fromExistingIndex', 'namespace', namespace, 'embeddings', embeddings)
	// 		vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
	// 			namespace: namespace || undefined,
	// 			pineconeIndex: pineconeIndex,
	// 		})
	// 		// console.log('After constructing vectorStore', vectorStore)
	// 	}

	// 	if (outputType === 'retriever') {
	// 		response = vectorStore.asRetriever(topK);
	// 	} else {
	// 		response = vectorStore;
	// 	}

	// 	const items = this.getInputData(0);
	// 	// Only pass it through?
	// 	return this.prepareOutputData(items);
	// }
}
