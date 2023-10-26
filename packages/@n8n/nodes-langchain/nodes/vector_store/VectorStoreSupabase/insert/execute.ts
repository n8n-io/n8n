import { createClient } from '@supabase/supabase-js';
import type { Embeddings } from 'langchain/embeddings/base';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { NodeConnectionType, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import type { Document } from 'langchain/document';
import type { N8nJsonLoader } from '../../../../utils/N8nJsonLoader';
import { processDocuments } from '../../shared/processDocuments';
import type { N8nBinaryLoader } from '../../../../utils/N8nBinaryLoader';

export async function insertExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const tableName = this.getNodeParameter('tableName', 0) as string;
	const queryName = this.getNodeParameter('queryName', 0) as string;
	const credentials = await this.getCredentials('supabaseApi');

	const documentInput = (await this.getInputConnectionData(NodeConnectionType.AiDocument, 0)) as
		| N8nJsonLoader
		| N8nBinaryLoader
		| Array<Document<Record<string, unknown>>>;

	const embeddings = (await this.getInputConnectionData(
		NodeConnectionType.AiEmbedding,
		0,
	)) as Embeddings;
	const client = createClient(credentials.host as string, credentials.serviceRole as string);
	const items = this.getInputData(0);

	const { processedDocuments, serializedDocuments } = await processDocuments(documentInput, items);

	await SupabaseVectorStore.fromDocuments(processedDocuments, embeddings, {
		client,
		tableName,
		queryName,
	});

	return this.prepareOutputData(serializedDocuments);
}
