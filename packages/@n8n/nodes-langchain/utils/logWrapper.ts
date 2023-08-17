import { IExecuteFunctions } from 'n8n-workflow';

import { Tool } from 'langchain/tools';
import { BaseMessage, ChatResult } from 'langchain/dist/schema';
import { BaseChatModel } from 'langchain/dist/chat_models/base';
import { CallbackManagerForLLMRun } from 'langchain/dist/callbacks';

export function logWrapper(
	originalInstance: Tool | BaseChatModel,
	executeFunctions: IExecuteFunctions,
) {
	return new Proxy(originalInstance, {
		get: (target, prop) => {
			if (prop === '_call') {
				return async (query: string): Promise<string> => {
					executeFunctions.addInputData('tool', [[{ json: { query } }]]);
					// @ts-ignore
					const response = await target[prop](query);
					executeFunctions.addOutputData('tool', [[{ json: { response } }]]);
					return response;
				};
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
