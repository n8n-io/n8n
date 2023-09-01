import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { Tool } from 'langchain/tools';
import { BaseChatMessageHistory, BaseMessage, ChatResult, InputValues } from 'langchain/schema';
import { BaseChatModel } from 'langchain/chat_models/base';
import { CallbackManagerForLLMRun } from 'langchain/callbacks';

import { Embeddings } from 'langchain/embeddings';
import { VectorStore, VectorStoreRetriever } from 'langchain/vectorstores/base';
import { Document } from 'langchain/document';
import { TextSplitter } from 'langchain/text_splitter';
import { BaseDocumentLoader } from 'langchain/dist/document_loaders/base';
import { CallbackManagerForRetrieverRun, Callbacks } from 'langchain/dist/callbacks/manager';
import { BaseLLM } from 'langchain/llms/base';
import { N8nJsonLoader } from './N8nJsonLoader';
import { BaseChatMemory } from 'langchain/memory';
import { MemoryVariables } from 'langchain/dist/memory/base';
import { N8nBinaryLoader } from './N8nBinaryLoader';

export function logWrapper(
	originalInstance:
		| Tool
		| BaseChatModel
		| BaseChatMemory
		| BaseLLM
		| BaseChatMessageHistory
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
			// TextSplitter
			if (prop === 'splitText' && 'splitText' in target) {
				return async (text: string): Promise<string[]> => {
					executeFunctions.addInputData('textSplitter', [[{ json: { textSplitter: text } }]]);
					const response = await target[prop](text);
					executeFunctions.addOutputData('textSplitter', [[{ json: { response } }]]);
					return response;
				};
			}
			// Docs -> Embeddings
			if (prop === 'embedDocuments' && 'embedDocuments' in target) {
				return async (documents: string[]): Promise<number[][]> => {
					executeFunctions.addInputData('embedding', [[{ json: { documents: documents } }]]);
					const response = await target[prop](documents);
					executeFunctions.addOutputData('embedding', [[{ json: { response } }]]);
					return response;
				};
			}
			// Query -> Embeddings
			if (prop === 'embedQuery' && 'embedQuery' in target) {
				return async (query: string): Promise<number[]> => {
					executeFunctions.addInputData('embedding', [[{ json: { query: query } }]]);
					const response = await target['embedQuery'](query);
					executeFunctions.addOutputData('embedding', [[{ json: { response } }]]);
					return response;
				};
			}
			// JSON Input -> Documents
			if (prop === 'process' && 'process' in target) {
				return async (items: INodeExecutionData[]): Promise<number[]> => {
					executeFunctions.addInputData('document', [items]);
					const response = await target[prop](items);
					executeFunctions.addOutputData('document', [[{ json: { response } }]]);
					return response as unknown as number[];
				};
			}
			// BaseRetriever
			if (prop === '_getRelevantDocuments' && '_getRelevantDocuments' in target) {
				return async (
					query: string,
					runManager?: CallbackManagerForRetrieverRun,
				): Promise<Document[]> => {
					executeFunctions.addInputData('vectorRetriever', [[{ json: { query } }]]);
					const response = (await target[prop](query, runManager)) as Document[];
					executeFunctions.addOutputData('vectorRetriever', [[{ json: { response } }]]);
					return response;
				};
			}
			if (prop === '_call' && '_call' in target) {
				return async (query: string): Promise<string> => {
					executeFunctions.addInputData('tool', [[{ json: { query } }]]);
					const response = await target[prop](query);
					executeFunctions.addOutputData('tool', [[{ json: { response } }]]);
					return response;
				};

				// For BaseChatMessageHistory
			} else if (prop === 'getMessages' && 'getMessages' in target) {
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
					executeFunctions.addInputData('memory', [[{ json: { action: 'addMessage', message } }]]);
					await target[prop](message);
					executeFunctions.addOutputData('memory', [[{ json: { action: 'addMessage' } }]]);
				};

				// For BaseChatMemory
			} else if (prop === 'loadMemoryVariables' && 'loadMemoryVariables' in target) {
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
				target['chatHistory'].getMessages().then((messages) => {
					executeFunctions.addOutputData('memory', [
						[{ json: { action: 'chatHistory', chatHistory: messages } }],
					]);
				});
				return response;
				// TODO: Is this needed?
				// } else if (prop === 'saveContext' && 'saveContext' in target) {
				// 	return async (inputValues: InputValues, outputValues: OutputValues): Promise<void> => {
				// 		executeFunctions.addInputData('memory', [
				// 			[{ json: { action: 'saveContext', inputValues, outputValues } }],
				// 		]);
				// 		await target[prop](inputValues, outputValues);
				// 		executeFunctions.addOutputData('memory', [[{ json: { action: 'saveContext' } }]]);
				// 	};

				// For BaseChatModel
			} else if (prop === '_generate' && '_generate' in target) {
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
				// Vector Store
			} else if (prop === 'similaritySearch' && 'similaritySearch' in target) {
				return async (
					query: string,
					k?: number,
					// @ts-ignore
					filter?: BiquadFilterType | undefined,
					_callbacks?: Callbacks | undefined,
				): Promise<Document[]> => {
					executeFunctions.addInputData('vectorStore', [[{ json: { query, k, filter } }]]);
					const response = (await target[prop](query, k, filter, _callbacks)) as Document[];
					executeFunctions.addOutputData('vectorStore', [[{ json: { response } }]]);

					return response;
				};
			} else {
				return (target as any)[prop];
			}
		},
	});
}
