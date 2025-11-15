import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import {
	AzureAISearchVectorStore,
	AzureAISearchQueryType,
} from '@langchain/community/vectorstores/azure_aisearch';
import { AzureKeyCredential } from '@azure/search-documents';
import {
	type IDataObject,
	type ILoadOptionsFunctions,
	NodeOperationError,
	type INodeProperties,
	type IExecuteFunctions,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import { createVectorStoreNode } from '../shared/createVectorStoreNode/createVectorStoreNode';

// User agent for usage tracking
const USER_AGENT_PREFIX = 'n8n-azure-ai-search';

export const AZURE_AI_SEARCH_CREDENTIALS = 'azureAiSearchApi';
export const INDEX_NAME = 'indexName';
export const QUERY_TYPE = 'queryType';
export const FILTER = 'filter';
export const SEMANTIC_CONFIGURATION = 'semanticConfiguration';

const indexNameField: INodeProperties = {
	displayName: 'Index Name',
	name: INDEX_NAME,
	type: 'string',
	default: 'n8n-vectorstore',
	description:
		'The name of the Azure AI Search index. Will be created automatically if it does not exist.',
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

const filterField: INodeProperties = {
	displayName: 'Filter',
	name: FILTER,
	type: 'string',
	default: '',
	description:
		'Filter results using OData syntax. Use metadata/fieldName for metadata fields. <a href="https://learn.microsoft.com/en-us/azure/search/search-query-odata-filter" target="_blank">Learn more</a>.',
	placeholder: "metadata/category eq 'technology' and metadata/author eq 'John'",
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
		options: [queryTypeField, filterField, semanticConfigurationField],
	},
];

const insertFields: INodeProperties[] = [];

type IFunctionsContext = IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions;

function isExecutionContext(
	context: IFunctionsContext,
): context is IExecuteFunctions | ISupplyDataFunctions {
	// IExecuteFunctions and ISupplyDataFunctions have addInputData method
	// ILoadOptionsFunctions does not
	return 'addInputData' in context;
}

function getParameter(key: string, context: IFunctionsContext, itemIndex: number): string {
	let value: unknown;

	if (isExecutionContext(context)) {
		// Execution context: includes itemIndex parameter
		value = context.getNodeParameter(key, itemIndex, '', { extractValue: true });
	} else {
		// Load options context: no itemIndex parameter
		value = context.getNodeParameter(key, '', { extractValue: true });
	}

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

		// Validate API Key
		if (!credentials.apiKey || typeof credentials.apiKey !== 'string') {
			throw new NodeOperationError(context.getNode(), 'API Key is required for authentication', {
				itemIndex,
			});
		}

		const azureCredentials = new AzureKeyCredential(credentials.apiKey);

		// Pass endpoint, indexName, and credentials to enable automatic index creation
		// LangChain will create the index automatically if it doesn't exist
		const config: any = {
			endpoint,
			indexName,
			credentials: azureCredentials,
			search: {},
			// Add custom user agent for usage tracking
			clientOptions: {
				userAgentOptions: { userAgentPrefix: USER_AGENT_PREFIX },
			},
		};

		// Set search configuration options only for execution contexts
		if (isExecutionContext(context)) {
			const queryType = getQueryType(context, itemIndex);
			const semanticConfiguration = getOptionValue<string>(
				'semanticConfiguration',
				context,
				itemIndex,
			);
			const filter = getOptionValue<string>('filter', context, itemIndex);

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
		context.logger.debug('Azure AI Search connection error:', {
			message: error instanceof Error ? error.message : String(error),
			code: (error as any).code,
			statusCode: (error as any).statusCode,
			details: (error as any).details,
		});

		// Check for authentication errors
		if (
			error.message?.includes('401') ||
			error.message?.includes('Unauthorized') ||
			error.message?.includes('authentication failed')
		) {
			throw new NodeOperationError(
				context.getNode(),
				'Authentication failed - invalid API key or endpoint.',
				{
					itemIndex,
					description:
						'Please verify your API Key and Search Endpoint are correct in the credentials configuration.',
				},
			);
		}

		// Check for authorization errors (403)
		if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
			throw new NodeOperationError(
				context.getNode(),
				'Authorization failed - insufficient permissions.',
				{
					itemIndex,
					description:
						'The API Key does not have sufficient permissions. Ensure the key has the required access level for this operation.',
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

		// Apply OData filter to search methods if specified in options
		if (isExecutionContext(context)) {
			const filter = getOptionValue<string>('filter', context, itemIndex);

			if (filter) {
				// Per LangChain docs, pass filter as 3rd parameter with filterExpression
				const filterObject = { filterExpression: filter };

				// Override similaritySearchVectorWithScore - this is the method called by n8n base node
				const originalSearchVectorWithScore =
					vectorStore.similaritySearchVectorWithScore.bind(vectorStore);
				vectorStore.similaritySearchVectorWithScore = async (
					query: number[],
					k: number,
					additionalFilter?: any,
				) => {
					// Merge our OData filter with any additional filter passed by the caller
					const mergedFilter = additionalFilter
						? { ...filterObject, ...additionalFilter }
						: filterObject;
					return await originalSearchVectorWithScore(query, k, mergedFilter);
				};

				// Override similaritySearch to pass filter as 3rd parameter
				const originalSearch = vectorStore.similaritySearch.bind(vectorStore);
				vectorStore.similaritySearch = async (query: string, k?: number) => {
					return await originalSearch(query, k, filterObject);
				};

				// Override similaritySearchWithScore to pass filter as 3rd parameter
				const originalSearchWithScore = vectorStore.similaritySearchWithScore.bind(vectorStore);
				vectorStore.similaritySearchWithScore = async (query: string, k?: number) => {
					return await originalSearchWithScore(query, k, filterObject);
				};

				// Override asRetriever to inject filter into retriever options
				const originalAsRetriever = vectorStore.asRetriever.bind(vectorStore);
				vectorStore.asRetriever = (kwargs?: any) => {
					return originalAsRetriever({
						...kwargs,
						filter: filterObject,
					});
				};
			}
		}

		return vectorStore;
	},
	async populateVectorStore(context, embeddings, documents, itemIndex) {
		try {
			const vectorStore = await getAzureAISearchClient(context, embeddings, itemIndex);

			// Add documents to Azure AI Search (framework handles batching)
			await vectorStore.addDocuments(documents);
		} catch (error) {
			// Log the full error for debugging
			context.logger.debug('Azure AI Search error details:', {
				message: error instanceof Error ? error.message : String(error),
				code: (error as any).code,
				statusCode: (error as any).statusCode,
				details: (error as any).details,
				stack: error instanceof Error ? error.stack : undefined,
			});

			// Check for authentication errors
			if (
				error.message?.includes('401') ||
				error.message?.includes('Unauthorized') ||
				error.message?.includes('authentication failed')
			) {
				throw new NodeOperationError(
					context.getNode(),
					'Authentication failed during document upload - invalid API key or endpoint.',
					{
						itemIndex,
						description:
							'Please verify your API Key and Search Endpoint are correct in the credentials configuration.',
					},
				);
			}

			// Check for authorization errors
			if (
				error.message?.includes('403') ||
				error.message?.includes('Forbidden') ||
				(error as any).statusCode === 403
			) {
				throw new NodeOperationError(
					context.getNode(),
					'Authorization failed - insufficient permissions for document upload.',
					{
						itemIndex,
						description:
							'The API Key does not have sufficient permissions for write operations. Ensure the key has the required access level.',
					},
				);
			}

			// Check for RestError (common Azure SDK error)
			if ((error as any).name === 'RestError' || error.message?.includes('RestError')) {
				const statusCode = (error as any).statusCode || 'unknown';
				const errorCode = (error as any).code || 'unknown';
				const errorMessage = error instanceof Error ? error.message : String(error);
				throw new NodeOperationError(
					context.getNode(),
					`Azure AI Search API error (${statusCode}): ${errorMessage}`,
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
