import type { INodeProperties } from 'n8n-workflow';
import { createClient } from '@supabase/supabase-js';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { createVectorStoreNode } from '../shared/createVectorStoreNode';
import { metadataFilterField } from '../../../utils/sharedFields';

const sharedFields: INodeProperties[] = [
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the table to load from',
	},
	{
		displayName: 'Query Name',
		name: 'queryName',
		type: 'string',
		default: 'match_documents',
		required: true,
		description: 'Name of the query to use for matching documents',
	},
];
const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [metadataFilterField],
	},
];
export const VectorStoreSupabase = createVectorStoreNode({
	meta: {
		description: 'Work with your data in Supabase Vector Store',
		icon: 'file:supabase.svg',
		displayName: 'Supabase Vector Store',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.vectorstoresupabaseload/',
		name: 'vectorStoreSupabase',
		credentials: [
			{
				name: 'supabaseApi',
				required: true,
			},
		],
	},
	sharedFields,
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex) as string;
		const queryName = context.getNodeParameter('queryName', itemIndex) as string;
		const credentials = await context.getCredentials('supabaseApi');
		const client = createClient(credentials.host as string, credentials.serviceRole as string);

		return SupabaseVectorStore.fromExistingIndex(embeddings, {
			client,
			tableName,
			queryName,
			filter,
		});
	},
	async populateVectorStore(context, embeddings, documents) {
		const tableName = context.getNodeParameter('tableName', 0) as string;
		const queryName = context.getNodeParameter('queryName', 0) as string;
		const credentials = await context.getCredentials('supabaseApi');
		const client = createClient(credentials.host as string, credentials.serviceRole as string);

		void SupabaseVectorStore.fromDocuments(documents, embeddings, {
			client,
			tableName,
			queryName,
		});
	},
});
