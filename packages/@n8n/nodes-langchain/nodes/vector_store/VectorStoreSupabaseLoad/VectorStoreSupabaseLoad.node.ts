import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IDataObject,
	type SupplyData,
	type INodeExecutionData,
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
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.vectorstoresupabaseload/',
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
		inputs: `={{
			((parameters) => {
				const mode = parameters.mode;
				const inputs = [{ displayName: "Embedding", type: "${NodeConnectionType.AiEmbedding}", required: true, maxConnections: 1}]

				if (mode === 'executable') {
					inputs.push({ displayName: "", type: "${NodeConnectionType.Main}"})
				}
				return inputs
			})($parameter)
		}}`,
		outputs: `={{
			((parameters) => {
				const mode = parameters.mode;
				if (mode === 'config') {
					return [{ displayName: "Vector Store", type: "${NodeConnectionType.AiVectorStore}"}]
				}
				return [{ displayName: "", type: "${NodeConnectionType.Main}"}]
			})($parameter)
		}}`,
		properties: [
			{
				displayName: 'Operation',
				name: 'mode',
				type: 'options',
				default: 'config',
				options: [
					{
						name: 'Load Documents',
						value: 'load',
						description: 'Load documents from vector store',
					},
					{
						name: 'Insert Documents',
						value: 'insert',
						description: 'Insert documents into vector store',
					},
					{
						name: 'Retrieve Documents',
						value: 'retrieve',
						description: 'Retrieve documents from vector store to be used with AI nodes',
					},
				],
			},
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
			// Options
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing data for Supabase Insert Vector Store');

		const items = this.getInputData(0);
		const tableName = this.getNodeParameter('tableName', 0) as string;
		const queryName = this.getNodeParameter('queryName', 0) as string;
		const options = this.getNodeParameter('options', 0, {}) as {
			filter?: IDataObject;
		};
		const credentials = await this.getCredentials('supabaseApi');

		const embeddings = (await this.getInputConnectionData(
			NodeConnectionType.AiEmbedding,
			0,
		)) as Embeddings;
		const client = createClient(credentials.host as string, credentials.serviceRole as string);
		const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
			client,
			tableName,
			queryName,
			filter: options.filter,
		});

		const resultData = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			// const item = items[itemIndex];
			const query = this.getNodeParameter('query', itemIndex) as string;
			const topK = this.getNodeParameter('topK', itemIndex, 4) as number;
			const embeddedQuery = await embeddings.embedQuery(query);
			const docs = await vectorStore.similaritySearchVectorWithScore(
				embeddedQuery,
				topK,
				options.filter,
			);

			const serializedDocs = docs.map(([doc, score]) => {
				const document = {
					metadata: doc.metadata,
					pageContent: doc.pageContent,
				};

				return { json: { document, score } };
			});
			resultData.push(...serializedDocs);
		}

		return this.prepareOutputData(resultData);
	}

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.verbose('Supply Supabase Load Vector Store');

		const tableName = this.getNodeParameter('tableName', itemIndex) as string;
		const queryName = this.getNodeParameter('queryName', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			filter?: IDataObject;
		};

		const credentials = await this.getCredentials('supabaseApi');
		const embeddings = (await this.getInputConnectionData(
			NodeConnectionType.AiEmbedding,
			0,
		)) as Embeddings;

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
