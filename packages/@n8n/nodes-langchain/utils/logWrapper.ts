import {
	NodeOperationError,
	type ConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionType,
} from 'n8n-workflow';

import { Tool } from 'langchain/tools';
import type { BaseMessage, ChatResult, InputValues } from 'langchain/schema';
import { BaseChatMessageHistory } from 'langchain/schema';
import { BaseChatModel } from 'langchain/chat_models/base';
import type { CallbackManagerForLLMRun } from 'langchain/callbacks';

import { Embeddings } from 'langchain/embeddings/base';
import { VectorStore } from 'langchain/vectorstores/base';
import type { Document } from 'langchain/document';
import { TextSplitter } from 'langchain/text_splitter';
import type { BaseDocumentLoader } from 'langchain/document_loaders/base';
import type { BaseCallbackConfig, Callbacks } from 'langchain/dist/callbacks/manager';
import { BaseLLM } from 'langchain/llms/base';
import { BaseChatMemory } from 'langchain/memory';
import type { MemoryVariables } from 'langchain/dist/memory/base';
import { BaseRetriever } from 'langchain/schema/retriever';
import type { FormatInstructionsOptions } from 'langchain/schema/output_parser';
import { BaseOutputParser } from 'langchain/schema/output_parser';
import { isObject } from 'lodash';
import { N8nJsonLoader } from './N8nJsonLoader';
import { N8nBinaryLoader } from './N8nBinaryLoader';
import { isChatInstance } from './helpers';

const errorsMap: { [key: string]: { message: string; description: string } } = {
	'You exceeded your current quota, please check your plan and billing details.': {
		message: 'OpenAI quota exceeded',
		description: 'You exceeded your current quota, please check your plan and billing details.',
	},
};

export async function callMethodAsync<T>(
	this: T,
	parameters: {
		executeFunctions: IExecuteFunctions;
		connectionType: ConnectionTypes;
		currentNodeRunIndex: number;
		method: (...args: any[]) => Promise<unknown>;
		arguments: unknown[];
	},
): Promise<unknown> {
	try {
		return await parameters.method.call(this, ...parameters.arguments);
	} catch (e) {
		// Propagate errors from sub-nodes
		if (e.functionality === 'configuration-node') throw e;
		const connectedNode = parameters.executeFunctions.getNode();

		const error = new NodeOperationError(connectedNode, e, {
			functionality: 'configuration-node',
		});

		if (errorsMap[error.message]) {
			error.description = errorsMap[error.message].description;
			error.message = errorsMap[error.message].message;
		}

		parameters.executeFunctions.addOutputData(
			parameters.connectionType,
			parameters.currentNodeRunIndex,
			error,
		);
		if (error.message) {
			error.description = error.message;
			throw error;
		}
		throw new NodeOperationError(
			connectedNode,
			`Error on node "${connectedNode.name}" which is connected via input "${parameters.connectionType}"`,
			{ functionality: 'configuration-node' },
		);
	}
}

export function callMethodSync<T>(
	this: T,
	parameters: {
		executeFunctions: IExecuteFunctions;
		connectionType: ConnectionTypes;
		currentNodeRunIndex: number;
		method: (...args: any[]) => T;
		arguments: unknown[];
	},
): unknown {
	try {
		return parameters.method.call(this, ...parameters.arguments);
	} catch (e) {
		// Propagate errors from sub-nodes
		if (e.functionality === 'configuration-node') throw e;
		const connectedNode = parameters.executeFunctions.getNode();
		const error = new NodeOperationError(connectedNode, e);
		parameters.executeFunctions.addOutputData(
			parameters.connectionType,
			parameters.currentNodeRunIndex,
			error,
		);
		throw new NodeOperationError(
			connectedNode,
			`Error on node "${connectedNode.name}" which is connected via input "${parameters.connectionType}"`,
			{ functionality: 'configuration-node' },
		);
	}
}

export function logWrapper(
	originalInstance:
		| Tool
		| BaseChatModel
		| BaseChatMemory
		| BaseLLM
		| BaseChatMessageHistory
		| BaseOutputParser
		| BaseRetriever
		| Embeddings
		| Document[]
		| Document
		| BaseDocumentLoader
		| TextSplitter
		| VectorStore
		| N8nBinaryLoader
		| N8nJsonLoader,
	executeFunctions: IExecuteFunctions,
) {
	return new Proxy(originalInstance, {
		get: (target, prop) => {
			let connectionType: ConnectionTypes | undefined;
			// ========== BaseChatMemory ==========
			if (originalInstance instanceof BaseChatMemory) {
				if (prop === 'loadMemoryVariables' && 'loadMemoryVariables' in target) {
					return async (values: InputValues): Promise<MemoryVariables> => {
						connectionType = NodeConnectionType.AiMemory;

						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { action: 'loadMemoryVariables', values } }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [values],
						})) as MemoryVariables;

						executeFunctions.addOutputData(connectionType, index, [
							[{ json: { action: 'loadMemoryVariables', response } }],
						]);
						return response;
					};
				} else if (
					prop === 'outputKey' &&
					'outputKey' in target &&
					target.constructor.name === 'BufferWindowMemory'
				) {
					connectionType = NodeConnectionType.AiMemory;
					const { index } = executeFunctions.addInputData(connectionType, [
						[{ json: { action: 'chatHistory' } }],
					]);
					const response = target[prop];

					target.chatHistory
						.getMessages()
						.then((messages) => {
							executeFunctions.addOutputData(NodeConnectionType.AiMemory, index, [
								[{ json: { action: 'chatHistory', chatHistory: messages } }],
							]);
						})
						.catch((error: Error) => {
							executeFunctions.addOutputData(NodeConnectionType.AiMemory, index, [
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
						connectionType = NodeConnectionType.AiMemory;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { action: 'getMessages' } }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [],
						})) as BaseMessage[];

						executeFunctions.addOutputData(connectionType, index, [
							[{ json: { action: 'getMessages', response } }],
						]);
						return response;
					};
				} else if (prop === 'addMessage' && 'addMessage' in target) {
					return async (message: BaseMessage): Promise<void> => {
						connectionType = NodeConnectionType.AiMemory;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { action: 'addMessage', message } }],
						]);

						await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [message],
						});

						executeFunctions.addOutputData(connectionType, index, [
							[{ json: { action: 'addMessage' } }],
						]);
					};
				}
			}

			// ========== BaseChatModel ==========
			if (originalInstance instanceof BaseLLM || isChatInstance(originalInstance)) {
				if (prop === '_generate' && '_generate' in target) {
					return async (
						messages: BaseMessage[] & string[],
						options: any,
						runManager?: CallbackManagerForLLMRun,
					): Promise<ChatResult> => {
						connectionType = NodeConnectionType.AiLanguageModel;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { messages, options } }],
						]);

						try {
							const response = (await callMethodAsync.call(target, {
								executeFunctions,
								connectionType,
								currentNodeRunIndex: index,
								method: target[prop],
								arguments: [
									messages,
									{ ...options, signal: executeFunctions.getExecutionCancelSignal() },
									runManager,
								],
							})) as ChatResult;
							executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);
							return response;
						} catch (error) {
							// Mute AbortError as they are expected
							if (error?.name === 'AbortError') return { generations: [] };
							throw error;
						}
					};
				}
			}

			// ========== BaseOutputParser ==========
			if (originalInstance instanceof BaseOutputParser) {
				if (prop === 'getFormatInstructions' && 'getFormatInstructions' in target) {
					return (options?: FormatInstructionsOptions): string => {
						connectionType = NodeConnectionType.AiOutputParser;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { action: 'getFormatInstructions' } }],
						]);

						// @ts-ignore
						const response = callMethodSync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [options],
						}) as string;

						executeFunctions.addOutputData(connectionType, index, [
							[{ json: { action: 'getFormatInstructions', response } }],
						]);
						return response;
					};
				} else if (prop === 'parse' && 'parse' in target) {
					return async (text: string | Record<string, unknown>): Promise<unknown> => {
						connectionType = NodeConnectionType.AiOutputParser;
						const stringifiedText = isObject(text) ? JSON.stringify(text) : text;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { action: 'parse', text: stringifiedText } }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [stringifiedText],
						})) as object;

						executeFunctions.addOutputData(connectionType, index, [
							[{ json: { action: 'parse', response } }],
						]);
						return response;
					};
				}
			}

			// ========== BaseRetriever ==========
			if (originalInstance instanceof BaseRetriever) {
				if (prop === 'getRelevantDocuments' && 'getRelevantDocuments' in target) {
					return async (
						query: string,
						config?: Callbacks | BaseCallbackConfig,
					): Promise<Document[]> => {
						connectionType = NodeConnectionType.AiRetriever;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { query, config } }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [query, config],
						})) as Array<Document<Record<string, any>>>;

						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);
						return response;
					};
				}
			}

			// ========== Embeddings ==========
			if (originalInstance instanceof Embeddings) {
				// Docs -> Embeddings
				if (prop === 'embedDocuments' && 'embedDocuments' in target) {
					return async (documents: string[]): Promise<number[][]> => {
						connectionType = NodeConnectionType.AiEmbedding;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { documents } }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [documents],
						})) as number[][];

						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);
						return response;
					};
				}
				// Query -> Embeddings
				if (prop === 'embedQuery' && 'embedQuery' in target) {
					return async (query: string): Promise<number[]> => {
						connectionType = NodeConnectionType.AiEmbedding;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { query } }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [query],
						})) as number[];

						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);
						return response;
					};
				}
			}

			// ========== N8n Loaders Process All ==========
			if (
				originalInstance instanceof N8nJsonLoader ||
				originalInstance instanceof N8nBinaryLoader
			) {
				// Process All
				if (prop === 'processAll' && 'processAll' in target) {
					return async (items: INodeExecutionData[]): Promise<number[]> => {
						connectionType = NodeConnectionType.AiDocument;
						const { index } = executeFunctions.addInputData(connectionType, [items]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [items],
						})) as number[];

						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);
						return response;
					};
				}
				// Process Each
				if (prop === 'processItem' && 'processItem' in target) {
					return async (item: INodeExecutionData, itemIndex: number): Promise<number[]> => {
						connectionType = NodeConnectionType.AiDocument;
						const { index } = executeFunctions.addInputData(connectionType, [[item]]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [item, itemIndex],
						})) as number[];

						executeFunctions.addOutputData(connectionType, index, [
							[{ json: { response }, pairedItem: { item: itemIndex } }],
						]);
						return response;
					};
				}
			}

			// ========== TextSplitter ==========
			if (originalInstance instanceof TextSplitter) {
				if (prop === 'splitText' && 'splitText' in target) {
					return async (text: string): Promise<string[]> => {
						connectionType = NodeConnectionType.AiTextSplitter;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { textSplitter: text } }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [text],
						})) as string[];

						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);
						return response;
					};
				}
			}

			// ========== Tool ==========
			if (originalInstance instanceof Tool) {
				if (prop === '_call' && '_call' in target) {
					return async (query: string): Promise<string> => {
						connectionType = NodeConnectionType.AiTool;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { query } }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [query],
						})) as string;

						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);
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
						connectionType = NodeConnectionType.AiVectorStore;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { query, k, filter } }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [query, k, filter, _callbacks],
						})) as Array<Document<Record<string, any>>>;

						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);

						return response;
					};
				}
			}

			return (target as any)[prop];
		},
	});
}
