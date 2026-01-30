/**
 * Adapters to convert n8n AI interfaces to LangChain objects
 *
 * These adapters allow community nodes that implement n8n interfaces
 * to be used with LangChain-based internal functionality (like agents).
 */

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore, VectorStoreRetriever } from '@langchain/core/vectorstores';
import type { Tool as LangChainTool } from '@langchain/core/tools';
import { DynamicStructuredTool } from '@langchain/core/tools';
import type {
	IN8nChatModel,
	IN8nEmbeddings,
	IN8nVectorStore,
	IN8nTool,
	IN8nAiMessage,
	IN8nDocument,
} from 'n8n-workflow';
import { N8nAiMessageRole } from 'n8n-workflow';
import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';
import { n8nMessageToLangChain, langChainMessageToN8n } from './langchain-to-n8n';

/**
 * Adapter: n8n IN8nChatModel → LangChain BaseChatModel
 *
 * Wraps an n8n chat model to work with LangChain agents and chains.
 * Provides tool calling support through LangChain's bindTools mechanism.
 */
export class N8nChatModelToLangChain extends BaseChatModel {
	private boundTools: any[] = [];

	constructor(private readonly n8nModel: IN8nChatModel) {
		super({});
	}

	_llmType(): string {
		return 'n8n-chat-model';
	}

	async _generate(messages: BaseMessage[]): Promise<any> {
		const n8nMessages = messages.map(langChainMessageToN8n);
		const response = await this.n8nModel.invoke(n8nMessages);
		const lcMessage = n8nMessageToLangChain(response);

		return {
			generations: [
				{
					text: response.content,
					message: lcMessage,
				},
			],
		};
	}

	getName(): string {
		return this.n8nModel.modelName;
	}

	/**
	 * Implements tool binding for agent support.
	 * Stores the tools and returns a bound version of this model.
	 */
	bindTools(tools: any[], kwargs?: any): this {
		const bound = new N8nChatModelToLangChain(this.n8nModel) as this;
		bound.boundTools = tools;
		return bound;
	}
}

/**
 * Adapter: n8n IN8nEmbeddings → LangChain Embeddings
 */
export class N8nEmbeddingsToLangChain extends Embeddings {
	constructor(private readonly n8nEmbeddings: IN8nEmbeddings) {
		super({});
	}

	async embedDocuments(documents: string[]): Promise<number[][]> {
		return await this.n8nEmbeddings.embedDocuments(documents);
	}

	async embedQuery(document: string): Promise<number[]> {
		return await this.n8nEmbeddings.embedQuery(document);
	}
}

/**
 * Adapter: n8n IN8nVectorStore → LangChain VectorStore
 */
export class N8nVectorStoreToLangChain implements VectorStore {
	lc_namespace = ['n8n', 'vectorstores'];

	constructor(
		private readonly n8nStore: IN8nVectorStore,
		public embeddings: Embeddings,
	) {}

	async addDocuments(documents: any[]): Promise<string[]> {
		const n8nDocs: IN8nDocument[] = documents.map((doc) => ({
			content: doc.pageContent,
			metadata: doc.metadata,
			id: doc.id,
		}));
		return await this.n8nStore.addDocuments(n8nDocs);
	}

	async addVectors(vectors: number[][], documents: any[]): Promise<string[]> {
		// n8n vector stores handle embedding internally
		return await this.addDocuments(documents);
	}

	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: any,
	): Promise<[any, number][]> {
		// n8n stores work with text queries, not vectors
		// This is a limitation - would need to convert vector back to text
		throw new Error(
			'Direct vector search not supported on n8n vector stores. Use similaritySearch with text instead.',
		);
	}

	async similaritySearch(query: string, k?: number, filter?: any): Promise<any[]> {
		const n8nDocs = await this.n8nStore.similaritySearch(query, k, filter);

		return n8nDocs.map((doc) => ({
			pageContent: doc.content,
			metadata: doc.metadata || {},
			id: doc.id,
		}));
	}

	async similaritySearchWithScore(
		query: string,
		k?: number,
		filter?: any,
	): Promise<[any, number][]> {
		if ('similaritySearchWithScore' in this.n8nStore && this.n8nStore.similaritySearchWithScore) {
			const results = await this.n8nStore.similaritySearchWithScore(query, k, filter);
			return results.map((doc) => [
				{
					pageContent: doc.content,
					metadata: doc.metadata || {},
					id: doc.id,
				},
				doc.score,
			]);
		}

		// Fallback
		const docs = await this.similaritySearch(query, k, filter);
		return docs.map((doc) => [doc, 0]);
	}

	async delete(params?: { ids: string[] }): Promise<void> {
		if (this.n8nStore.delete && params?.ids) {
			await this.n8nStore.delete(params.ids);
		}
	}

	asRetriever(config?: any): VectorStoreRetriever {
		throw new Error('Retriever conversion not yet implemented for n8n vector stores');
	}
}

/**
 * Convert n8n tool parameter to Zod schema
 */
function n8nParameterToZodSchema(params: IN8nTool['schema']['parameters']): z.ZodObject<any> {
	const shape: Record<string, z.ZodTypeAny> = {};

	for (const param of params) {
		let zodType: z.ZodTypeAny;

		switch (param.type) {
			case 'string':
				zodType = z.string();
				break;
			case 'number':
				zodType = z.number();
				break;
			case 'boolean':
				zodType = z.boolean();
				break;
			case 'array':
				zodType = z.array(z.any());
				break;
			case 'object':
				zodType = z.object({}).passthrough();
				break;
			default:
				zodType = z.string();
		}

		// Add description
		if (param.description) {
			zodType = zodType.describe(param.description);
		}

		// Make optional if not required
		if (!param.required) {
			zodType = zodType.optional();
		}

		// Add default value
		if (param.default !== undefined) {
			zodType = zodType.default(param.default);
		}

		shape[param.name] = zodType;
	}

	return z.object(shape);
}

/**
 * Adapter: n8n IN8nTool → LangChain Tool
 */
export function n8nToolToLangChain(n8nTool: IN8nTool): LangChainTool {
	const zodSchema = n8nParameterToZodSchema(n8nTool.schema.parameters);

	return new DynamicStructuredTool({
		name: n8nTool.name,
		description: n8nTool.description,
		schema: zodSchema,
		func: async (input: IDataObject) => {
			return await n8nTool.call(input);
		},
		returnDirect: n8nTool.returnsDirect,
	});
}

/**
 * Convenience function to wrap n8n chat model for LangChain
 */
export function wrapN8nChatModel(model: IN8nChatModel): BaseChatModel {
	return new N8nChatModelToLangChain(model);
}

/**
 * Convenience function to wrap n8n embeddings for LangChain
 */
export function wrapN8nEmbeddings(embeddings: IN8nEmbeddings): Embeddings {
	return new N8nEmbeddingsToLangChain(embeddings);
}

/**
 * Convenience function to wrap n8n vector store for LangChain
 */
export function wrapN8nVectorStore(store: IN8nVectorStore, embeddings: Embeddings): VectorStore {
	return new N8nVectorStoreToLangChain(store, embeddings);
}

/**
 * Convenience function to wrap n8n tool for LangChain
 */
export function wrapN8nTool(tool: IN8nTool): LangChainTool {
	return n8nToolToLangChain(tool);
}
