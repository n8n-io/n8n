/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { logWrapper } from '../../../utils/logWrapper';

import { SerpAPI } from 'langchain/tools';

export class LangChainToolSerpApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - SerpAPI',
		name: 'langChainToolSerpApi',
		icon: 'file:google.svg',
		group: ['transform'],
		version: 1,
		description: 'Search in Google',
		defaults: {
			name: 'LangChain - SerpAPI',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-non-core-color-present
			color: '#400080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['tool'],
		outputNames: ['Tool'],
		credentials: [
			{
				name: 'serpApi',
				required: true,
			},
		],
		properties: [],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const credentials = await this.getCredentials('serpApi');

		return {
			response: logWrapper(new SerpAPI(credentials.apiKey as string), this),
		};
	}
}
