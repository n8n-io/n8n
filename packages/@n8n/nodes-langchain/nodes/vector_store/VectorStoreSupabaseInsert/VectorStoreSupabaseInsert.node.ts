import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
} from 'n8n-workflow';
import type { Embeddings } from 'langchain/embeddings/base';
import type { Document } from 'langchain/document';
import { createClient } from '@supabase/supabase-js';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';

import { N8nJsonLoader } from '../../../utils/N8nJsonLoader';
import { N8nBinaryLoader } from '../../../utils/N8nBinaryLoader';
export class VectorStoreSupabaseInsert implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Supabase: Insert',
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
		},
		credentials: [
			{
				name: 'supabaseApi',
				required: true,
			},
		],
		inputs: [
			'main',
			{
				displayName: 'Document',
				maxConnections: 1,
				type: 'document',
				required: true,
			},
			{
				displayName: 'Embedding',
				maxConnections: 1,
				type: 'embedding',
				required: true,
			},
		],
		outputs: ['main'],
		properties: [
			{
				displayName:
					'Please reffer to the Supabase documentation for more information on how to setup your database as a Vector Store. https://supabase.com/docs/guides/ai/langchain',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				default: '',
				required: true,
				description: 'Name of the table to insert into',
			},
			{
				displayName: 'Query Name',
				name: 'queryName',
				type: 'string',
				default: 'match_documents',
				required: true,
				description: 'Name of the query to use for matching documents',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing data for Supabase Insert Vector Store');

		const items = this.getInputData(0);
		const tableName = this.getNodeParameter('tableName', 0) as string;
		const queryName = this.getNodeParameter('queryName', 0) as string;
		const credentials = await this.getCredentials('supabaseApi');

		const documentInput = (await this.getInputConnectionData('document', 0)) as
			| N8nJsonLoader
			| Array<Document<Record<string, unknown>>>;

		const embeddings = (await this.getInputConnectionData('embedding', 0)) as Embeddings;
		const client = createClient(credentials.host as string, credentials.serviceRole as string);

		let processedDocuments: Document[];

		if (documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader) {
			processedDocuments = await documentInput.process(items);
		} else {
			processedDocuments = documentInput;
		}

		await SupabaseVectorStore.fromDocuments(processedDocuments, embeddings, {
			client,
			tableName,
			queryName,
		});

		const serializedDocuments = processedDocuments.map(({ metadata, pageContent }) => ({
			json: { metadata, pageContent },
		}));

		return this.prepareOutputData(serializedDocuments);
	}
}
