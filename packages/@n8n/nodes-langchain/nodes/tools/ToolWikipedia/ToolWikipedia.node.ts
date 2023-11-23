/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import { WikipediaQueryRun } from 'langchain/tools';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { ToolWithCallbacks } from '../../../utils/baseClasses/ToolWithCallbacks';

export class ToolWikipedia implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wikipedia',
		name: 'toolWikipedia',
		icon: 'file:wikipedia.svg',
		group: ['transform'],
		version: 1,
		description: 'Search in Wikipedia',
		defaults: {
			name: 'Wikipedia',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolwikipedia/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiAgent]),
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Base URL',
						name: 'baseUrl',
						type: 'string',
						default: 'https://en.wikipedia.org/w/api.php',
						description: 'Base URL of the Wikipedia API',
					},
					{
						displayName: 'Top K Results',
						name: 'topKResults',
						type: 'number',
						default: 3,
						description: 'Number of results to return',
					},
					{
						displayName: 'Max Doc Content Length',
						name: 'maxDocContentLength',
						type: 'number',
						default: 4000,
						description: 'Maximum length of the document content to return',
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const options = this.getNodeParameter('options', itemIndex, {
			baseUrl: 'https://en.wikipedia.org/w/api.php',
			maxDocContentLength: 4000,
			topKResults: 3,
		}) as {
			baseUrl: string;
			maxDocContentLength: number;
			topKResults: number;
		};

		const wikipediaToolWrapped = new ToolWithCallbacks(this, WikipediaQueryRun, {
			baseUrl: options.baseUrl,
			maxDocContentLength: options.maxDocContentLength,
			topKResults: options.topKResults,
		});

		return {
			response: wikipediaToolWrapped.getToolInstance(),
		};
	}
}
