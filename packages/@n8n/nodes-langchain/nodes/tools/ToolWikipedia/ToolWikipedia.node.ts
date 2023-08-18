/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { WikipediaQueryRun } from 'langchain/tools';
import { logWrapper } from '../../../utils/logWrapper';

export class ToolWikipedia implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Wikipedia',
		name: 'toolWikipedia',
		icon: 'file:wikipedia.svg',
		group: ['transform'],
		version: 1,
		description: 'Search in Wikipedia',
		defaults: {
			name: 'LangChain - Wikipedia',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-non-core-color-present
			color: '#400080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['tool'],
		outputNames: ['Tool'],
		properties: [],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		return {
			response: logWrapper(new WikipediaQueryRun(), this),
		};
	}
}
