import type { Embeddings } from 'langchain/embeddings/base';
import { NodeConnectionType, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import { PineconeClient } from '@pinecone-database/pinecone';
import type { PineconeLibArgs } from 'langchain/vectorstores/pinecone';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { getMetadataFiltersValues } from '../../../../utils/helpers';

export async function loadExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const namespace = this.getNodeParameter('pineconeNamespace', 0) as string;
	const index = this.getNodeParameter('pineconeIndex', 0) as string;

	const credentials = await this.getCredentials('pineconeApi');
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
	const config: PineconeLibArgs = {
		namespace: namespace || undefined,
		pineconeIndex,
	};

	const vectorStore = await PineconeStore.fromExistingIndex(embeddings, config);

	const resultData = [];
	const items = this.getInputData(0);
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		const query = this.getNodeParameter('query', itemIndex) as string;
		const topK = this.getNodeParameter('topK', itemIndex, 4) as number;
		const filter = getMetadataFiltersValues(this, itemIndex);

		const embeddedQuery = await embeddings.embedQuery(query);
		const docs = await vectorStore.similaritySearchVectorWithScore(embeddedQuery, topK, filter);

		const serializedDocs = docs.map(([doc, score]) => {
			const document = {
				metadata: doc.metadata,
				pageContent: doc.pageContent,
			};

			return { json: { document, score } };
		});
		resultData.push(...serializedDocs);
	}

	return this.prepareOutputData(resultData);
}
