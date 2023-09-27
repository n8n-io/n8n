/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import { WikipediaQueryRun } from 'langchain/tools';
import { logWrapper } from '../../../utils/logWrapper';

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
		properties: [],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		return {
			response: logWrapper(new WikipediaQueryRun(), this),
		};
	}
}
