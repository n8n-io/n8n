/**
 * Adapters to convert LangChain objects to n8n AI interfaces
 *
 * These adapters wrap LangChain components so they implement n8n's
 * framework-agnostic AI interfaces. This allows:
 * 1. Internal nodes to use LangChain but export n8n interfaces
 * 2. Future migration away from LangChain without breaking community nodes
 */

import {
	type BaseChatMemory,
	BufferMemory,
	BufferWindowMemory,
	type InputValues,
	type MemoryVariables,
	type OutputValues,
} from '@langchain/classic/memory';
import { BaseChatMessageHistory } from '@langchain/core/chat_history';
import type { Embeddings } from '@langchain/core/embeddings';
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
	IN8nChatModelConfig,
	IN8nEmbeddings,
	N8NBaseChatMessageHistory,
	N8nMemory,
	N8nSimpleMemory,
} from 'n8n-workflow';
import { isN8nSimpleMemory, N8nAiMessageRole } from 'n8n-workflow';

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
		const lcMessage = mapN8nToLcMessage(response);

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
 * Convert LangChain BaseMessage to n8n message
 */
export function langChainMessageToN8n(message: BaseMessage): IN8nAiMessage {
	const messageType = message._getType();

	let role: N8nAiMessageRole;
	switch (messageType) {
		case 'human':
			role = N8nAiMessageRole.Human;
			break;
		case 'ai':
			role = N8nAiMessageRole.AI;
			break;
		case 'system':
			role = N8nAiMessageRole.System;
			break;
		case 'function':
			role = N8nAiMessageRole.Function;
			break;
		case 'tool':
			role = N8nAiMessageRole.Tool;
			break;
		default:
			role = N8nAiMessageRole.Human;
	}

	return {
		role,
		content:
			typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
		...(message.name && { name: message.name }),
		...(message.additional_kwargs &&
			Object.keys(message.additional_kwargs).length > 0 && {
				additional_kwargs: message.additional_kwargs as IDataObject,
			}),
	};
}

/**
 * Adapter: LangChain ChatModel → n8n IN8nChatModel
 *
 * Wraps a LangChain chat model to expose the n8n interface
 */
export class LangChainChatModelAdapter implements IN8nChatModel {
	constructor(private readonly langchainModel: BaseChatModel) {}

	get modelName(): string {
		return this.langchainModel.getName();
	}

	async invoke(messages: IN8nAiMessage[]): Promise<IN8nAiMessage> {
		const lcMessages = messages.map(mapN8nToLcMessage);
		const response = await this.langchainModel.invoke(lcMessages);
		return langChainMessageToN8n(response);
	}

	async *stream(messages: IN8nAiMessage[]): AsyncIterable<IN8nAiMessage> {
		const lcMessages = messages.map(mapN8nToLcMessage);
		const stream = await this.langchainModel.stream(lcMessages);

		for await (const chunk of stream) {
			yield langChainMessageToN8n(chunk);
		}
	}

	async invokeWithPrompt(prompt: string): Promise<IN8nAiMessage> {
		const messages: IN8nAiMessage[] = [
			{
				role: N8nAiMessageRole.Human,
				content: prompt,
			},
		];
		return await this.invoke(messages);
	}

	get config(): IN8nChatModelConfig {
		return {
			temperature: (this.langchainModel as any).temperature,
			maxTokens: (this.langchainModel as any).maxTokens,
			topP: (this.langchainModel as any).topP,
			streaming: (this.langchainModel as any).streaming,
			stop: (this.langchainModel as any).stop,
		};
	}
}

/**
 * Adapter: LangChain Embeddings → n8n IN8nEmbeddings
 */
export class LangChainEmbeddingsAdapter implements IN8nEmbeddings {
	constructor(private readonly langchainEmbeddings: Embeddings) {}

	get modelName(): string | undefined {
		return (this.langchainEmbeddings as any).modelName;
	}

	get dimensions(): number | undefined {
		return (this.langchainEmbeddings as any).dimensions;
	}

	async embedQuery(text: string): Promise<number[]> {
		return await this.langchainEmbeddings.embedQuery(text);
	}

	async embedDocuments(texts: string[]): Promise<number[][]> {
		return await this.langchainEmbeddings.embedDocuments(texts);
	}
}

/**
 * Convenience function to wrap a LangChain chat model
 */
export function wrapLangChainChatModel(model: BaseChatModel): IN8nChatModel {
	return new LangChainChatModelAdapter(model);
}

/**
 * Convenience function to wrap LangChain embeddings
 */
export function wrapLangChainEmbeddings(embeddings: Embeddings): IN8nEmbeddings {
	return new LangChainEmbeddingsAdapter(embeddings);
}

export function wrapN8nMemory(memory: N8nSimpleMemory | N8nMemory): BaseChatMemory {
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
