import type { SupabaseLibArgs } from '@langchain/community/vectorstores/supabase';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import type { Embeddings } from '@langchain/core/embeddings';
import { createClient } from '@supabase/supabase-js';
import {
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { getMetadataFiltersValues } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { metadataFilterField } from '@utils/sharedFields';

import { supabaseTableNameSearch } from '../shared/createVectorStoreNode/methods/listSearch';
import { supabaseTableNameRLC } from '../shared/descriptions';

// This node is deprecated. Use VectorStoreSupabase instead.
export class VectorStoreSupabaseLoad implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Supabase: Load',
		name: 'vectorStoreSupabaseLoad',
		icon: 'file:supabase.svg',
		// Vector Store nodes got merged into a single node
		hidden: true,
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
			{
				displayName: 'Embedding',
				maxConnections: 1,
				type: NodeConnectionTypes.AiEmbedding,
				required: true,
			},
		],
		outputs: [NodeConnectionTypes.AiVectorStore],
		outputNames: ['Vector Store'],
		properties: [
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
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [metadataFilterField],
			},
		],
	};

	methods = { listSearch: { supabaseTableNameSearch } };

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply Supabase Load Vector Store');

		const tableName = this.getNodeParameter('tableName', itemIndex, '', {
			extractValue: true,
		}) as string;
		const queryName = this.getNodeParameter('queryName', itemIndex) as string;

		const credentials = await this.getCredentials('supabaseApi');
		const embeddings = (await this.getInputConnectionData(
			NodeConnectionTypes.AiEmbedding,
			0,
		)) as Embeddings;

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
}
