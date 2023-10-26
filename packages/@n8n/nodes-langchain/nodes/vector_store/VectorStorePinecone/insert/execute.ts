import type { Embeddings } from 'langchain/embeddings/base';
import { NodeConnectionType, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import type { Document } from 'langchain/document';
import { PineconeClient } from '@pinecone-database/pinecone';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import type { N8nJsonLoader } from '../../../../utils/N8nJsonLoader';
import { processDocuments } from '../../shared/processDocuments';
import type { N8nBinaryLoader } from '../../../../utils/N8nBinaryLoader';

export async function insertExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const namespace = this.getNodeParameter('pineconeNamespace', 0) as string;
	const index = this.getNodeParameter('pineconeIndex', 0) as string;
	const clearNamespace = this.getNodeParameter('clearNamespace', 0) as boolean;

	const credentials = await this.getCredentials('pineconeApi');

	const documentInput = (await this.getInputConnectionData(NodeConnectionType.AiDocument, 0)) as
		| N8nJsonLoader
		| N8nBinaryLoader
		| Array<Document<Record<string, unknown>>>;

	const embeddings = (await this.getInputConnectionData(
		NodeConnectionType.AiEmbedding,
		0,
	)) as Embeddings;

	const client = new PineconeClient();
	await client.init({
		apiKey: credentials.apiKey as string,
		environment: credentials.environment as string,
	});

	const pineconeIndex = client.Index(index);

	if (namespace && clearNamespace) {
		await pineconeIndex.delete1({ deleteAll: true, namespace });
	}

	const items = this.getInputData(0);
	const { processedDocuments, serializedDocuments } = await processDocuments(documentInput, items);

	await PineconeStore.fromDocuments(processedDocuments, embeddings, {
		namespace: namespace || undefined,
		pineconeIndex,
	});

	return this.prepareOutputData(serializedDocuments);
}
