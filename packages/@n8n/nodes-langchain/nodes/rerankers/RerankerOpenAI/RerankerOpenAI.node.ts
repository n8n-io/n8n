import { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import type { DocumentInterface } from '@langchain/core/documents';
import type { Callbacks } from '@langchain/core/callbacks/manager';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';

/**
 * Custom OpenAI-compatible reranker implementation
 */
class OpenAIRerank extends BaseDocumentCompressor {
	private apiKey: string;
	private baseURL: string;
	private model: string;
	private topK?: number;

	constructor(fields: {
		apiKey: string;
		baseURL: string;
		model: string;
		topK?: number;
	}) {
		super();
		this.apiKey = fields.apiKey;
		this.baseURL = fields.baseURL.replace(/\/$/, ''); // Remove trailing slash
		this.model = fields.model;
		this.topK = fields.topK;
	}

	async compressDocuments(
		documents: DocumentInterface[],
		query: string,
		callbacks?: Callbacks,
	): Promise<DocumentInterface[]> {
		if (documents.length === 0) {
			return [];
		}

		try {
			// Prepare the request payload for reranking API
			const requestBody = {
				model: this.model,
				query,
				documents: documents.map((doc) => doc.pageContent),
				top_n: this.topK || documents.length,
			};

			const response = await fetch(`${this.baseURL}/v1/rerank`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();

			// Handle the response format - this may vary depending on the API
			// Common format: { results: [{ index: number, relevance_score: number }] }
			if (result.results && Array.isArray(result.results)) {
				// Sort by relevance score (descending) and map back to documents
				const rankedResults = result.results
					.sort((a: any, b: any) => (b.relevance_score || 0) - (a.relevance_score || 0))
					.slice(0, this.topK) // Limit to topK results
					.map((item: any) => {
						const originalDoc = documents[item.index];
						return {
							...originalDoc,
							metadata: {
								...originalDoc.metadata,
								relevanceScore: item.relevance_score, // Use the expected field name
							},
						};
					});

				return rankedResults;
			}

			// Fallback: return original documents if response format is unexpected
			return documents;
		} catch (error) {
			console.error('Error in OpenAI reranking:', error);
			// Fallback: return original documents on error
			return documents;
		}
	}
}

export class RerankerOpenAI implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Reranker OpenAI',
		name: 'rerankerOpenAI',
		icon: { light: 'file:openai.svg', dark: 'file:openai.dark.svg' },
		group: ['transform'],
		version: 1,
		description:
			'Use OpenAI-compatible Reranker to reorder documents after retrieval from a vector store by relevance to the given query.',
		defaults: {
			name: 'Reranker OpenAI',
		},
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $credentials.url }}',
		},
		credentials: [
			{
				name: 'openAIApi',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.rerankeropenai/',
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
				type: 'string',
				description: 'The model that should be used to rerank the documents',
				default: 'rerank-1',
				placeholder: 'rerank-1',
				required: true,
			},
			{
				displayName: 'Top N',
				name: 'topN',
				type: 'number',
				description: 'Maximum number of documents to return after reranking',
				default: 10,
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for reranking OpenAI');

		const modelName = this.getNodeParameter('modelName', itemIndex) as string;
		const topN = this.getNodeParameter('topN', itemIndex, 10) as number;
		const credentials = await this.getCredentials<{
			apiKey: string;
			url: string;
		}>('openAIApi');

		const reranker = new OpenAIRerank({
			apiKey: credentials.apiKey,
			baseURL: credentials.url,
			model: modelName,
			topK: topN,
		});

		return {
			response: logWrapper(reranker, this),
		};
	}
}
