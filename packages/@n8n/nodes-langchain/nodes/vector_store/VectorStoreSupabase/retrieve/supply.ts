import { createClient } from '@supabase/supabase-js';
import type { Embeddings } from 'langchain/embeddings/base';
import type { SupabaseLibArgs } from 'langchain/vectorstores/supabase';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { NodeConnectionType, type IExecuteFunctions, type SupplyData } from 'n8n-workflow';
import { getMetadataFiltersValues } from '../../../../utils/helpers';
import { logWrapper } from '../../../../utils/logWrapper';

export async function retrieveSupplyData(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<SupplyData> {
	const tableName = this.getNodeParameter('tableName', itemIndex) as string;
	const queryName = this.getNodeParameter('queryName', itemIndex) as string;

	const credentials = await this.getCredentials('supabaseApi');
	const embeddings = (await this.getInputConnectionData(
		NodeConnectionType.AiEmbedding,
		0,
	)) as Embeddings;

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const client = createClient(credentials.host as string, credentials.serviceRole as string);
	const config: SupabaseLibArgs = {
		client,
		tableName,
		queryName,
		filter: getMetadataFiltersValues(this, itemIndex),
	};

	const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, config);

	return {
		response: logWrapper(vectorStore, this),
	};
}
