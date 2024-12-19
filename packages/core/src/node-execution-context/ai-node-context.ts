import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import type { Embeddings } from '@langchain/core/embeddings';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { BaseRetriever } from '@langchain/core/retrievers';
import type { Tool } from '@langchain/core/tools';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { TextSplitter } from '@langchain/textsplitters';
import type { StructuredOutputParser } from 'langchain/output_parsers';
import type {
	AiNodeFunctions,
	IExecuteFunctions,
	IWebhookFunctions,
	OutputParserType,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

/** Context Class for AI-related node execution functions */
export class AiNodeContext implements AiNodeFunctions {
	constructor(
		readonly rootContext: IExecuteFunctions | IWebhookFunctions,
		readonly parentContext?: AiNodeContext,
	) {}

	async getModel(itemIndex = 0): Promise<BaseLanguageModel> {
		return (await this.rootContext.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			itemIndex,
		)) as BaseLanguageModel;
	}

	async getMemory(itemIndex = 0): Promise<BaseChatMemory> {
		return (await this.rootContext.getInputConnectionData(
			NodeConnectionType.AiMemory,
			itemIndex,
		)) as BaseChatMemory;
	}

	async getRetriever(itemIndex = 0): Promise<BaseRetriever> {
		return (await this.rootContext.getInputConnectionData(
			NodeConnectionType.AiRetriever,
			itemIndex,
		)) as BaseRetriever;
	}

	async getDocument<T>(itemIndex = 0): Promise<T> {
		return (await this.rootContext.getInputConnectionData(
			NodeConnectionType.AiDocument,
			itemIndex,
		)) as T;
	}

	async getTextSplitter(itemIndex = 0): Promise<TextSplitter | undefined> {
		return (await this.rootContext.getInputConnectionData(
			NodeConnectionType.AiTextSplitter,
			itemIndex,
		)) as TextSplitter | undefined;
	}

	async getEmbeddings(itemIndex = 0): Promise<Embeddings> {
		return (await this.rootContext.getInputConnectionData(
			NodeConnectionType.AiEmbedding,
			itemIndex,
		)) as Embeddings;
	}

	async getStructuredOutputParser(
		itemIndex = 0,
	): Promise<StructuredOutputParser<OutputParserType>> {
		return (await this.rootContext.getInputConnectionData(
			NodeConnectionType.AiOutputParser,
			itemIndex,
		)) as StructuredOutputParser<OutputParserType>;
	}

	async getVectorStore(itemIndex = 0): Promise<VectorStore> {
		return (await this.rootContext.getInputConnectionData(
			NodeConnectionType.AiVectorStore,
			itemIndex,
		)) as VectorStore;
	}

	async getTools(itemIndex = 0): Promise<Tool[]> {
		return (await this.rootContext.getInputConnectionData(
			NodeConnectionType.AiTool,
			itemIndex,
		)) as Tool[];
	}
}
