import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	filesOperations,
	filesParameters,
	genieOperations,
	genieParameters,
	unityCatalogOperations,
	unityCatalogParameters,
	databricksSqlOperations,
	databricksSqlParameters,
	modelServingOperations,
	modelServingParameters,
	vectorSearchOperations,
	vectorSearchParameters,
} from './resources';

import { router } from './actions/router';
import * as listSearch from './methods/listSearch';

export class Databricks implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Databricks',
		name: 'databricks',
		icon: 'file:databricks.svg',
		group: ['transform'],
		version: 1,
		usableAsTool: true,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Databricks API',
		documentationUrl: 'https://docs.databricks.com/aws/en',
		defaults: {
			name: 'Databricks',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'databricksApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'databricksOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Databricks SQL',
						value: 'databricksSql',
						description:
							'Execute SQL queries on data warehouses. <a href="https://docs.databricks.com/sql/index.html" target="_blank">Learn more</a>.',
					},
					{
						name: 'File',
						value: 'files',
						description:
							'Manage files in Unity Catalog volumes. <a href="https://docs.databricks.com/api/workspace/files" target="_blank">Learn more</a>.',
					},
					{
						name: 'Genie',
						value: 'genie',
						description:
							'AI-powered data assistant. <a href="https://docs.databricks.com/genie/index.html" target="_blank">Learn more</a>.',
					},
					{
						name: 'Model Serving',
						value: 'modelServing',
						description:
							'Deploy and query ML models. <a href="https://docs.databricks.com/machine-learning/model-serving/index.html" target="_blank">Learn more</a>.',
					},
					{
						name: 'Unity Catalog',
						value: 'unityCatalog',
						description:
							'Unified governance for data and AI. <a href="https://docs.databricks.com/data-governance/unity-catalog/index.html" target="_blank">Learn more</a>.',
					},
					{
						name: 'Vector Search',
						value: 'vectorSearch',
						description:
							'Semantic search with vector embeddings. <a href="https://docs.databricks.com/generative-ai/vector-search.html" target="_blank">Learn more</a>.',
					},
				],
				default: 'databricksSql',
			},
			filesOperations,
			genieOperations,
			unityCatalogOperations,
			databricksSqlOperations,
			modelServingOperations,
			vectorSearchOperations,
			...filesParameters,
			...genieParameters,
			...unityCatalogParameters,
			...databricksSqlParameters,
			...modelServingParameters,
			...vectorSearchParameters,
		],
	};

	methods = { listSearch };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await router.call(this);
	}
}
