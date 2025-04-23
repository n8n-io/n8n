import { DynamicTool } from '@langchain/core/tools';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class ToolPerplexity implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Perplexity Tool',
		name: 'toolPerplexity',
		icon: 'file:perplexity.svg',
		group: ['transform'],
		version: 1,
		description: 'Query Perplexity API for AI-powered answers with citations',
		defaults: {
			name: 'Perplexity',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['LLM'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolperplexity/',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'API Key',
				name: 'apiKey',
				type: 'string',
				typeOptions: { password: true },
				required: true,
				default: '',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{ name: 'sonar-small-chat', value: 'sonar-small-chat' },
					{ name: 'sonar-medium-chat', value: 'sonar-medium-chat' },
					{ name: 'pplx-7b-chat', value: 'pplx-7b-chat' },
					{ name: 'pplx-70b-chat', value: 'pplx-70b-chat' },
				],
				default: 'pplx-70b-chat',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const apiKey = this.getNodeParameter('apiKey', itemIndex) as string;
		const model = this.getNodeParameter('model', itemIndex) as string;

		if (!apiKey) {
			throw new NodeOperationError(this.getNode(), 'Perplexity API key is required', { itemIndex });
		}

		const tool = new DynamicTool({
			name: 'perplexity',
			description: 'Access to real-time information via Perplexity search with citations',
			func: async (input: string) => {
				try {
					const response = await this.helpers.httpRequest({
						method: 'POST',
						url: 'https://api.perplexity.ai/chat/completions',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${apiKey}`,
						},
						body: {
							model,
							messages: [{ role: 'user', content: input }],
						},
						json: true,
					});

					if (!response.choices?.[0]?.message?.content) {
						throw new NodeOperationError(
							this.getNode(),
							'Invalid response structure from Perplexity API',
							{ itemIndex },
						);
					}

					return response.choices[0].message.content;
				} catch (error) {
					const message = error instanceof Error ? error.message : 'Unknown error occurred';
					throw new NodeOperationError(
						this.getNode(),
						`Perplexity API request failed: ${message}`,
						{
							itemIndex,
							description: 'Verify your API key and model parameters',
						},
					);
				}
			},
		});

		return {
			response: logWrapper(tool, this),
		};
	}
}
