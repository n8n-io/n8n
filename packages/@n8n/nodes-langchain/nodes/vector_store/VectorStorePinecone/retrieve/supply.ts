import type { Embeddings } from 'langchain/embeddings/base';
import { NodeConnectionType, type IExecuteFunctions, type SupplyData } from 'n8n-workflow';
import { PineconeClient } from '@pinecone-database/pinecone';
import type { PineconeLibArgs } from 'langchain/vectorstores/pinecone';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { getMetadataFiltersValues } from '../../../../utils/helpers';
import { logWrapper } from '../../../../utils/logWrapper';

export async function retrieveSupplyData(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<SupplyData> {
	const namespace = this.getNodeParameter('pineconeNamespace', itemIndex) as string;
	const index = this.getNodeParameter('pineconeIndex', itemIndex) as string;

	const credentials = await this.getCredentials('pineconeApi');
	const embeddings = (await this.getInputConnectionData(
		NodeConnectionType.AiEmbedding,
		itemIndex,
	)) as Embeddings;

	const client = new PineconeClient();
	await client.init({
		apiKey: credentials.apiKey as string,
		environment: credentials.environment as string,
	});

	const pineconeIndex = client.Index(index);
	const config: PineconeLibArgs = {
		namespace: namespace || undefined,
		pineconeIndex,
		filter: getMetadataFiltersValues(this, itemIndex),
	};

	const vectorStore = await PineconeStore.fromExistingIndex(embeddings, config);

	return {
		response: logWrapper(vectorStore, this),
	};
}
