import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import type { BaseCallbackConfig, Callbacks } from '@langchain/core/callbacks/manager';
import type { BaseChatMessageHistory } from '@langchain/core/chat_history';
import type { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import type { InputValues, MemoryVariables, OutputValues } from '@langchain/core/memory';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage } from '@langchain/core/messages';
import { BaseRetriever } from '@langchain/core/retrievers';
import { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import type { StructuredTool, Tool } from '@langchain/core/tools';
import { VectorStore } from '@langchain/core/vectorstores';
import { TextSplitter } from '@langchain/textsplitters';
import type { BaseDocumentLoader } from 'langchain/dist/document_loaders/base';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	ISupplyDataFunctions,
	ITaskMetadata,
	NodeConnectionType,
} from 'n8n-workflow';
import {
	NodeOperationError,
	NodeConnectionTypes,
	parseErrorMetadata,
	deepCopy,
} from 'n8n-workflow';

import { logAiEvent, isToolsInstance, isBaseChatMemory, isBaseChatMessageHistory } from './helpers';
import { N8nBinaryLoader } from './N8nBinaryLoader';
import { N8nJsonLoader } from './N8nJsonLoader';

export async function callMethodAsync<T>(
	this: T,
	parameters: {
		executeFunctions: IExecuteFunctions | ISupplyDataFunctions;
		connectionType: NodeConnectionType;
		currentNodeRunIndex: number;
		method: (...args: any[]) => Promise<unknown>;
		arguments: unknown[];
	},
): Promise<unknown> {
	try {
		return await parameters.method.call(this, ...parameters.arguments);
	} catch (e) {
		const connectedNode = parameters.executeFunctions.getNode();

		const error = new NodeOperationError(connectedNode, e, {
			functionality: 'configuration-node',
		});

		const metadata = parseErrorMetadata(error);
		parameters.executeFunctions.addOutputData(
			parameters.connectionType,
			parameters.currentNodeRunIndex,
			error,
			metadata,
		);

		if (error.message) {
			if (!error.description) {
				error.description = error.message;
			}
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
		connectionType: NodeConnectionType;
		currentNodeRunIndex: number;
		method: (...args: any[]) => T;
		arguments: unknown[];
	},
): unknown {
	try {
		return parameters.method.call(this, ...parameters.arguments);
	} catch (e) {
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

export function logWrapper<
	T extends
		| Tool
		| StructuredTool
		| BaseChatMemory
		| BaseChatMessageHistory
		| BaseRetriever
		| BaseDocumentCompressor
		| Embeddings
		| Document[]
		| Document
		| BaseDocumentLoader
		| TextSplitter
		| VectorStore
		| N8nBinaryLoader
		| N8nJsonLoader,
>(originalInstance: T, executeFunctions: IExecuteFunctions | ISupplyDataFunctions): T {
	return new Proxy(originalInstance, {
		get: (target, prop) => {
			let connectionType: NodeConnectionType | undefined;
			// ========== BaseChatMemory ==========
			if (isBaseChatMemory(originalInstance)) {
				if (prop === 'loadMemoryVariables' && 'loadMemoryVariables' in target) {
					return async (values: InputValues): Promise<MemoryVariables> => {
						connectionType = NodeConnectionTypes.AiMemory;

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
						connectionType = NodeConnectionTypes.AiMemory;

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
			if (isBaseChatMessageHistory(originalInstance)) {
				if (prop === 'getMessages' && 'getMessages' in target) {
					return async (): Promise<BaseMessage[]> => {
						connectionType = NodeConnectionTypes.AiMemory;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { action: 'getMessages' } }],
						]);

						let response: BaseMessage[];
						try {
							response = (await callMethodAsync.call(target, {
								executeFunctions,
								connectionType,
								currentNodeRunIndex: index,
								method: target[prop],
								arguments: [],
							})) as BaseMessage[];
						} catch (error) {
							// If the original method fails due to data issues, try to fix them directly

							// Call the original method directly and try to handle the error
							try {
								response = await (target[prop] as () => Promise<BaseMessage[]>)();
							} catch (innerError) {
								// If we still can't get messages, return empty array
								response = [];
							}
						}

						// Apply message validation to fix any remaining issues
						if (Array.isArray(response)) {
							response = response.map((message) => {
								// Skip null or undefined messages
								if (!message || typeof message._getType !== 'function') {
									return message;
								}

								if (message._getType() === 'human') {
									const humanMessage = message as HumanMessage;

									// Check if we need to fix the message
									if (
										humanMessage.content === undefined ||
										humanMessage.content === null ||
										!humanMessage.additional_kwargs
									) {
										// Extract content from messages array if needed
										let content: string | any[] = humanMessage.content;
										if (
											(content === undefined || content === null) &&
											'messages' in humanMessage &&
											Array.isArray((humanMessage as any).messages)
										) {
											const messages = (humanMessage as any).messages;
											if (messages.length > 0) {
												const textContent = messages
													.filter((msg: any) => msg && (typeof msg === 'string' || msg.text))
													.map((msg: any) => (typeof msg === 'string' ? msg : msg.text))
													.join(' ')
													.trim();
												content = textContent || '';
											} else {
												content = '';
											}
										}

										// Create a new HumanMessage with proper content
										return new HumanMessage({
											content: content || '',
											additional_kwargs: humanMessage.additional_kwargs || {},
										});
									}
								}

								return message;
							});
						}

						const payload = { action: 'getMessages', response };
						executeFunctions.addOutputData(connectionType, index, [[{ json: payload }]]);

						logAiEvent(executeFunctions, 'ai-messages-retrieved-from-memory', { response });
						return response;
					};
				} else if (prop === 'addMessage' && 'addMessage' in target) {
					return async (message: BaseMessage): Promise<void> => {
						connectionType = NodeConnectionTypes.AiMemory;

						// Fix HumanMessage content issues before saving to memory
						let fixedMessage = message;
						if (
							message &&
							typeof message._getType === 'function' &&
							message._getType() === 'human'
						) {
							const humanMessage = message as HumanMessage;

							// Try to extract content from various possible locations
							let content = humanMessage.content;

							// If content is undefined, try to find it in lc_kwargs or other locations
							if (content === undefined || content === null) {
								const messageAny = humanMessage as any;

								// Check lc_kwargs array for content - this might be a conversation array
								if (messageAny.lc_kwargs && Array.isArray(messageAny.lc_kwargs)) {
									// Look for the actual user message in the conversation array
									const userMessages = messageAny.lc_kwargs.filter(
										(item: any) => item && typeof item === 'object' && item.role === 'user',
									);

									if (userMessages.length > 0) {
										// Get the last user message (most recent)
										const lastUserMessage = userMessages[userMessages.length - 1];
										content = lastUserMessage.content;
									} else {
										// Fallback: look for any content in the array
										for (const kwarg of messageAny.lc_kwargs) {
											if (kwarg && typeof kwarg === 'object') {
												if (kwarg.content !== undefined && kwarg.role !== 'system') {
													content = kwarg.content;
													break;
												}
												if (kwarg.messages && Array.isArray(kwarg.messages)) {
													// Extract text from messages array
													const textContent = kwarg.messages
														.filter((msg: any) => msg && (typeof msg === 'string' || msg.text))
														.map((msg: any) => (typeof msg === 'string' ? msg : msg.text))
														.join(' ')
														.trim();
													if (textContent) {
														content = textContent;
														break;
													}
												}
											}
										}
									}
								}

								// Check if there's a messages property directly on the object
								if (
									(content === undefined || content === null) &&
									messageAny.messages &&
									Array.isArray(messageAny.messages)
								) {
									const textContent = messageAny.messages
										.filter((msg: any) => msg && (typeof msg === 'string' || msg.text))
										.map((msg: any) => (typeof msg === 'string' ? msg : msg.text))
										.join(' ')
										.trim();
									if (textContent) {
										content = textContent;
									}
								}

								// If still no content, default to empty string
								if (content === undefined || content === null) {
									content = '';
								}
							}

							const additional_kwargs = humanMessage.additional_kwargs || {};

							// Only create a new message if we found content or need to fix kwargs
							if (humanMessage.content !== content || !humanMessage.additional_kwargs) {
								// Create a new message with the recovered content
								fixedMessage = new HumanMessage({
									content,
									additional_kwargs,
								});
							}
							// If no issues, keep the original message unchanged
						}

						const payload = { action: 'addMessage', message: fixedMessage };
						const { index } = executeFunctions.addInputData(connectionType, [[{ json: payload }]]);

						await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [fixedMessage],
						});

						logAiEvent(executeFunctions, 'ai-message-added-to-memory', { message: fixedMessage });
						executeFunctions.addOutputData(connectionType, index, [[{ json: payload }]]);
					};
				} else if (prop === 'addUserMessage' && 'addUserMessage' in target) {
					return async (content: string): Promise<void> => {
						connectionType = NodeConnectionTypes.AiMemory;

						// Create a properly formatted HumanMessage
						const fixedMessage = new HumanMessage({
							content: content || '',
							additional_kwargs: {},
						});

						const payload = { action: 'addUserMessage', message: fixedMessage };
						const { index } = executeFunctions.addInputData(connectionType, [[{ json: payload }]]);

						await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [content],
						});

						logAiEvent(executeFunctions, 'ai-message-added-to-memory', { content });
						executeFunctions.addOutputData(connectionType, index, [[{ json: payload }]]);
					};
				} else if (prop === 'addAIMessage' && 'addAIMessage' in target) {
					return async (content: string): Promise<void> => {
						connectionType = NodeConnectionTypes.AiMemory;

						const payload = { action: 'addAIMessage', content };
						const { index } = executeFunctions.addInputData(connectionType, [[{ json: payload }]]);

						await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop] as (...args: any[]) => Promise<unknown>,
							arguments: [content],
						});

						logAiEvent(executeFunctions, 'ai-message-added-to-memory', { content });
						executeFunctions.addOutputData(connectionType, index, [[{ json: payload }]]);
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
						connectionType = NodeConnectionTypes.AiRetriever;
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

						const executionId: string | undefined = response[0]?.metadata?.executionId as string;
						const workflowId: string | undefined = response[0]?.metadata?.workflowId as string;

						const metadata: ITaskMetadata = {};
						if (executionId && workflowId) {
							metadata.subExecution = {
								executionId,
								workflowId,
							};
						}

						logAiEvent(executeFunctions, 'ai-documents-retrieved', { query });
						executeFunctions.addOutputData(
							connectionType,
							index,
							[[{ json: { response } }]],
							metadata,
						);
						return response;
					};
				}
			}

			// ========== Embeddings ==========
			if (originalInstance instanceof Embeddings) {
				// Docs -> Embeddings
				if (prop === 'embedDocuments' && 'embedDocuments' in target) {
					return async (documents: string[]): Promise<number[][]> => {
						connectionType = NodeConnectionTypes.AiEmbedding;
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

						logAiEvent(executeFunctions, 'ai-document-embedded');
						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);
						return response;
					};
				}
				// Query -> Embeddings
				if (prop === 'embedQuery' && 'embedQuery' in target) {
					return async (query: string): Promise<number[]> => {
						connectionType = NodeConnectionTypes.AiEmbedding;
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
						logAiEvent(executeFunctions, 'ai-query-embedded');
						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);
						return response;
					};
				}
			}

			// ========== Rerankers ==========
			if (originalInstance instanceof BaseDocumentCompressor) {
				if (prop === 'compressDocuments' && 'compressDocuments' in target) {
					return async (documents: Document[], query: string): Promise<Document[]> => {
						connectionType = NodeConnectionTypes.AiReranker;
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: { query, documents } }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							// compressDocuments mutates the original object
							// messing up the input data logging
							arguments: [deepCopy(documents), query],
						})) as Document[];

						logAiEvent(executeFunctions, 'ai-document-reranked', { query });
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
						connectionType = NodeConnectionTypes.AiDocument;
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
						connectionType = NodeConnectionTypes.AiDocument;
						const { index } = executeFunctions.addInputData(connectionType, [[item]]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [item, itemIndex],
						})) as number[];

						logAiEvent(executeFunctions, 'ai-document-processed');
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
						connectionType = NodeConnectionTypes.AiTextSplitter;
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

						logAiEvent(executeFunctions, 'ai-text-split');
						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);
						return response;
					};
				}
			}

			// ========== Tool ==========
			if (isToolsInstance(originalInstance)) {
				if (prop === '_call' && '_call' in target) {
					return async (query: string): Promise<string> => {
						connectionType = NodeConnectionTypes.AiTool;
						const inputData: IDataObject = { query };

						if (target.metadata?.isFromToolkit) {
							inputData.tool = {
								name: target.name,
								description: target.description,
							};
						}
						const { index } = executeFunctions.addInputData(connectionType, [
							[{ json: inputData }],
						]);

						const response = (await callMethodAsync.call(target, {
							executeFunctions,
							connectionType,
							currentNodeRunIndex: index,
							method: target[prop],
							arguments: [query],
						})) as string;

						logAiEvent(executeFunctions, 'ai-tool-called', { ...inputData, response });
						executeFunctions.addOutputData(connectionType, index, [[{ json: { response } }]]);

						if (typeof response === 'string') return response;
						return JSON.stringify(response);
					};
				}
			}

			// ========== VectorStore ==========
			if (originalInstance instanceof VectorStore) {
				if (prop === 'similaritySearch' && 'similaritySearch' in target) {
					return async (
						query: string,
						k?: number,
						filter?: BiquadFilterType,
						_callbacks?: Callbacks,
					): Promise<Document[]> => {
						connectionType = NodeConnectionTypes.AiVectorStore;
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

						logAiEvent(executeFunctions, 'ai-vector-store-searched', { query });
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
