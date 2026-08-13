import { DynamicTool } from '@langchain/core/tools';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';

import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';

type Options = {
	numResults?: number;
	pageNumber?: number;
	language?: string;
	safesearch?: 0 | 1 | 2;
};

type SearXngResponse = {
	results?: Array<{ title?: string; url?: string; content?: string }>;
	answers?: string[];
	infoboxes?: Array<{ content?: string }>;
	suggestions?: string[];
};

function stripHtml(html: string): string {
	let content = html;
	let previous: string;
	do {
		previous = content;
		content = content.replace(/<[^>]+>/gi, '');
	} while (content !== previous);
	return content;
}

function formatResponse(data: SearXngResponse, numResults: number): string {
	const results = data.results ?? [];
	if (results.length) {
		return results
			.slice(0, numResults)
			.map((result) =>
				JSON.stringify({
					title: result.title ?? '',
					link: result.url ?? '',
					snippet: result.content ?? '',
				}),
			)
			.join(',');
	}

	if (data.answers?.length) return data.answers[0];
	if (data.infoboxes?.length) return stripHtml(data.infoboxes[0]?.content ?? '');
	if (data.suggestions?.length) return `Suggestions: ${data.suggestions.join(', ')}`;

	return 'No good results found.';
}

async function getTool(ctx: ISupplyDataFunctions | IExecuteFunctions, itemIndex: number) {
	const credentials = await ctx.getCredentials<{ apiUrl: string }>('searXngApi');
	const options = ctx.getNodeParameter('options', itemIndex) as Options;

	const apiBase = credentials.apiUrl.replace(/\/+$/, '');
	const numResults = options.numResults ?? 10;

	const qs: IDataObject = {
		format: 'json',
		pageno: options.pageNumber ?? 1,
		safesearch: options.safesearch ?? 0,
	};
	if (options.language) qs.language = options.language;

	return new DynamicTool({
		name: 'searxng-search',
		description:
			'A meta search engine. Useful for when you need to answer questions about current events. Input should be a search query. Output is a JSON array of the query results',
		func: async (query: string) => {
			// Routed through the node request helper so outbound policy applies.
			const response = (await ctx.helpers.httpRequest({
				method: 'POST',
				url: `${apiBase}/search`,
				qs: { q: query, ...qs },
				headers: { Accept: 'application/json' },
				json: true,
				// Search responses are short-lived; don't let a hung instance
				// stall the agent turn for the transport default (5 minutes).
				timeout: 15_000,
			})) as SearXngResponse;

			return formatResponse(response, numResults);
		},
	});
}

export class ToolSearXng implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SearXNG',
		name: 'toolSearXng',
		icon: 'file:searXng.svg',
		group: ['transform'],
		version: 1,
		description: 'Search in SearXNG',
		defaults: {
			name: 'SearXNG',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolsearxng',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		credentials: [
			{
				name: 'searXngApi',
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
						displayName: 'Number of Results',
						name: 'numResults',
						type: 'number',
						default: 10,
					},
					{
						displayName: 'Search Page Number',
						name: 'pageNumber',
						type: 'number',
						default: 1,
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: 'en',
						description:
							'Defines the language to use. It\'s a two-letter language code. (e.g., `en` for English, `es` for Spanish, or `fr` for French). Head to <a href="https://docs.searxng.org/user/search-syntax.html#select-language">SearXNG search syntax page</a> for more info.',
					},
					{
						displayName: 'Safe Search',
						name: 'safesearch',
						type: 'options',
						options: [
							{
								name: 'None',
								value: 0,
							},
							{
								name: 'Moderate',
								value: 1,
							},
							{
								name: 'Strict',
								value: 2,
							},
						],
						default: 0,
						description: 'Filter search results of engines which support safe search',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		return {
			response: logWrapper(await getTool(this, itemIndex), this),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const result: INodeExecutionData[] = [];
		const input = this.getInputData();
		for (let i = 0; i < input.length; i++) {
			const item = input[i];
			const tool = await getTool(this, i);

			const query = item.json.input;
			if (typeof query !== 'string' || query === '') {
				throw new NodeOperationError(this.getNode(), 'Input item is missing', {
					itemIndex: i,
				});
			}

			result.push({
				json: {
					response: await tool.invoke(query),
				},
				pairedItem: {
					item: i,
				},
			});
		}

		return [result];
	}
}
