import { NodeOperationError, type INodeProperties } from 'n8n-workflow';
import { createClient } from '@supabase/supabase-js';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { createVectorStoreNode } from '../shared/createVectorStoreNode';
import { metadataFilterField } from '../../../utils/sharedFields';
import { supabaseTableNameRLC } from '../shared/descriptions';
import { supabaseTableNameSearch } from '../shared/methods/listSearch';

const sharedFields: INodeProperties[] = [supabaseTableNameRLC];
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
	methods: {
		listSearch: { supabaseTableNameSearch },
	},
	sharedFields,
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			queryName: string;
		};
		const credentials = await context.getCredentials('supabaseApi');
		const client = createClient(credentials.host as string, credentials.serviceRole as string);

		return await SupabaseVectorStore.fromExistingIndex(embeddings, {
			client,
			tableName,
			queryName: options.queryName ?? 'match_documents',
			filter,
		});
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			queryName: string;
		};
		const credentials = await context.getCredentials('supabaseApi');
		const client = createClient(credentials.host as string, credentials.serviceRole as string);

		try {
			await SupabaseVectorStore.fromDocuments(documents, embeddings, {
				client,
				tableName,
				queryName: options.queryName ?? 'match_documents',
			});
		} catch (error) {
			if ((error as Error).message === 'Error inserting: undefined 404 Not Found') {
				throw new NodeOperationError(context.getNode(), `Table ${tableName} not found`, {
					itemIndex,
					description: 'Please check that the table exists in your vector store',
				});
			} else {
				throw new NodeOperationError(context.getNode(), error as Error, {
					itemIndex,
				});
			}
		}
	},
});
