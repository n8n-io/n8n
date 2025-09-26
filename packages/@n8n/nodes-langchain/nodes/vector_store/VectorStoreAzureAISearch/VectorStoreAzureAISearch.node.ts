import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import {
	AzureAISearchVectorStore,
	AzureAISearchQueryType,
} from '@langchain/community/vectorstores/azure_aisearch';
import { DefaultAzureCredential } from '@azure/identity';
import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import {
	type IDataObject,
	type ILoadOptionsFunctions,
	NodeOperationError,
	type INodeProperties,
	type IExecuteFunctions,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import { metadataFilterField } from '@utils/sharedFields';

import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';

// User agent for usage tracking
const USER_AGENT_PREFIX = 'n8n-azure-ai-search';

export const AZURE_AI_SEARCH_CREDENTIALS = 'azureAiSearchApi';
export const INDEX_NAME = 'indexName';
export const QUERY_TYPE = 'queryType';
export const RESULTS_COUNT = 'resultsCount';
export const FILTER = 'filter';
export const SEMANTIC_CONFIGURATION = 'semanticConfiguration';

const indexNameField: INodeProperties = {
	displayName: 'Index Name',
	name: INDEX_NAME,
	type: 'string',
	default: '',
	description: 'The name of the Azure AI Search index',
	required: true,
};

const queryTypeField: INodeProperties = {
	displayName: 'Query Type',
	name: QUERY_TYPE,
	type: 'options',
	default: 'hybrid',
	description: 'The type of search query to perform',
	options: [
		{
			name: 'Vector',
			value: 'vector',
			description: 'Vector similarity search only',
		},
		{
			name: 'Hybrid',
			value: 'hybrid',
			description: 'Combines vector and keyword search (recommended)',
		},
		{
			name: 'Semantic Hybrid',
			value: 'semanticHybrid',
			description: 'Hybrid search with semantic ranking (requires Basic tier or higher)',
		},
	],
};

const resultsCountField: INodeProperties = {
	displayName: 'Results Count',
	name: RESULTS_COUNT,
	type: 'number',
	default: 50,
	description:
		'Number of results to return from Azure AI Search (maximum depends on your service tier)',
	typeOptions: {
		minValue: 1,
		maxValue: 1000,
	},
};

const filterField: INodeProperties = {
	displayName: 'Filter',
	name: FILTER,
	type: 'string',
	default: '',
	description: 'OData filter expression to apply to the search query',
	placeholder: "category eq 'technology' and rating ge 4",
};

const semanticConfigurationField: INodeProperties = {
	displayName: 'Semantic Configuration',
	name: SEMANTIC_CONFIGURATION,
	type: 'string',
	default: '',
	description: 'Name of the semantic configuration for semantic ranking (optional)',
	displayOptions: {
		show: {
			[QUERY_TYPE]: ['semanticHybrid'],
		},
	},
};

const sharedFields: INodeProperties[] = [indexNameField];

const retrieveFields: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			queryTypeField,
			resultsCountField,
			filterField,
			semanticConfigurationField,
			metadataFilterField,
		],
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
				displayName: 'Clear Index',
				name: 'clearIndex',
				type: 'boolean',
				default: false,
				description: 'Whether to clear all documents in the index before inserting new data',
			},
			{
				displayName: 'Batch Size',
				name: 'batchSize',
				type: 'number',
				default: 100,
				description:
					'Number of documents to upload to Azure AI Search in a single batch (not to be confused with embedding batch size)',
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
			},
		],
	},
];

type IFunctionsContext = IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions;

function isExecutionContext(
	context: IFunctionsContext,
): context is IExecuteFunctions | ISupplyDataFunctions {
	return 'getNodeParameter' in context;
}

function getParameter(key: string, context: IFunctionsContext, itemIndex: number): string {
	const value = context.getNodeParameter(key, itemIndex, '', {
		extractValue: true,
	}) as string;
	if (typeof value !== 'string') {
		throw new NodeOperationError(context.getNode(), `Parameter ${key} must be a string`);
	}
	return value;
}

export const getIndexName = getParameter.bind(null, INDEX_NAME);

function getOptionValue<T>(
	name: string,
	context: IExecuteFunctions | ISupplyDataFunctions,
	itemIndex: number,
	defaultValue?: T,
): T | undefined {
	const options: IDataObject = context.getNodeParameter('options', itemIndex, {});
	return options[name] !== undefined ? (options[name] as T) : defaultValue;
}

async function getAzureAISearchClient(
	context: IFunctionsContext,
	embeddings: EmbeddingsInterface,
	itemIndex: number,
): Promise<AzureAISearchVectorStore> {
	const credentials = await context.getCredentials(AZURE_AI_SEARCH_CREDENTIALS);
	const authType = credentials.authType || 'apiKey';

	try {
		const indexName = getIndexName(context, itemIndex);

		if (!credentials.endpoint || typeof credentials.endpoint !== 'string') {
			throw new NodeOperationError(
				context.getNode(),
				'Azure AI Search endpoint is missing or invalid',
				{ itemIndex },
			);
		}
		const endpoint = credentials.endpoint;

		// Create the appropriate credentials based on auth type
		let azureCredentials: AzureKeyCredential | DefaultAzureCredential;

		if (authType === 'apiKey') {
			if (!credentials.apiKey || typeof credentials.apiKey !== 'string') {
				throw new NodeOperationError(
					context.getNode(),
					'API Key is required for API Key authentication',
					{ itemIndex },
				);
			}
			azureCredentials = new AzureKeyCredential(credentials.apiKey);
		} else if (authType === 'managedIdentitySystem') {
			// Use DefaultAzureCredential which supports:
			// 1. System-assigned MI when running on Azure
			// 2. Microsoft Entra ID via Azure CLI for local development
			azureCredentials = new DefaultAzureCredential();
		} else if (authType === 'managedIdentityUser') {
			if (
				!credentials.managedIdentityClientId ||
				typeof credentials.managedIdentityClientId !== 'string'
			) {
				throw new NodeOperationError(
					context.getNode(),
					'Client ID is required for User-Assigned Managed Identity',
					{ itemIndex },
				);
			}
			const clientId = credentials.managedIdentityClientId;
			// Use DefaultAzureCredential with specific client ID for user-assigned MI
			// This supports both Azure-hosted MI and local Microsoft Entra ID auth
			azureCredentials = new DefaultAzureCredential({
				managedIdentityClientId: clientId,
			});
		} else {
			throw new NodeOperationError(
				context.getNode(),
				`Unsupported authentication type: ${authType}`,
				{ itemIndex },
			);
		}

		// Create a custom SearchClient with our user agent
		const searchClient = new SearchClient(endpoint, indexName, azureCredentials, {
			userAgentOptions: { userAgentPrefix: USER_AGENT_PREFIX },
		});

		const config: any = {
			indexName,
			search: {},
			client: searchClient, // Pass our custom client with user agent (includes credentials)
		};

		// Set search configuration options only for execution contexts
		if (isExecutionContext(context)) {
			const queryType = getQueryType(context, itemIndex);
			const filter = getOptionValue<string>('filter', context, itemIndex);
			const semanticConfiguration = getOptionValue<string>(
				'semanticConfiguration',
				context,
				itemIndex,
			);

			config.search.type = queryType;

			if (filter) {
				config.search.filter = filter;
			}

			if (queryType === AzureAISearchQueryType.SemanticHybrid && semanticConfiguration) {
				config.search.semanticConfigurationName = semanticConfiguration;
			}
		}

		return new AzureAISearchVectorStore(embeddings, config);
	} catch (error) {
		if (error instanceof NodeOperationError) {
			throw error;
		}

		// Log the full error for debugging
		console.error('Azure AI Search connection error:', {
			message: error.message,
			code: error.code,
			statusCode: error.statusCode,
			details: error.details,
		});

		// Check for authentication errors
		if (
			error.message?.includes('CredentialUnavailable') ||
			error.message?.includes('authentication failed') ||
			error.message?.includes('No MSI credential available')
		) {
			if (authType === 'managedIdentitySystem' || authType === 'managedIdentityUser') {
				throw new NodeOperationError(
					context.getNode(),
					'Microsoft Entra ID authentication failed.',
					{
						itemIndex,
						description: `Authentication options:
1. **API Key (simplest)**: Switch to API Key authentication in credentials
2. **Local Microsoft Entra ID**: Run 'az login' and ensure your account has a Search role (Search Index Data Reader/Contributor)
3. **Managed Identity (Azure only)**: Deploy n8n on Azure with MI enabled and appropriate Search permissions

Required roles:
- Read operations: Search Index Data Reader
- Write operations: Search Index Data Contributor or Search Service Contributor`,
					},
				);
			}
		}

		// Check for authorization errors (403)
		if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
			throw new NodeOperationError(
				context.getNode(),
				'Authorization failed - insufficient permissions.',
				{
					itemIndex,
					description: `The authenticated identity lacks required permissions.

Required Azure AI Search roles:
- **Read operations**: Search Index Data Reader (or higher)
- **Write operations**: Search Index Data Contributor or Search Service Contributor

Grant the appropriate role in Azure Portal → Your Search Service → Access control (IAM)`,
				},
			);
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		throw new NodeOperationError(context.getNode(), `Error: ${errorMessage}`, {
			itemIndex,
			description: 'Please check your Azure AI Search connection details',
		});
	}
}

function getQueryType(
	context: IExecuteFunctions | ISupplyDataFunctions,
	itemIndex: number,
): AzureAISearchQueryType {
	const queryType = getOptionValue<string>('queryType', context, itemIndex, 'hybrid');

	switch (queryType) {
		case 'vector':
			return AzureAISearchQueryType.Similarity;
		case 'hybrid':
			return AzureAISearchQueryType.SimilarityHybrid;
		case 'semanticHybrid':
			return AzureAISearchQueryType.SemanticHybrid;
		default:
			return AzureAISearchQueryType.SimilarityHybrid;
	}
}

export class VectorStoreAzureAISearch extends createVectorStoreNode({
	meta: {
		displayName: 'Azure AI Search Vector Store',
		name: 'vectorStoreAzureAISearch',
		description: 'Work with your data in Azure AI Search Vector Store',
		icon: { light: 'file:azure-aisearch.svg', dark: 'file:azure-aisearch.svg' },
		docsUrl:
			'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstoreazureaisearch/',
		credentials: [
			{
				name: 'azureAiSearchApi',
				required: true,
			},
		],
		operationModes: ['load', 'insert', 'retrieve', 'update', 'retrieve-as-tool'],
	},
	sharedFields,
	retrieveFields,
	loadFields: retrieveFields,
	insertFields,
	async getVectorStoreClient(context, _filter, embeddings, itemIndex) {
		const vectorStore = await getAzureAISearchClient(context, embeddings, itemIndex);

		// Override the similaritySearch method to use the resultsCount option
		if (isExecutionContext(context)) {
			const resultsCount = getOptionValue<number>('resultsCount', context, itemIndex, 50);

			const originalSearch = vectorStore.similaritySearch.bind(vectorStore);
			vectorStore.similaritySearch = async (query: string, k?: number, filter?: any) => {
				return await originalSearch(query, k ?? resultsCount, filter);
			};

			const originalSearchWithScore = vectorStore.similaritySearchWithScore.bind(vectorStore);
			vectorStore.similaritySearchWithScore = async (query: string, k?: number, filter?: any) => {
				return await originalSearchWithScore(query, k ?? resultsCount, filter);
			};
		}

		return vectorStore;
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		try {
			const vectorStore = await getAzureAISearchClient(context, embeddings, itemIndex);

			const clearIndex = getOptionValue<boolean>('clearIndex', context, itemIndex, false);

			if (clearIndex) {
				try {
					// Clear all documents in the index using a filter that matches all
					await vectorStore.delete({ filter: { filterExpression: '1 eq 1' } });
				} catch (error) {
					context.logger.warn(`Could not clear index: ${error.message}`);
				}
			}

			const batchSize = getOptionValue<number>('batchSize', context, itemIndex, 100) || 100;

			// Upload documents in batches to Azure AI Search
			for (let i = 0; i < documents.length; i += batchSize) {
				const batch = documents.slice(i, i + batchSize);
				await vectorStore.addDocuments(batch);
			}
		} catch (error) {
			// Log the full error for debugging
			console.error('Azure AI Search error details:', {
				message: error.message,
				code: error.code,
				statusCode: error.statusCode,
				details: error.details,
				stack: error.stack,
			});

			// Check for authentication errors
			if (
				error.message?.includes('CredentialUnavailable') ||
				error.message?.includes('authentication failed') ||
				error.message?.includes('No MSI credential available')
			) {
				throw new NodeOperationError(
					context.getNode(),
					'Microsoft Entra ID authentication failed during document upload.',
					{
						itemIndex,
						description: `Authentication options:
1. **API Key (simplest)**: Switch to API Key authentication in credentials
2. **Local Microsoft Entra ID**: Run 'az login' and ensure your account has the Search Index Data Contributor role
3. **Managed Identity (Azure only)**: Deploy n8n on Azure with MI enabled and appropriate permissions

Note: Document upload requires write permissions (Search Index Data Contributor or Search Service Contributor)`,
					},
				);
			}

			// Check for authorization errors
			if (
				error.message?.includes('403') ||
				error.message?.includes('Forbidden') ||
				error.statusCode === 403
			) {
				throw new NodeOperationError(
					context.getNode(),
					'Authorization failed - insufficient permissions for document upload.',
					{
						itemIndex,
						description:
							'Document upload requires Search Index Data Contributor or Search Service Contributor role. Please grant the appropriate role in Azure Portal → Your Search Service → Access control (IAM)',
					},
				);
			}

			// Check for RestError (common Azure SDK error)
			if (error.name === 'RestError' || error.message?.includes('RestError')) {
				const statusCode = error.statusCode || 'unknown';
				const errorCode = error.code || 'unknown';
				throw new NodeOperationError(
					context.getNode(),
					`Azure AI Search API error (${statusCode}): ${error.message}`,
					{
						itemIndex,
						description: `Error code: ${errorCode}\n\nCommon causes:\n- Invalid endpoint URL\n- Index doesn't exist\n- Authentication/authorization issues\n- API version mismatch\n\nCheck the console logs for detailed error information.`,
					},
				);
			}

			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new NodeOperationError(context.getNode(), `Error: ${errorMessage}`, {
				itemIndex,
				description: 'Please check your Azure AI Search connection details and index configuration',
			});
		}
	},
}) {}
