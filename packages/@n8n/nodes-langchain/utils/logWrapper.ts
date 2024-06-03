import { NodeOperationError, NodeConnectionType } from 'n8n-workflow';
import type { ConnectionTypes, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { Tool } from '@langchain/core/tools';
import type { BaseMessage } from '@langchain/core/messages';
import type { InputValues, MemoryVariables, OutputValues } from '@langchain/core/memory';
import { BaseChatMessageHistory } from '@langchain/core/chat_history';
import type { BaseCallbackConfig, Callbacks } from '@langchain/core/callbacks/manager';

import { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import type { Document } from '@langchain/core/documents';
import { TextSplitter } from '@langchain/textsplitters';
import { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import { BaseRetriever } from '@langchain/core/retrievers';
import { BaseOutputParser, OutputParserException } from '@langchain/core/output_parsers';
import { isObject } from 'lodash';
import type { BaseDocumentLoader } from 'langchain/dist/document_loaders/base';
import { N8nJsonLoader } from './N8nJsonLoader';
import { N8nBinaryLoader } from './N8nBinaryLoader';
import { logAiEvent } from './helpers';

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
		// Langchain checks for OutputParserException to run retry chain
		// for auto-fixing the output so skip wrapping in this case
		if (e instanceof OutputParserException) throw e;

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
		| BaseChatMemory
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

						const chatHistory = (response?.chat_history as BaseMessage[]) ?? response;

						executeFunctions.addOutputData(connectionType, index, [
							[{ json: { action: 'loadMemoryVariables', chatHistory } }],
						]);
						return response;
					};
				} else if (prop === 'saveContext' && 'saveContext' in target) {
					return async (input: InputValues, output: OutputValues): Promise<MemoryVariables> => {
						connectionType = NodeConnectionType.AiMemory;

						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { action: 'saveContext', input, output } }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [input, output],
						})) as MemoryVariables;

						const chatHistory = await target.chatHistory.getMessages();

						executeFunctions.addOutputData(connectionType, index, [
							[{ json: { action: 'saveContext', chatHistory } }],
						]);

						return response;
					};
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

						const payload = { action: 'getMessages', response };
						executeFunctions.addOutputData(connectionType, index, [[{ json: payload }]]);

						void logAiEvent(executeFunctions, 'n8n.ai.memory.get.messages', { response });
						return response;
					};
				} else if (prop === 'addMessage' && 'addMessage' in target) {
					return async (message: BaseMessage): Promise<void> => {
						connectionType = NodeConnectionType.AiMemory;
						const payload = { action: 'addMessage', message };
						const { index } = executeFunctions.addInputData(connectionType, [[{ json: payload }]]);

						await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [message],
						});

						void logAiEvent(executeFunctions, 'n8n.ai.memory.added.message', { message });
						executeFunctions.addOutputData(connectionType, index, [[{ json: payload }]]);
					};
				}
			}

			// ========== BaseOutputParser ==========
			if (originalInstance instanceof BaseOutputParser) {
				if (prop === 'parse' && 'parse' in target) {
					return async (text: string | Record<string, unknown>): Promise<unknown> => {
						connectionType = NodeConnectionType.AiOutputParser;
						const stringifiedText = isObject(text) ? JSON.stringify(text) : text;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { action: 'parse', text: stringifiedText } }],
						]);

						try {
							const response = (await callMethodAsync.call(target, {
								executeFunctions,
								connectionType,
								currentNodeRunIndex: index,
								method: target[prop],
								arguments: [stringifiedText],
							})) as object;

							void logAiEvent(executeFunctions, 'n8n.ai.output.parser.parsed', { text, response });
							executeFunctions.addOutputData(connectionType, index, [
								[{ json: { action: 'parse', response } }],
							]);
							return response;
						} catch (error) {
							void logAiEvent(executeFunctions, 'n8n.ai.output.parser.parsed', {
								text,
								response: error.message ?? error,
							});
							executeFunctions.addOutputData(connectionType, index, [
								[{ json: { action: 'parse', response: error.message ?? error } }],
							]);
							throw error;
						}
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

						void logAiEvent(executeFunctions, 'n8n.ai.retriever.get.relevant.documents', { query });
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

						void logAiEvent(executeFunctions, 'n8n.ai.embeddings.embedded.document');
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
						void logAiEvent(executeFunctions, 'n8n.ai.embeddings.embedded.query');
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

						void logAiEvent(executeFunctions, 'n8n.ai.document.processed');
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

						void logAiEvent(executeFunctions, 'n8n.ai.text.splitter.split');
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

						void logAiEvent(executeFunctions, 'n8n.ai.tool.called', { query, response });
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

						void logAiEvent(executeFunctions, 'n8n.ai.vector.store.searched', { query });
						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);

						return response;
					};
				}
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return (target as any)[prop];
		},
	});
}
