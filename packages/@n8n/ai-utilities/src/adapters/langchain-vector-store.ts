import type { Document as LangchainDocument } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { VectorStore as LangchainVectorStore } from '@langchain/core/vectorstores';
import { ApplicationError, type IExecuteFunctions, type ISupplyDataFunctions } from 'n8n-workflow';

import { fromLcDocument, toLcDocument } from '../converters/vector-store';
import type { VectorStore } from '../types/vector-store';
import { logAiEvent } from '../utils/log-ai-event';

export class LangchainVectorStoreAdapter extends LangchainVectorStore {
	private readonly provider: string;

	constructor(
		private vectorStore: VectorStore,
		embeddings: Embeddings,
		private ctx?: IExecuteFunctions | ISupplyDataFunctions,
	) {
		// Store provider before calling super to avoid undefined access in _vectorstoreType()
		const provider = vectorStore.provider;
		super(embeddings, {});
		this.provider = provider;
	}

	async addVectors(vectors: number[][], documents: LangchainDocument[]): Promise<string[]> {
		try {
			const n8nDocs = documents.map(fromLcDocument);

			const ids = this.vectorStore.addVectors
				? await this.vectorStore.addVectors(vectors, n8nDocs)
				: await this.vectorStore.addDocuments(n8nDocs);

			if (this.ctx) {
				logAiEvent(this.ctx, 'ai-vector-store-populated');
			}

			return ids;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error occurred';
			throw new ApplicationError(
				`Failed to add documents to ${this.vectorStore.provider} vector store: ${message}`,
				{ cause: error },
			);
		}
	}

	async addDocuments(
		documents: LangchainDocument[],
		options?: { ids?: string[] },
	): Promise<string[]> {
		try {
			const n8nDocs = documents.map(fromLcDocument);

			if (options?.ids) {
				n8nDocs.forEach((doc, i) => {
					if (options.ids?.[i]) {
						doc.id = options.ids[i];
					}
				});
			}

			const ids = await this.vectorStore.addDocuments(n8nDocs);

			return ids;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error occurred';
			throw new ApplicationError(
				`Failed to add documents to ${this.vectorStore.provider} vector store: ${message}`,
				{ cause: error },
			);
		}
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<Array<[LangchainDocument, number]>> {
		try {
			const results = await this.vectorStore.similaritySearch('[vector search]', query, {
				topK: k,
				filter,
			});

			if (this.ctx) {
				logAiEvent(this.ctx, 'ai-vector-store-searched');
			}

			const filteredResults = results.filter((result) => {
				const threshold = this.vectorStore.defaultConfig?.scoreThreshold;
				return threshold === undefined || result.score >= threshold;
			});

			return filteredResults.map((result) => [toLcDocument(result.document), result.score]);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error occurred';
			throw new ApplicationError(
				`Failed to search ${this.vectorStore.provider} vector store: ${message}`,
				{ cause: error },
			);
		}
	}

	async delete(params: { ids: string[] }): Promise<void> {
		try {
			await this.vectorStore.deleteDocuments(params.ids);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error occurred';
			throw new ApplicationError(
				`Failed to delete documents from ${this.vectorStore.provider} vector store: ${message}`,
				{ cause: error },
			);
		}
	}

	_vectorstoreType(): string {
		return `n8n-${this.provider}`;
	}
}
