import {
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type INodeExecutionData,
	NodeConnectionType,
} from 'n8n-workflow';
import type { Embeddings } from 'langchain/embeddings/base';
import type { Document } from 'langchain/document';
import { createClient } from '@supabase/supabase-js';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';

import type { N8nJsonLoader } from '../../../utils/N8nJsonLoader';
import { processDocuments } from '../shared/processDocuments';
import { supabaseTableNameRLC } from '../shared/descriptions';
import { supabaseTableNameSearch } from '../shared/methods/listSearch';

// This node is deprecated. Use VectorStoreSupabase instead.
export class VectorStoreSupabaseInsert implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Supabase: Insert',
		// Vector Store nodes got merged into a single node
		hidden: true,
		name: 'vectorStoreSupabaseInsert',
		icon: 'file:supabase.svg',
		group: ['transform'],
		version: 1,
		description:
			'Insert data into Supabase Vector Store index [https://supabase.com/docs/guides/ai/langchain]',
		defaults: {
			name: 'Supabase: Insert',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Vector Stores'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoresupabase/',
					},
				],
			},
		},
		credentials: [
			{
				name: 'supabaseApi',
				required: true,
			},
		],
		inputs: [
			NodeConnectionType.Main,
			{
				displayName: 'Document',
				maxConnections: 1,
				type: NodeConnectionType.AiDocument,
				required: true,
			},
			{
				displayName: 'Embedding',
				maxConnections: 1,
				type: NodeConnectionType.AiEmbedding,
				required: true,
			},
		],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName:
					'Please refer to the <a href="https://supabase.com/docs/guides/ai/langchain" target="_blank">Supabase documentation</a> for more information on how to setup your database as a Vector Store.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			supabaseTableNameRLC,
			{
				displayName: 'Query Name',
				name: 'queryName',
				type: 'string',
				default: 'match_documents',
				required: true,
				description: 'Name of the query to use for matching documents',
			},
			{
				displayName: 'Specify the document to load in the document loader sub-node',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	methods = { listSearch: { supabaseTableNameSearch } };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing data for Supabase Insert Vector Store');

		const items = this.getInputData(0);
		const tableName = this.getNodeParameter('tableName', 0, '', { extractValue: true }) as string;
		const queryName = this.getNodeParameter('queryName', 0) as string;
		const credentials = await this.getCredentials('supabaseApi');

		const documentInput = (await this.getInputConnectionData(NodeConnectionType.AiDocument, 0)) as
			| N8nJsonLoader
			| Array<Document<Record<string, unknown>>>;

		const embeddings = (await this.getInputConnectionData(
			NodeConnectionType.AiEmbedding,
			0,
		)) as Embeddings;
		const client = createClient(credentials.host as string, credentials.serviceRole as string);

		const { processedDocuments, serializedDocuments } = await processDocuments(
			documentInput,
			items,
		);

		await SupabaseVectorStore.fromDocuments(processedDocuments, embeddings, {
			client,
			tableName,
			queryName,
		});

		return await this.prepareOutputData(serializedDocuments);
	}
}
