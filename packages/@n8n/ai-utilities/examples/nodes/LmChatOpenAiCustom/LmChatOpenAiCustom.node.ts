import {
	NodeConnectionTypes,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import type Stream from 'node:stream';
import { Readable } from 'node:stream';

import { supplyModel } from 'src/suppliers/supplyModel';
import type { ProviderTool } from 'src/types/tool';

import { OpenAIChatModel } from '../../models/openai';
import { formatBuiltInTools } from '../common';
import { openAiProperties } from '../properties';

export type ModelOptions = {
	temperature?: number;
};

export class LmChatOpenAiCustom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenAI Custom',

		name: 'lmChatOpenAiCustom',
		icon: 'fa:robot',
		group: ['transform'],
		version: [1],
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'Custom OpenAI',
		},
		codex: {
			categories: ['assistant'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'openAiApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL:
				'={{ $credentials?.url?.split("/").slice(0,-1).join("/") || "https://api.openai.com" }}',
		},
		properties: openAiProperties,
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('openAiApi');
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as ModelOptions;
		const providerTools: ProviderTool[] = [];
		const builtInToolsParams = formatBuiltInTools(
			this.getNodeParameter('builtInTools', itemIndex, {}) as IDataObject,
		);
		if (builtInToolsParams.length) {
			providerTools.push(...builtInToolsParams);
		}

		const model = new OpenAIChatModel(
			modelName,
			{
				httpRequest: async (method, url, body, headers) => {
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
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
					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
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

		return supplyModel(this, model);
	}
}
