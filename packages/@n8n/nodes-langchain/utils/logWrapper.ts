import { IExecuteFunctions } from 'n8n-workflow';

import { Tool } from 'langchain/tools';
import { BaseMessage, ChatResult, InputValues } from 'langchain/dist/schema';
import { BaseChatModel } from 'langchain/dist/chat_models/base';
import { CallbackManagerForLLMRun } from 'langchain/dist/callbacks';
import { BaseChatMemory } from 'langchain/memory';

import { Embeddings } from 'langchain/embeddings';
import { MemoryVariables, OutputValues } from 'langchain/dist/memory/base';
import { VectorStoreRetriever } from 'langchain/vectorstores/base';
import { Document } from 'langchain/document';
import { TextSplitter } from 'langchain/text_splitter';
import { BaseDocumentLoader } from 'langchain/dist/document_loaders/base';

export function logWrapper(
	originalInstance: Tool | BaseChatMemory | BaseChatModel | Embeddings | Document[] | Document | BaseDocumentLoader | VectorStoreRetriever | TextSplitter,
	executeFunctions: IExecuteFunctions,
) {
	return new Proxy(originalInstance, {
		// For Tool
		get: (target, prop) => {
			console.log("🚀 ~ file: logWrapper.ts:19 ~ prop:", prop)
			if (prop === '_call') {
				return async (query: string): Promise<string> => {
					executeFunctions.addInputData('tool', [[{ json: { query } }]]);
					// @ts-ignore
					const response = await target[prop](query);
					executeFunctions.addOutputData('tool', [[{ json: { response } }]]);
					return response;
				};

				// For BaseChatMemory
			} else if (prop === 'loadMemoryVariables') {
				return async (values: InputValues): Promise<MemoryVariables> => {
					console.log('loadMemoryVariables....1');
					executeFunctions.addInputData('memory', [
						[{ json: { action: 'loadMemoryVariables', values } }],
					]);
					// @ts-ignore
					const response = await target[prop](values);
					executeFunctions.addOutputData('memory', [
						[{ json: { action: 'loadMemoryVariables', response } }],
					]);
					return response;
				};
			} else if (prop === 'saveContext') {
				return async (inputValues: InputValues, outputValues: OutputValues): Promise<void> => {
					executeFunctions.addInputData('memory', [
						[{ json: { action: 'saveContext', inputValues, outputValues } }],
					]);
					// @ts-ignore
					await target[prop](inputValues, outputValues);
					executeFunctions.addOutputData('memory', [[{ json: { action: 'saveContext' } }]]);
				};

				// For BaseChatModel
			} else if (prop === '_generate') {
				return async (
					messages: BaseMessage[],
					options: any,
					runManager?: CallbackManagerForLLMRun,
				): Promise<ChatResult> => {
					executeFunctions.addInputData('languageModel', [[{ json: { messages, options } }]]);
					// @ts-ignore
					const response = (await target[prop](messages, options, runManager)) as ChatResult;
					executeFunctions.addOutputData('languageModel', [[{ json: { response } }]]);
					return response;
				};
			}
			// TODO: Fix Document Loader and Vector Store Retriever once they receive the correct input
			// // For VectorStoreRetriever
			// else if (prop === '_getRelevantDocuments') {
			// 	return async (
			// 		messages: BaseMessage[],
			// 		options: any,
			// 		runManager?: CallbackManagerForLLMRun,
			// 	): Promise<Document[]> => {
			// 		executeFunctions.addInputData('vectorRetriever', [[{ json: { messages, options } }]]);
			// 		// @ts-ignore
			// 		const response = (await target[prop](messages, options, runManager)) as Document[];
			// 		executeFunctions.addOutputData('vectorRetriever', [[{ json: { response } }]]);
			// 		return response;
			// 	};
			// 	// For DocumentLoader
			// }
			// else if (prop === '_load') {
			// 	return async (inputValues: InputValues, outputValues: OutputValues): Promise<void> => {
			// 		console.log('Load Document...');
			// 		console.log('inputValues ', inputValues, 'outputValues ', outputValues);

			// 		executeFunctions.addInputData('document', [
			// 			[{ json: { action: 'load', values: {'test': 123 } } }],
			// 		]);
			// 		// // @ts-ignore
			// 		// const response = await target[prop](values);
			// 		executeFunctions.addOutputData('document', [
			// 			[{ json: { action: 'load', response: {'test': 123 } } }],
			// 		]);
			// 		// return response;
			// 	};
			// }
			else {
				// @ts-ignore
				return target[prop];
			}
		},
	});
}
