/**
 * Adapters to convert LangChain objects to n8n AI interfaces
 *
 * These adapters wrap LangChain components so they implement n8n's
 * framework-agnostic AI interfaces. This allows:
 * 1. Internal nodes to use LangChain but export n8n interfaces
 * 2. Future migration away from LangChain without breaking community nodes
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import {
	AIMessage,
	HumanMessage,
	SystemMessage,
	FunctionMessage,
	ToolMessage,
} from '@langchain/core/messages';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore, Document as LangChainDocument } from '@langchain/core/vectorstores';
import type { Tool as LangChainTool, StructuredTool } from '@langchain/core/tools';
import type {
	IN8nChatModel,
	IN8nEmbeddings,
	IN8nVectorStore,
	IN8nTool,
	IN8nAiMessage,
	IN8nDocument,
	IN8nToolParameter,
	IN8nChatModelConfig,
	IN8nDocumentWithScore,
} from 'n8n-workflow';
import { N8nAiMessageRole } from 'n8n-workflow';
import type { IDataObject } from 'n8n-workflow';
import type { ZodObject, ZodTypeAny } from 'zod';
import { ZodBoolean, ZodNumber, ZodObject as ZodObjectType, ZodOptional, ZodNullable } from 'zod';

/**
 * Convert n8n message to LangChain BaseMessage
 */
export function n8nMessageToLangChain(message: IN8nAiMessage): BaseMessage {
	const { role, content, name, additional_kwargs } = message;

	const baseConfig = {
		content,
		...(name && { name }),
		...(additional_kwargs && { additional_kwargs }),
	};

	switch (role) {
		case N8nAiMessageRole.Human:
			return new HumanMessage(baseConfig);
		case N8nAiMessageRole.AI:
			return new AIMessage(baseConfig);
		case N8nAiMessageRole.System:
			return new SystemMessage(baseConfig);
		case N8nAiMessageRole.Function:
			return new FunctionMessage(baseConfig);
		case N8nAiMessageRole.Tool:
			return new ToolMessage(baseConfig);
		default:
			// Fallback to human message for unknown roles
			return new HumanMessage(baseConfig);
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
		const lcMessages = messages.map(n8nMessageToLangChain);
		const response = await this.langchainModel.invoke(lcMessages);
		return langChainMessageToN8n(response);
	}

	async *stream(messages: IN8nAiMessage[]): AsyncIterable<IN8nAiMessage> {
		const lcMessages = messages.map(n8nMessageToLangChain);
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
 * Convert n8n document to LangChain document
 */
function n8nDocumentToLangChain(doc: IN8nDocument): LangChainDocument {
	return {
		pageContent: doc.content,
		metadata: doc.metadata || {},
		...(doc.id && { id: doc.id }),
	};
}

/**
 * Convert LangChain document to n8n document
 */
function langChainDocumentToN8n(doc: LangChainDocument): IN8nDocument {
	return {
		content: doc.pageContent,
		metadata: doc.metadata as IDataObject,
		...(doc.id && { id: doc.id }),
	};
}

/**
 * Adapter: LangChain VectorStore → n8n IN8nVectorStore
 */
export class LangChainVectorStoreAdapter implements IN8nVectorStore {
	constructor(
		private readonly langchainStore: VectorStore,
		public readonly storeType: string,
	) {}

	async addDocuments(documents: IN8nDocument[]): Promise<string[]> {
		const lcDocs = documents.map(n8nDocumentToLangChain);
		const ids = await this.langchainStore.addDocuments(lcDocs);
		return ids || [];
	}

	async similaritySearch(
		query: string,
		k: number = 4,
		filter?: IDataObject,
	): Promise<IN8nDocument[]> {
		const results = await this.langchainStore.similaritySearch(query, k, filter);
		return results.map(langChainDocumentToN8n);
	}

	async similaritySearchWithScore(
		query: string,
		k: number = 4,
		filter?: IDataObject,
	): Promise<IN8nDocumentWithScore[]> {
		if ('similaritySearchWithScore' in this.langchainStore) {
			const results = await this.langchainStore.similaritySearchWithScore(query, k, filter);
			return results.map(([doc, score]) => ({
				...langChainDocumentToN8n(doc),
				score,
			}));
		}

		// Fallback: use regular search and assign score 0
		const results = await this.similaritySearch(query, k, filter);
		return results.map((doc) => ({ ...doc, score: 0 }));
	}

	async delete(ids: string[]): Promise<void> {
		if ('delete' in this.langchainStore && typeof this.langchainStore.delete === 'function') {
			await this.langchainStore.delete({ ids });
		}
	}
}

/**
 * Helper to extract Zod type information
 */
function getZodType(schema: ZodTypeAny): string {
	if (schema instanceof ZodObjectType) {
		return 'object';
	} else if (schema instanceof ZodNumber) {
		return 'number';
	} else if (schema instanceof ZodBoolean) {
		return 'boolean';
	} else if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
		return getZodType(schema.unwrap());
	}

	// Check constructor name for array types
	const typeName = schema.constructor.name.toLowerCase();
	if (typeName.includes('array')) return 'array';

	return 'string';
}

/**
 * Convert Zod schema to n8n tool parameters
 */
function zodSchemaToN8nParameters(zodSchema: ZodObject<any>): IN8nToolParameter[] {
	const shape = zodSchema.shape;
	const parameters: IN8nToolParameter[] = [];

	for (const [name, schema] of Object.entries<ZodTypeAny>(shape)) {
		const param: IN8nToolParameter = {
			name,
			type: getZodType(schema) as any,
			description: schema.description || `Parameter: ${name}`,
			required: !schema.isOptional(),
		};

		// Extract default value if available
		if ('_def' in schema && 'defaultValue' in (schema as any)._def) {
			param.default = (schema as any)._def.defaultValue();
		}

		parameters.push(param);
	}

	return parameters;
}

/**
 * Adapter: LangChain Tool → n8n IN8nTool
 */
export class LangChainToolAdapter implements IN8nTool {
	constructor(private readonly langchainTool: LangChainTool | StructuredTool<any>) {}

	get name(): string {
		return this.langchainTool.name;
	}

	get description(): string {
		return this.langchainTool.description;
	}

	get schema() {
		// Check if it's a StructuredTool with a Zod schema
		const tool = this.langchainTool as any;
		if (tool.schema && typeof tool.schema === 'object' && 'shape' in tool.schema) {
			const parameters = zodSchemaToN8nParameters(tool.schema as ZodObject<any>);
			return { parameters };
		}

		// Fallback: no parameters
		return { parameters: [] };
	}

	get returnsDirect(): boolean | undefined {
		return (this.langchainTool as any).returnDirect;
	}

	async call(input: IDataObject): Promise<string> {
		const result = await this.langchainTool.invoke(input);
		return typeof result === 'string' ? result : JSON.stringify(result);
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

/**
 * Convenience function to wrap a LangChain vector store
 */
export function wrapLangChainVectorStore(store: VectorStore, storeType: string): IN8nVectorStore {
	return new LangChainVectorStoreAdapter(store, storeType);
}

/**
 * Convenience function to wrap a LangChain tool
 */
export function wrapLangChainTool(tool: LangChainTool | StructuredTool<any>): IN8nTool {
	return new LangChainToolAdapter(tool);
}
