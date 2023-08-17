import { IExecuteFunctions } from 'n8n-workflow';

import { Tool } from 'langchain/tools';
import { BaseMessage, ChatResult, InputValues } from 'langchain/dist/schema';
import { BaseChatModel } from 'langchain/dist/chat_models/base';
import { CallbackManagerForLLMRun } from 'langchain/dist/callbacks';
import { BaseChatMemory } from 'langchain/memory';
import { MemoryVariables, OutputValues } from 'langchain/dist/memory/base';

export function logWrapper(
	originalInstance: Tool | BaseChatMemory | BaseChatModel,
	executeFunctions: IExecuteFunctions,
) {
	return new Proxy(originalInstance, {
		// For Tool
		get: (target, prop) => {
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
			} else {
				// @ts-ignore
				return target[prop];
			}
		},
	});
}
