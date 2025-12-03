/**
 * Adapters to convert n8n AI interfaces to LangChain objects
 *
 * These adapters allow community nodes that implement n8n interfaces
 * to be used with LangChain-based internal functionality (like agents).
 */

import {
	BufferMemory,
	BufferWindowMemory,
	type BaseChatMemory,
	type InputValues,
	type MemoryVariables,
	type OutputValues,
} from '@langchain/classic/memory';
import { BaseChatMessageHistory } from '@langchain/core/chat_history';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import {
	AIMessage,
	FunctionMessage,
	HumanMessage,
	SystemMessage,
	ToolMessage,
} from '@langchain/core/messages';
import type {
	IDataObject,
	IN8nAiMessage,
	IN8nChatModel,
	IN8nEmbeddings,
	N8NBaseChatMessageHistory,
	N8nMemory,
	N8nSimpleMemory,
} from 'n8n-workflow';
import { isN8nSimpleMemory, jsonParse, N8nAiMessageRole } from 'n8n-workflow';

import { langChainMessageToN8n, n8nMessageToLangChain } from './langchain-to-n8n';

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
// export class N8nVectorStoreToLangChain implements VectorStore {
// 	lc_namespace = ['n8n', 'vectorstores'];

// 	constructor(
// 		private readonly n8nStore: IN8nVectorStore,
// 		public embeddings: Embeddings,
// 	) {}

// 	async addDocuments(documents: any[]): Promise<string[]> {
// 		const n8nDocs: IN8nDocument[] = documents.map((doc) => ({
// 			content: doc.pageContent,
// 			metadata: doc.metadata,
// 			id: doc.id,
// 		}));
// 		return await this.n8nStore.addDocuments(n8nDocs);
// 	}

// 	async addVectors(vectors: number[][], documents: any[]): Promise<string[]> {
// 		// n8n vector stores handle embedding internally
// 		return await this.addDocuments(documents);
// 	}

// 	async similaritySearchVectorWithScore(
// 		query: number[],
// 		k: number,
// 		filter?: any,
// 	): Promise<Array<[any, number]>> {
// 		// n8n stores work with text queries, not vectors
// 		// This is a limitation - would need to convert vector back to text
// 		throw new Error(
// 			'Direct vector search not supported on n8n vector stores. Use similaritySearch with text instead.',
// 		);
// 	}

// 	async similaritySearch(query: string, k?: number, filter?: any): Promise<any[]> {
// 		const n8nDocs = await this.n8nStore.similaritySearch(query, k, filter);

// 		return n8nDocs.map((doc) => ({
// 			pageContent: doc.content,
// 			metadata: doc.metadata || {},
// 			id: doc.id,
// 		}));
// 	}

// 	async similaritySearchWithScore(
// 		query: string,
// 		k?: number,
// 		filter?: any,
// 	): Promise<Array<[any, number]>> {
// 		if ('similaritySearchWithScore' in this.n8nStore && this.n8nStore.similaritySearchWithScore) {
// 			const results = await this.n8nStore.similaritySearchWithScore(query, k, filter);
// 			return results.map((doc) => [
// 				{
// 					pageContent: doc.content,
// 					metadata: doc.metadata || {},
// 					id: doc.id,
// 				},
// 				doc.score,
// 			]);
// 		}

// 		// Fallback
// 		const docs = await this.similaritySearch(query, k, filter);
// 		return docs.map((doc) => [doc, 0]);
// 	}

// 	async delete(params?: { ids: string[] }): Promise<void> {
// 		if (this.n8nStore.delete && params?.ids) {
// 			await this.n8nStore.delete(params.ids);
// 		}
// 	}

// 	asRetriever(config?: any): VectorStoreRetriever {
// 		throw new Error('Retriever conversion not yet implemented for n8n vector stores');
// 	}
// }

export class N8nMemoryToLangChain implements BaseChatMemory {
	memory: N8nMemory;
	chatHistory: BaseChatMessageHistory;
	returnMessages: boolean;
	inputKey?: string | undefined;
	outputKey?: string | undefined;
	constructor(memory: N8nMemory) {
		this.memory = memory;
		this.chatHistory = new N8NBaseChatHistoryAdapter(memory.chatHistory);
		this.returnMessages = memory.returnMessages;
		this.inputKey = memory.inputKey;
		this.outputKey = memory.outputKey;
	}
	async saveContext(inputValues: InputValues, outputValues: OutputValues): Promise<void> {
		return await this.memory.saveContext(inputValues, outputValues);
	}
	async clear(): Promise<void> {
		return await this.memory.clear();
	}
	get memoryKeys(): string[] {
		return this.memory.memoryKeys;
	}
	async loadMemoryVariables(values: InputValues): Promise<MemoryVariables> {
		return await this.memory.loadMemoryVariables(values);
	}
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
// export function wrapN8nVectorStore(store: IN8nVectorStore, embeddings: Embeddings): VectorStore {
// 	return new N8nVectorStoreToLangChain(store, embeddings);
// }

/**
 * Convenience function to wrap n8n memory for LangChain
 */
export function wrapN8nMemory(memory: N8nSimpleMemory | N8nMemory): BaseChatMemory {
	console.log('isN8nSimpleMemory', isN8nSimpleMemory, jsonParse);
	if (isN8nSimpleMemory(memory)) {
		return wrapN8nSimpleMemory(memory);
	}
	return new N8nMemoryToLangChain(memory);
}

export function wrapN8nSimpleMemory(memory: N8nSimpleMemory): BaseChatMemory {
	if (memory.type === 'bufferWindow') {
		return new BufferWindowMemory({
			chatHistory: memory.chatHistory
				? new N8NBaseChatHistoryAdapter(memory.chatHistory)
				: undefined,
			returnMessages: memory.returnMessages,
			inputKey: memory.inputKey,
			outputKey: memory.outputKey,
			humanPrefix: memory.humanPrefix,
			aiPrefix: memory.aiPrefix,
			memoryKey: memory.memoryKey,
			k: memory.k,
		});
	} else if (memory.type === 'buffer') {
		return new BufferMemory({
			chatHistory: memory.chatHistory
				? new N8NBaseChatHistoryAdapter(memory.chatHistory)
				: undefined,
			returnMessages: memory.returnMessages,
			inputKey: memory.inputKey,
			outputKey: memory.outputKey,
		});
	}
	throw new Error('Unsupported memory type');
}

function mapN8nToLcMessage(message: IN8nAiMessage): BaseMessage {
	switch (message.role) {
		case N8nAiMessageRole.Human:
			return new HumanMessage({
				content: message.content,
				name: message.name,
				additional_kwargs: message.additional_kwargs,
				response_metadata: message.metadata,
				id: message.id,
			});
		case N8nAiMessageRole.AI:
			return new AIMessage({
				content: message.content,
				name: message.name,
				additional_kwargs: message.additional_kwargs,
				response_metadata: message.metadata,
				id: message.id,
			});
		case N8nAiMessageRole.System:
			return new SystemMessage({
				content: message.content,
				name: message.name,
				additional_kwargs: message.additional_kwargs,
				response_metadata: message.metadata,
				id: message.id,
			});
		case N8nAiMessageRole.Function: {
			if (!message.name) {
				throw new Error('Function message name is required');
			}
			return new FunctionMessage({
				content: message.content,
				name: message.name,
				additional_kwargs: message.additional_kwargs,
				response_metadata: message.metadata,
				id: message.id,
			});
		}
		case N8nAiMessageRole.Tool: {
			if (!message.tool_call_id) {
				throw new Error('Tool message tool_call_id is required');
			}
			return new ToolMessage({
				content: message.content,
				tool_call_id: message.tool_call_id || '',
				name: message.name,
				additional_kwargs: message.additional_kwargs,
				response_metadata: message.metadata,
			});
		}
		default:
			throw new Error(`Unknown message role: ${message.role}`);
	}
}
export function mapN8nToLcMessages(messages: IN8nAiMessage[]): BaseMessage[] {
	return messages.map(mapN8nToLcMessage);
}

function mapLcToN8nMessage(message: BaseMessage): IN8nAiMessage {
	const data = {
		content:
			typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
		name: message.name,
		additional_kwargs: message.additional_kwargs as IDataObject,
		metadata: message.response_metadata as IDataObject,
		id: message.id,
	};
	switch (message.type) {
		case 'human':
			return {
				role: N8nAiMessageRole.Human,
				...data,
			};
		case 'ai':
			return {
				role: N8nAiMessageRole.AI,
				...data,
			};
		case 'system':
			return {
				role: N8nAiMessageRole.System,
				...data,
			};
		case 'tool':
			return {
				role: N8nAiMessageRole.Tool,
				...data,
			};
		default:
			throw new Error(`Unknown message type: ${message.type}`);
	}
}

export function mapLcToN8nMessages(messages: BaseMessage[]): IN8nAiMessage[] {
	return messages.map(mapLcToN8nMessage);
}

class N8NBaseChatHistoryAdapter extends BaseChatMessageHistory {
	n8nChatHistory: N8NBaseChatMessageHistory;
	lc_namespace = ['n8n', 'chat_history'];

	constructor(n8nChatHistory: N8NBaseChatMessageHistory) {
		super();
		this.n8nChatHistory = n8nChatHistory;
	}
	async getMessages(): Promise<BaseMessage[]> {
		return mapN8nToLcMessages(await this.n8nChatHistory.getMessages());
	}
	async addMessage(message: BaseMessage): Promise<void> {
		await this.n8nChatHistory.addMessage(mapLcToN8nMessage(message));
	}
	async addUserMessage(message: string): Promise<void> {
		await this.addMessage(new HumanMessage(message));
	}
	async addAIMessage(message: string): Promise<void> {
		await this.addMessage(new AIMessage(message));
	}
	async clear(): Promise<void> {
		await this.n8nChatHistory.clear();
	}
}
