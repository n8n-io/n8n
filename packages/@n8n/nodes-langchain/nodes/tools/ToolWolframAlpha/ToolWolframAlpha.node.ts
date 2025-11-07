import { WolframAlphaTool } from '@langchain/community/tools/wolframalpha';
import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class ToolWolframAlpha implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wolfram|Alpha',
		name: 'toolWolframAlpha',
		icon: 'file:wolfram-alpha.svg',
		group: ['transform'],
		version: 1,
		description: "Connects to WolframAlpha's computational intelligence engine.",
		defaults: {
			name: 'Wolfram Alpha',
		},
		credentials: [
			{
				name: 'wolframAlphaApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolwolframalpha/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [getConnectionHintNoticeField([NodeConnectionTypes.AiAgent])],
	};

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		const credentials = await this.getCredentials('wolframAlphaApi');

		return {
			response: logWrapper(new WolframAlphaTool({ appid: credentials.appId as string }), this),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('wolframAlphaApi');
		const input = this.getInputData();
		const result: INodeExecutionData[] = [];

		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const tool = new WolframAlphaTool({ appid: credentials.appId as string });
			result.push({
				json: {
					response: await tool.invoke(item.json),
				},
				pairedItem: {
					item: i,
				},
			});
		}

		return [result];
	}
}
