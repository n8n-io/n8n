import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import {
	NodeOperationError,
	type INodeProperties,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import { metadataFilterField, createVectorStoreNode } from '@n8n/ai-utilities';

import { supabaseTableNameSearch } from '../shared/methods/listSearch';
import { supabaseTableNameRLC } from '../shared/descriptions';

const VALID_SCHEMA_NAME = /^[A-Za-z_][A-Za-z0-9_$]*$/;

const queryNameField: INodeProperties = {
	displayName: 'Query Name',
	name: 'queryName',
	type: 'string',
	default: 'match_documents',
	description: 'Name of the query to use for matching documents',
};

const useCustomSchemaField: INodeProperties = {
	displayName: 'Use Custom Schema',
	name: 'useCustomSchema',
	type: 'boolean',
	default: false,
	noDataExpression: true,
	description:
		'Whether to use a database schema different from the default "public" schema (requires schema exposure in the <a href="https://supabase.com/docs/guides/api/using-custom-schemas?queryGroups=language&language=curl#exposing-custom-schemas">Supabase API</a>)',
};

const schemaField: INodeProperties = {
	displayName: 'Schema',
	name: 'schema',
	type: 'string',
	default: 'public',
	description: 'Name of database schema to use for table',
	displayOptions: { show: { useCustomSchema: [true] } },
};

function createSupabaseClientForSchema(
	context: ISupplyDataFunctions,
	itemIndex: number,
	credentials: { host: string; serviceRole: string },
): SupabaseClient {
	const useCustomSchema = context.getNodeParameter(
		'useCustomSchema',
		itemIndex,
		false,
	) as boolean;
	const schema = useCustomSchema
		? (context.getNodeParameter('schema', itemIndex, 'public') as string)
		: 'public';

	if (!VALID_SCHEMA_NAME.test(schema)) {
		throw new NodeOperationError(
			context.getNode(),
			`Invalid schema name: "${schema}". Schema names must start with a letter or underscore, followed by letters, digits, underscores, or dollar signs.`,
			{ itemIndex },
		);
	}

	return createClient(credentials.host, credentials.serviceRole, {
		db: { schema },
	});
}

const sharedFields: INodeProperties[] = [useCustomSchemaField, schemaField, supabaseTableNameRLC];
const insertFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [queryNameField],
	},
];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [queryNameField, metadataFilterField],
	},
];

const updateFields: INodeProperties[] = [...insertFields];

export class VectorStoreSupabase extends createVectorStoreNode<SupabaseVectorStore>({
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
		operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'],
	},
	methods: {
		listSearch: { supabaseTableNameSearch },
	},
	sharedFields,
	insertFields,
	loadFields: retrieveFields,
	retrieveFields,
	updateFields,
	async getVectorStoreClient(context, filter, embeddings, itemIndex) {
		const tableName = context.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as {
			queryName: string;
		};
		const credentials = await context.getCredentials('supabaseApi');
		const client = createSupabaseClientForSchema(
			context,
			itemIndex,
			credentials as { host: string; serviceRole: string },
		);

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
		const client = createSupabaseClientForSchema(
			context,
			itemIndex,
			credentials as { host: string; serviceRole: string },
		);

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
}) {}
