import type { Embeddings } from 'langchain/embeddings/base';
import { NodeConnectionType, type IExecuteFunctions, type SupplyData } from 'n8n-workflow';
import type { IZepConfig } from 'langchain/vectorstores/zep';
import { ZepVectorStore } from 'langchain/vectorstores/zep';
import { getMetadataFiltersValues } from '../../../../utils/helpers';
import { logWrapper } from '../../../../utils/logWrapper';

export async function retrieveSupplyData(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<SupplyData> {
	const collectionName = this.getNodeParameter('collectionName', itemIndex) as string;

	const options =
		(this.getNodeParameter('options', itemIndex) as {
			embeddingDimensions?: number;
		}) || {};

	const credentials = (await this.getCredentials('zepApi')) as {
		apiKey?: string;
		apiUrl: string;
	};
	const embeddings = (await this.getInputConnectionData(
		NodeConnectionType.AiEmbedding,
		0,
	)) as Embeddings;

	const zepConfig: IZepConfig = {
		apiUrl: credentials.apiUrl,
		apiKey: credentials.apiKey,
		collectionName,
		embeddingDimensions: options.embeddingDimensions ?? 1536,
		metadata: getMetadataFiltersValues(this, itemIndex),
	};

	const vectorStore = new ZepVectorStore(embeddings, zepConfig);

	return {
		response: logWrapper(vectorStore, this),
	};
}
