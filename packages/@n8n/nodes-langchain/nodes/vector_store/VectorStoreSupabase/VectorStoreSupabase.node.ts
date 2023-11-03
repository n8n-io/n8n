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
];
const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Query Name',
				name: 'queryName',
				type: 'string',
				default: 'match_documents',
				description: 'Name of the query to use for matching documents',
			},
		],
	},
];
const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Query Name',
				name: 'queryName',
				type: 'string',
				default: 'match_documents',
				description: 'Name of the query to use for matching documents',
			},
			metadataFilterField,
		],
	},
];
export const VectorStoreSupabase = createVectorStoreNode({
	meta: {
		description: 'Work with your data in Supabase Vector Store',
		icon: 'file:supabase.svg',
		displayName: 'Supabase Vector Store',
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoresupabase/',
		name: 'vectorStoreSupabase',
		credentials: [
			{
				name: 'supabaseApi',
				required: true,
			},
		],
	},
	sharedFields,
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			queryName: string;
		};
		const credentials = await context.getCredentials('supabaseApi');
		const client = createClient(credentials.host as string, credentials.serviceRole as string);

		return SupabaseVectorStore.fromExistingIndex(embeddings, {
			client,
			tableName,
			queryName: options.queryName ?? 'match_documents',
			filter,
		});
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			queryName: string;
		};
		const credentials = await context.getCredentials('supabaseApi');
		const client = createClient(credentials.host as string, credentials.serviceRole as string);

		void SupabaseVectorStore.fromDocuments(documents, embeddings, {
			client,
			tableName,
			queryName: options.queryName ?? 'match_documents',
		});
	},
});
