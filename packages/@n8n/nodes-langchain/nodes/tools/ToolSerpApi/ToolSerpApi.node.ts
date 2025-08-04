import { SerpAPI } from '@langchain/community/tools/serpapi';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class ToolSerpApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SerpApi (Google Search)',
		name: 'toolSerpApi',
		icon: 'file:serpApi.svg',
		group: ['transform'],
		version: 1,
		description: 'Search in Google using SerpAPI',
		defaults: {
			name: 'SerpAPI',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolserpapi/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		credentials: [
			{
				name: 'serpApi',
				required: true,
			},
		],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
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
						description:
							'Defines the country to use for search. Head to <a href="https://serpapi.com/google-countries">Google countries page</a> for a full list of supported countries.',
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
						description:
							'Whether to force SerpApi to fetch the Google results even if a cached version is already present. Cache expires after 1h. Cached searches are free, and are not counted towards your searches per month.',
					},
					{
						displayName: 'Google Domain',
						name: 'google_domain',
						type: 'string',
						default: 'google.com',
						description:
							'Defines the domain to use for search. Head to <a href="https://serpapi.com/google-domains">Google domains page</a> for a full list of supported domains.',
					},
					{
						displayName: 'Language',
						name: 'hl',
						type: 'string',
						default: 'en',
						description:
							'Defines the language to use. It\'s a two-letter language code. (e.g., `en` for English, `es` for Spanish, or `fr` for French). Head to <a href="https://serpapi.com/google-languages">Google languages page</a> for a full list of supported languages.',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('serpApi');

		const options = this.getNodeParameter('options', itemIndex) as object;

		return {
			response: logWrapper(new SerpAPI(credentials.apiKey as string, options), this),
		};
	}
}
