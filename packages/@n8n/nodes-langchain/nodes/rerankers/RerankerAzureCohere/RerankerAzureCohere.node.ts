import type { DocumentInterface } from '@langchain/core/documents';
import { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import { CohereClientV2 } from 'cohere-ai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@n8n/ai-utilities';

function normalizeAzureCohereBaseUrl(value: string): string {
	const cleaned = value.trim().replace(/\/+$/, '');
	const parsed = new URL(cleaned);

	if (!parsed.protocol || !parsed.hostname) {
		throw new Error('Base URL must be an absolute URL');
	}

	const lower = cleaned.toLowerCase();
	const marker = '/providers/cohere';
	const fullMarker = '/providers/cohere/v2/rerank';

	if (lower.includes(fullMarker)) {
		const base = cleaned.slice(0, lower.indexOf(fullMarker));
		return `${base}/providers/cohere`;
	}

	if (lower.includes(marker)) {
		const base = cleaned.slice(0, lower.indexOf(marker));
		return `${base}/providers/cohere`;
	}

	return `${cleaned}/providers/cohere`;
}

class AzureCohereRerank extends BaseDocumentCompressor {
	private readonly client: CohereClientV2;

	private readonly model: string;

	private readonly topN: number;

	constructor(fields: { apiKey: string; baseUrl: string; model: string; topN: number }) {
		super();
		this.client = new CohereClientV2({
			token: fields.apiKey,
			environment: fields.baseUrl,
		});
		this.model = fields.model;
		this.topN = fields.topN;
	}

	async compressDocuments(
		documents: Array<DocumentInterface>,
		query: string,
	): Promise<Array<DocumentInterface>> {
		if (documents.length === 0) {
			return [];
		}

		const topN = Math.min(Math.max(this.topN, 1), documents.length);
		const inputDocuments = documents.map((document) => document.pageContent);

		try {
			const response = await this.client.rerank({
				model: this.model,
				query,
				documents: inputDocuments,
				topN,
			});

			const rerankedDocuments: Array<DocumentInterface> = [];
			for (const result of response.results) {
				const originalDocument = documents[result.index];
				if (!originalDocument) {
					continue;
				}

				originalDocument.metadata = {
					...originalDocument.metadata,
					relevanceScore: result.relevanceScore ?? 0,
				};
				rerankedDocuments.push(originalDocument);
			}

			return rerankedDocuments.length > 0 ? rerankedDocuments : documents.slice(0, topN);
		} catch {
			return documents.slice(0, topN);
		}
	}
}

export class RerankerAzureCohere implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Reranker Azure Cohere',
		name: 'rerankerAzureCohere',
		icon: { light: 'file:cohere.svg', dark: 'file:cohere.dark.svg' },
		group: ['transform'],
		version: 1,
		description:
			'Use Azure-hosted Cohere Reranker to reorder documents after retrieval from a vector store by relevance to the given query.',
		defaults: {
			name: 'Reranker Azure Cohere',
		},
		credentials: [
			{
				name: 'azureCohereRerankApi',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.rerankercohere/',
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
				description:
					'The Azure Cohere rerank model/deployment name to use, for example <code>rerank-v3.5</code>.',
				default: 'rerank-v3.5',
			},
			{
				displayName: 'Top N',
				name: 'topN',
				type: 'number',
				description: 'The maximum number of documents to return after reranking',
				default: 3,
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for reranking Azure Cohere');

		const modelName = this.getNodeParameter('modelName', itemIndex, 'rerank-v3.5') as string;
		const topN = this.getNodeParameter('topN', itemIndex, 3) as number;
		const credentials = await this.getCredentials<{ apiKey: string; baseUrl: string }>(
			'azureCohereRerankApi',
		);

		const baseUrl = normalizeAzureCohereBaseUrl(credentials.baseUrl);

		const reranker = new AzureCohereRerank({
			apiKey: credentials.apiKey,
			model: modelName,
			topN,
			baseUrl,
		});

		return {
			response: logWrapper(reranker, this),
		};
	}
}
