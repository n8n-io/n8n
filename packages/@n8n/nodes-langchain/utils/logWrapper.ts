import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { Tool } from 'langchain/tools';
import type { BaseMessage, ChatResult, InputValues } from 'langchain/schema';
import { BaseChatMessageHistory } from 'langchain/schema';
import { BaseChatModel } from 'langchain/chat_models/base';
import type { CallbackManagerForLLMRun } from 'langchain/callbacks';

import { Embeddings } from 'langchain/embeddings/base';
import type { VectorStoreRetriever } from 'langchain/vectorstores/base';
import { VectorStore } from 'langchain/vectorstores/base';
import type { Document } from 'langchain/document';
import { TextSplitter } from 'langchain/text_splitter';
import type { BaseDocumentLoader } from 'langchain/document_loaders/base';
import type { CallbackManagerForRetrieverRun, Callbacks } from 'langchain/dist/callbacks/manager';
import { BaseLLM } from 'langchain/llms/base';
import { BaseChatMemory } from 'langchain/memory';
import type { MemoryVariables } from 'langchain/dist/memory/base';
import { BaseRetriever } from 'langchain/schema/retriever';
import type { FormatInstructionsOptions } from 'langchain/schema/output_parser';
import { BaseOutputParser } from 'langchain/schema/output_parser';
import { N8nJsonLoader } from './N8nJsonLoader';
import type { N8nBinaryLoader } from './N8nBinaryLoader';

export function logWrapper(
	originalInstance:
		| Tool
		| BaseChatModel
		| BaseChatMemory
		| BaseLLM
		| BaseChatMessageHistory
		| BaseOutputParser
		| Embeddings
		| Document[]
		| Document
		| BaseDocumentLoader
		| VectorStoreRetriever
		| TextSplitter
		| VectorStore
		| N8nBinaryLoader
		| N8nJsonLoader,
	executeFunctions: IExecuteFunctions,
) {
	return new Proxy(originalInstance, {
		get: (target, prop) => {
			// ========== BaseChatMemory ==========
			if (originalInstance instanceof BaseChatMemory) {
				if (prop === 'loadMemoryVariables' && 'loadMemoryVariables' in target) {
					return async (values: InputValues): Promise<MemoryVariables> => {
						executeFunctions.addInputData('memory', [
							[{ json: { action: 'loadMemoryVariables', values } }],
						]);
						const response = await target[prop](values);
						executeFunctions.addOutputData('memory', [
							[{ json: { action: 'loadMemoryVariables', response } }],
						]);
						return response;
					};
				} else if (
					prop === 'outputKey' &&
					'outputKey' in target &&
					target.constructor.name === 'BufferWindowMemory'
				) {
					executeFunctions.addInputData('memory', [[{ json: { action: 'chatHistory' } }]]);
					const response = target[prop];

					target.chatHistory
						.getMessages()
						.then((messages) => {
							executeFunctions.addOutputData('memory', [
								[{ json: { action: 'chatHistory', chatHistory: messages } }],
							]);
						})
						.catch((error: Error) => {
							executeFunctions.addOutputData('memory', [
								[{ json: { action: 'chatHistory', error } }],
							]);
						});
					return response;
				}
			}

			// ========== BaseChatMessageHistory ==========
			if (originalInstance instanceof BaseChatMessageHistory) {
				if (prop === 'getMessages' && 'getMessages' in target) {
					return async (): Promise<BaseMessage[]> => {
						executeFunctions.addInputData('memory', [[{ json: { action: 'getMessages' } }]]);
						const response = await target[prop]();
						executeFunctions.addOutputData('memory', [
							[{ json: { action: 'getMessages', response } }],
						]);
						return response;
					};
				} else if (prop === 'addMessage' && 'addMessage' in target) {
					return async (message: BaseMessage): Promise<void> => {
						executeFunctions.addInputData('memory', [
							[{ json: { action: 'addMessage', message } }],
						]);
						await target[prop](message);
						executeFunctions.addOutputData('memory', [[{ json: { action: 'addMessage' } }]]);
					};
				}
			}

			// ========== BaseChatModel ==========
			if (originalInstance instanceof BaseLLM || originalInstance instanceof BaseChatModel) {
				if (prop === '_generate' && '_generate' in target) {
					return async (
						messages: BaseMessage[] & string[],
						options: any,
						runManager?: CallbackManagerForLLMRun,
					): Promise<ChatResult> => {
						executeFunctions.addInputData('languageModel', [[{ json: { messages, options } }]]);
						const response = (await target[prop](messages, options, runManager)) as ChatResult;
						executeFunctions.addOutputData('languageModel', [[{ json: { response } }]]);
						return response;
					};
				}
			}

			// ========== BaseOutputParser ==========
			if (originalInstance instanceof BaseOutputParser) {
				if (prop === 'getFormatInstructions' && 'getFormatInstructions' in target) {
					return (options?: FormatInstructionsOptions): string => {
						executeFunctions.addInputData('outputParser', [
							[{ json: { action: 'getFormatInstructions' } }],
						]);
						const response = target[prop](options);
						executeFunctions.addOutputData('outputParser', [
							[{ json: { action: 'getFormatInstructions', response } }],
						]);
						return response;
					};
				} else if (prop === 'parse' && 'parse' in target) {
					return async (text: string): Promise<any> => {
						executeFunctions.addInputData('outputParser', [[{ json: { action: 'parse', text } }]]);
						const response = (await target[prop](text)) as object;
						executeFunctions.addOutputData('outputParser', [
							[{ json: { action: 'parse', response } }],
						]);
						return response;
					};
				}
			}

			// ========== BaseRetriever ==========
			if (originalInstance instanceof BaseRetriever) {
				if (prop === '_getRelevantDocuments' && '_getRelevantDocuments' in target) {
					return async (
						query: string,
						runManager?: CallbackManagerForRetrieverRun,
					): Promise<Document[]> => {
						executeFunctions.addInputData('vectorRetriever', [[{ json: { query } }]]);
						const response = await target[prop](query, runManager);
						executeFunctions.addOutputData('vectorRetriever', [[{ json: { response } }]]);
						return response;
					};
				}
			}

			// ========== Embeddings ==========
			if (originalInstance instanceof Embeddings) {
				// Docs -> Embeddings
				if (prop === 'embedDocuments' && 'embedDocuments' in target) {
					return async (documents: string[]): Promise<number[][]> => {
						executeFunctions.addInputData('embedding', [[{ json: { documents } }]]);
						const response = await target[prop](documents);
						executeFunctions.addOutputData('embedding', [[{ json: { response } }]]);
						return response;
					};
				}
				// Query -> Embeddings
				if (prop === 'embedQuery' && 'embedQuery' in target) {
					return async (query: string): Promise<number[]> => {
						executeFunctions.addInputData('embedding', [[{ json: { query } }]]);
						const response = await target.embedQuery(query);
						executeFunctions.addOutputData('embedding', [[{ json: { response } }]]);
						return response;
					};
				}
			}

			// ========== N8nJsonLoader ==========
			if (originalInstance instanceof N8nJsonLoader) {
				// JSON Input -> Documents
				if (prop === 'process' && 'process' in target) {
					return async (items: INodeExecutionData[]): Promise<number[]> => {
						executeFunctions.addInputData('document', [items]);
						const response = await target[prop](items);
						executeFunctions.addOutputData('document', [[{ json: { response } }]]);
						return response as unknown as number[];
					};
				}
			}

			// ========== TextSplitter ==========
			if (originalInstance instanceof TextSplitter) {
				if (prop === 'splitText' && 'splitText' in target) {
					return async (text: string): Promise<string[]> => {
						executeFunctions.addInputData('textSplitter', [[{ json: { textSplitter: text } }]]);
						const response = await target[prop](text);
						executeFunctions.addOutputData('textSplitter', [[{ json: { response } }]]);
						return response;
					};
				}
			}

			// ========== Tool ==========
			if (originalInstance instanceof Tool) {
				if (prop === '_call' && '_call' in target) {
					return async (query: string): Promise<string> => {
						executeFunctions.addInputData('tool', [[{ json: { query } }]]);
						const response = await target[prop](query);
						executeFunctions.addOutputData('tool', [[{ json: { response } }]]);
						return response;
					};
				}
			}

			// ========== VectorStore ==========
			if (originalInstance instanceof VectorStore) {
				if (prop === 'similaritySearch' && 'similaritySearch' in target) {
					return async (
						query: string,
						k?: number,
						// @ts-ignore
						filter?: BiquadFilterType | undefined,
						_callbacks?: Callbacks | undefined,
					): Promise<Document[]> => {
						executeFunctions.addInputData('vectorStore', [[{ json: { query, k, filter } }]]);
						const response = await target[prop](query, k, filter, _callbacks);
						executeFunctions.addOutputData('vectorStore', [[{ json: { response } }]]);

						return response;
					};
				}
			}

			return (target as any)[prop];
		},
	});
}
