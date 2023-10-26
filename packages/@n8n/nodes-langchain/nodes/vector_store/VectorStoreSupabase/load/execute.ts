import { createClient } from '@supabase/supabase-js';
import type { Embeddings } from 'langchain/embeddings/base';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { NodeConnectionType, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import { getMetadataFiltersValues } from '../../../../utils/helpers';

export async function loadExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const tableName = this.getNodeParameter('tableName', 0) as string;
	const queryName = this.getNodeParameter('queryName', 0) as string;
	const credentials = await this.getCredentials('supabaseApi');

	const embeddings = (await this.getInputConnectionData(
		NodeConnectionType.AiEmbedding,
		0,
	)) as Embeddings;

	const client = createClient(credentials.host as string, credentials.serviceRole as string);
	const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
		client,
		tableName,
		queryName,
	});

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
