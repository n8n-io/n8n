import type {
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { ProviderTool, supplyModel } from '@n8n/ai-node-sdk';
import { OpenAIChatModel } from './model';
import { openAiProperties } from './properties';
import { formatBuiltInTools } from './common';

type ModelOptions = {
	temperature?: number;
};

export class ExampleChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Example Chat Model',
		name: 'exampleChatModel',
		icon: { light: 'file:../../icons/example.svg', dark: 'file:../../icons/example.dark.svg' },
		group: ['transform'],
		version: [1],
		description: 'Custom Chat Model Node',
		defaults: {
			name: 'Example Chat Model',
		},
		codex: {
			categories: ['assistant'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'exampleApi',
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

	async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
		const credentials = await this.getCredentials('exampleApi');
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
						'exampleApi',
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
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'exampleApi',
						{
							method,
							url,
							body,
							headers,
							encoding: 'stream',
						},
					);
					return {
						body: response,
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
