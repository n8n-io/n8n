import {
	NodeConnectionTypes,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { supplyModel } from 'src/suppliers/supplyModel';
import type { ProviderTool } from 'src/types/tool';

import { formatBuiltInTools } from '../common';
import { openAiProperties } from '../properties';

export type ModelOptions = {
	temperature?: number;
};

export class LmChatOpenAiSimple implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenAI Simple',

		name: 'lmChatOpenAiSimple',
		icon: 'fa:robot',
		group: ['transform'],
		version: [1],
		description: 'For advanced usage with an AI chain',
		defaults: {
			name: 'OpenAI Simple',
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

		return supplyModel(this, {
			type: 'openai',
			baseUrl: credentials.url as string,
			apiKey: credentials.apiKey as string,
			model: modelName,
			temperature: options.temperature,
			providerTools,
		});
	}
}
