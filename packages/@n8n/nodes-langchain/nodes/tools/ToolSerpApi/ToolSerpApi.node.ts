/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { logWrapper } from '../../../utils/logWrapper';

import { SerpAPI } from 'langchain/tools';

export class ToolSerpApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - SerpAPI',
		name: 'toolSerpApi',
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
		properties: [
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Country',
						name: 'gl',
						type: 'string',
						default: 'us',
						description: 'Defines the country to use for search. Head to <a href="https://serpapi.com/google-countries">Google countries page</a> for a full list of supported countries.',
					},
					{
						displayName: 'Device',
						name: 'device',
						type: 'options',
						options: [
							{
								name: 'Desktop',
								value: 'desktop',
							},
							{
								name: 'Mobile',
								value: 'mobile',
							},
							{
								name: 'Tablet',
								value: 'tablet',
							},
						],
						default: 'desktop',
						description: 'Device to use to get the results',
					},
					{
						displayName: 'Explicit Array',
						name: 'no_cache',
						type: 'boolean',
						default: false,
						description: 'Force SerpApi to fetch the Google results even if a cached version is already present. Cache expires after 1h. Cached searches are free, and are not counted towards your searches per month.',
					},
					{
						displayName: 'Google Domain',
						name: 'google_domain',
						type: 'string',
						default: 'google.com',
						description: 'Defines the country to use for search. Head to <a href="https://serpapi.com/google-countries">Google countries page</a> for a full list of supported countries.',
					},
					{
						displayName: 'Language',
						name: 'hl',
						type: 'string',
						default: 'en',
						description: 'Defines the language to use. It\'s a two-letter language code. (e.g., `en` for English, `es` for Spanish, or `fr` for French). Head to <a href="https://serpapi.com/google-languages">Google languages page</a> for a full list of supported languages.',
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const credentials = await this.getCredentials('serpApi');

		const itemIndex = 0;

		const options = this.getNodeParameter('options', itemIndex) as object;

		return {
			response: logWrapper(new SerpAPI(credentials.apiKey as string, options), this),
		};
	}
}
