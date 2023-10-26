import type { Embeddings } from 'langchain/embeddings/base';
import { NodeConnectionType, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import type { Document } from 'langchain/document';
import { ZepVectorStore } from 'langchain/vectorstores/zep';
import type { N8nJsonLoader } from '../../../../utils/N8nJsonLoader';
import { processDocuments } from '../../shared/processDocuments';

export async function insertExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData(0);
	const collectionName = this.getNodeParameter('collectionName', 0) as string;
	const options =
		(this.getNodeParameter('options', 0) as {
			isAutoEmbedded?: boolean;
			embeddingDimensions?: number;
		}) || {};

	const credentials = (await this.getCredentials('zepApi')) as {
		apiKey?: string;
		apiUrl: string;
	};

	const documentInput = (await this.getInputConnectionData(NodeConnectionType.AiDocument, 0)) as
		| N8nJsonLoader
		| Array<Document<Record<string, unknown>>>;

	const embeddings = (await this.getInputConnectionData(
		NodeConnectionType.AiEmbedding,
		0,
	)) as Embeddings;

	const { processedDocuments, serializedDocuments } = await processDocuments(documentInput, items);

	const zepConfig = {
		apiUrl: credentials.apiUrl,
		apiKey: credentials.apiKey,
		collectionName,
		embeddingDimensions: options.embeddingDimensions ?? 1536,
		isAutoEmbedded: options.isAutoEmbedded ?? true,
	};

	await ZepVectorStore.fromDocuments(processedDocuments, embeddings, zepConfig);

	return this.prepareOutputData(serializedDocuments);
}
