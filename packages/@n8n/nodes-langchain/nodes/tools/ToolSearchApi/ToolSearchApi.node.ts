/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import { SearchApi } from '@langchain/community/tools/searchapi';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class ToolSearchApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SearchApi (Google Search)',
		name: 'toolSearchApi',
		icon: 'file:searchApi.svg',
		group: ['transform'],
		version: 1,
		description: 'Search in Google using SearchApi',
		defaults: {
			name: 'SearchApi',
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
            url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolsearchapi/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		credentials: [
			{
				name: 'searchApi',
				required: true,
			},
		],
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
						displayName: 'Engine',
						name: 'engine',
						type: 'string',
						default: 'google',
						description:
							'Defines the engine of the search. Supported engines are google, bing, baidu, google_news, youtube_transcripts, and more. Check the full list of supported <a href="https://www.searchapi.io/" engines</a> in the documentation.',
					},
					{
						displayName: 'Country',
						name: 'gl',
						type: 'string',
						default: 'us',
						description:
							'Defines the country of the search. Check the full list of supported <a href="https://www.searchapi.io/docs/parameters/google/gl" Google countries</a>.',
						displayOptions: {
							hide: {
								engine: ['youtube_transcripts'],
							},
						},
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
						displayOptions: {
							hide: {
								engine: ['youtube_transcripts'],
							},
						},
					},
					{
						displayName: 'Google Domain',
						name: 'google_domain',
						type: 'string',
						default: 'google.com',
						description:
							'Defines the Google domain of the search. Check the full list of supported <a href="https://www.searchapi.io/docs/parameters/google/domain" Google domains</a>.',
						displayOptions: {
							hide: {
								engine: ['youtube_transcripts'],
							},
						},
					},
					{
						displayName: 'Language',
						name: 'hl',
						type: 'string',
						default: 'en',
						description:
							'Defines the interface language of the search. Check the full list of supported <a href="https://www.searchapi.io/docs/parameters/google/hl" Google languages</a>.',
						displayOptions: {
							hide: {
								engine: ['youtube_transcripts'],
							},
						},
					},
					{
						displayName: 'Video ID (For YouTube Transcripts)',
						name: 'video_id',
						type: 'string',
						default: '',
						description:
							'Specifies the ID of the video for which you want to retrieve transcripts. Only applicable for YouTube Transcripts engine.',
						displayOptions: {
							show: {
								engine: ['youtube_transcripts'],
							},
						},
					},
					{
						displayName: 'Language (For YouTube Transcripts)',
						name: 'lang',
						type: 'string',
						default: 'en',
						description:
							'Specifies the language for transcripts. Only applicable for YouTube Transcripts engine.',
						displayOptions: {
							show: {
								engine: ['youtube_transcripts'],
							},
						},
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('searchApi');

		const options = this.getNodeParameter('options', itemIndex) as object;

		return {
			response: logWrapper(new SearchApi(credentials.apiKey as string, options), this),
		};
	}
}
