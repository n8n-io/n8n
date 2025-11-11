import type { DocumentInterface } from '@langchain/core/documents';
import { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import { VoyageAIClient } from 'voyageai';

import { logWrapper } from '@utils/logWrapper';
import { getProxyAgent } from '@utils/httpProxyAgent';

interface VoyageRerankerArgs {
	apiKey: string;
	baseURL?: string;
	model?: string;
	topK?: number;
	returnDocuments?: boolean;
	truncation?: boolean;
}

/**
 * Custom Document compressor that uses VoyageAI Rerank API.
 * Since LangChain doesn't provide a native VoyageAI reranker,
 * we implement it using the voyageai SDK directly.
 */
class VoyageReranker extends BaseDocumentCompressor {
	private client: VoyageAIClient;
	private model: string;
	private topK?: number;
	private returnDocuments: boolean;
	private truncation: boolean;

	constructor(fields: VoyageRerankerArgs) {
		super();

		// Configure VoyageAI client with optional base URL and proxy support
		const clientOptions: ConstructorParameters<typeof VoyageAIClient>[0] = {
			apiKey: fields.apiKey,
		};

		if (fields.baseURL) {
			clientOptions.environment = fields.baseURL;
		}

		// Create custom fetch function with proxy support
		const proxyAgent = getProxyAgent(fields.baseURL || 'https://api.voyageai.com/v1');
		if (proxyAgent) {
			clientOptions.fetcher = async (args) => {
				const fetchOptions: RequestInit = {
					method: args.method,
					headers: args.headers as Record<string, string>,
				};

				if (args.body) {
					fetchOptions.body = typeof args.body === 'string' ? args.body : JSON.stringify(args.body);
				}

				// Add proxy agent via dispatcher
				(fetchOptions as any).dispatcher = proxyAgent;

				const response = await fetch(args.url, fetchOptions);
				const responseText = await response.text();

				// Return APIResponse type expected by VoyageAI SDK
				if (response.ok) {
					let body: any;
					try {
						body = JSON.parse(responseText);
					} catch {
						body = responseText;
					}

					return {
						ok: true as const,
						body,
						headers: Object.fromEntries(response.headers.entries()),
					};
				} else {
					return {
						ok: false as const,
						error: {
							reason: 'status-code' as const,
							statusCode: response.status,
							body: responseText,
						},
					};
				}
			};
		}

		this.client = new VoyageAIClient(clientOptions);
		this.model = fields.model ?? 'rerank-2';
		this.topK = fields.topK;
		this.returnDocuments = fields.returnDocuments ?? false;
		this.truncation = fields.truncation ?? true;
	}

	/**
	 * Compress documents using VoyageAI's rerank API.
	 *
	 * @param documents - A sequence of documents to compress.
	 * @param query - The query to use for compressing the documents.
	 * @returns A sequence of compressed documents ordered by relevance.
	 */
	async compressDocuments(
		documents: DocumentInterface[],
		query: string,
	): Promise<DocumentInterface[]> {
		// Extract document texts
		const documentTexts = documents.map((doc) => doc.pageContent);

		// Call VoyageAI rerank API
		const response = await this.client.rerank({
			query,
			documents: documentTexts,
			model: this.model,
			topK: this.topK,
			returnDocuments: this.returnDocuments,
			truncation: this.truncation,
		});

		// Map results back to documents with relevance scores
		const rerankedDocuments: DocumentInterface[] = [];

		if (response.data) {
			for (const result of response.data) {
				if (result.index !== undefined) {
					const originalDoc = documents[result.index];
					// Create a new document with the relevance score in metadata
					rerankedDocuments.push({
						pageContent: originalDoc.pageContent,
						metadata: {
							...originalDoc.metadata,
							relevanceScore: result.relevanceScore,
						},
						id: originalDoc.id,
					});
				}
			}
		}

		return rerankedDocuments;
	}
}

export class RerankerVoyageAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Reranker VoyageAI',
		name: 'rerankerVoyageAi',
		icon: 'file:voyageAi.svg',
		group: ['transform'],
		version: 1,
		description:
			"Use VoyageAI's Rerank models to reorder documents after retrieval from a vector store by relevance to the given query",
		defaults: {
			name: 'Reranker VoyageAI',
		},
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials.url }}',
		},
		credentials: [
			{
				name: 'voyageAiApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Rerankers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.rerankervoyageai/',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiReranker],
		outputNames: ['Reranker'],
		properties: [
			{
				displayName: 'Model',
				name: 'modelName',
				type: 'options',
				description:
					'The model that should be used to rerank the documents. <a href="https://docs.voyageai.com/docs/reranker" target="_blank">Learn more</a>.',
				default: 'rerank-2.5',
				options: [
					{
						name: 'Rerank-2.5 (Latest, 32K Context)',
						value: 'rerank-2.5',
						description: 'Latest model, generalist with instruction-following optimization',
					},
					{
						name: 'Rerank-2.5-Lite (32K Context)',
						value: 'rerank-2.5-lite',
						description: 'Balanced latency and quality',
					},
					{
						name: 'Rerank-2 (Legacy, 32K Context)',
						value: 'rerank-2',
						description: 'Previous generation model',
					},
					{
						name: 'Rerank-2-Lite (Legacy, 32K Context)',
						value: 'rerank-2-lite',
						description: 'Previous generation lite model',
					},
				],
			},
			{
				displayName: 'Top K',
				name: 'topK',
				type: 'number',
				description: 'The maximum number of documents to return after reranking',
				default: 3,
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Truncate',
						name: 'truncation',
						type: 'boolean',
						default: true,
						description:
							'Whether to truncate input texts that exceed the maximum context length. If false, an error will be raised for oversized inputs.',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for reranker VoyageAI');

		const modelName = this.getNodeParameter('modelName', itemIndex, 'rerank-2.5') as string;
		const topK = this.getNodeParameter('topK', itemIndex, 3) as number;
		const credentials = await this.getCredentials<{ apiKey: string; url?: string }>('voyageAiApi');

		const options = this.getNodeParameter('options', itemIndex, {}) as {
			truncation?: boolean;
		};

		// Get base URL from credentials (defaults to https://api.voyageai.com/v1)
		const baseURL = credentials.url || 'https://api.voyageai.com/v1';

		const reranker = new VoyageReranker({
			apiKey: credentials.apiKey,
			baseURL,
			model: modelName,
			topK,
			truncation: options.truncation ?? true,
		});

		return {
			response: logWrapper(reranker, this),
		};
	}
}
