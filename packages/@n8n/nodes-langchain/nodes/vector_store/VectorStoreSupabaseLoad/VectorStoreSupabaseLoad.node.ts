import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	SupplyData,
} from 'n8n-workflow';
import type { Embeddings } from 'langchain/embeddings/base';
import { createClient } from '@supabase/supabase-js';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';

import { logWrapper } from '../../../utils/logWrapper';
export class VectorStoreSupabaseLoad implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Supabase: Load',
		name: 'vectorStoreSupabaseLoad',
		icon: 'file:supabase.svg',
		group: ['transform'],
		version: 1,
		description: 'Load data from Supabase Vector Store index',
		defaults: {
			name: 'Supabase: Load',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Vector Stores'],
			},
		},
		credentials: [
			{
				name: 'supabaseApi',
				required: true,
			},
		],
		inputs: [
			{
				displayName: 'Embedding',
				maxConnections: 1,
				type: 'embedding',
				required: true,
			},
		],
		outputs: ['vectorStore'],
		outputNames: ['Vector Store'],
		properties: [
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
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Metadata Filter',
						name: 'filter',
						type: 'string',
						typeOptions: {
							editor: 'json',
							editorLanguage: 'json',
						},
						default: '',
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		this.logger.verbose('Supply Supabase Load Vector Store');

		const tableName = this.getNodeParameter('tableName', 0) as string;
		const queryName = this.getNodeParameter('queryName', 0) as string;
		const options = this.getNodeParameter('options', 0, {}) as {
			filter?: IDataObject;
		};

		const credentials = await this.getCredentials('supabaseApi');
		const embeddings = (await this.getInputConnectionData('embedding', 0)) as Embeddings;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const client = createClient(credentials.host as string, credentials.serviceRole as string);

		const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
			client,
			tableName,
			queryName,
			filter: options.filter,
		});

		return {
			response: logWrapper(vectorStore, this),
		};
	}
}
