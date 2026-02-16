import { createChatModelNode } from '@n8n/ai-utilities';
import type { ChatModelNodeConfig, ProviderTool } from '@n8n/ai-utilities';
import { type IDataObject, type ISupplyDataFunctions } from 'n8n-workflow';
import type Stream from 'node:stream';
import { Readable } from 'node:stream';

import { OpenAIChatModel } from '../../models/openai/model';
import { formatBuiltInTools } from '../common';
import { description } from './description';

export type ModelOptions = {
	temperature?: number;
};

class LmChatOpenAiNodeConfig implements ChatModelNodeConfig {
	description = {
		...description,
		displayName: 'OpenAI Custom Class',
		name: 'lmChatOpenAiCustomClass',
	};
	async getModel(context: ISupplyDataFunctions, itemIndex: number) {
		const credentials = await context.getCredentials('openAiApi');
		const modelName = context.getNodeParameter('model', itemIndex) as string;
		const options = context.getNodeParameter('options', itemIndex, {}) as ModelOptions;
		const providerTools: ProviderTool[] = [];
		const builtInToolsParams = formatBuiltInTools(
			context.getNodeParameter('builtInTools', itemIndex, {}) as IDataObject,
		);
		if (builtInToolsParams.length) {
			providerTools.push(...builtInToolsParams);
		}

		const model = new OpenAIChatModel(
			modelName,
			{
				httpRequest: async (method, url, body, headers) => {
					const response = await context.helpers.httpRequestWithAuthentication.call(
						context,
						'openAiApi',
						{
							url,
							method,
							body,
							headers,
						},
					);
					return {
						body: response,
					};
				},
				openStream: async (method, url, body, headers) => {
					const response = (await context.helpers.httpRequestWithAuthentication.call(
						context,
						'openAiApi',
						{
							method,
							url,
							body,
							headers,
							encoding: 'stream',
						},
					)) as Stream.Readable;
					return {
						body: Readable.toWeb(response) as ReadableStream<Uint8Array<ArrayBufferLike>>,
					};
				},
			},
			{
				baseURL: credentials.url as string,
				apiKey: credentials.apiKey as string,
				providerTools,
				temperature: options.temperature,
			},
		);
		return model;
	}
}

export const LmChatOpenAiCustomClass = createChatModelNode(new LmChatOpenAiNodeConfig());
