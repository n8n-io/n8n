import { type INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';

import { openAiProperties } from '../properties';

export const description: Omit<INodeTypeDescription, 'name' | 'displayName'> = {
	icon: 'fa:robot',
	group: ['transform'],
	version: [1],
	description: 'For advanced usage with an AI chain',
	defaults: {
		name: 'Custom OpenAI',
	},
	codex: {
		categories: ['assistant'],
		subcategories: {
			AI: ['Language Models', 'Root Nodes'],
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Language Models': ['Chat Models (Recommended)'],
		},
		resources: {
			primaryDocumentation: [
				{
					url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/',
				},
			],
		},
	},

	inputs: [],

	outputs: [NodeConnectionTypes.AiLanguageModel],
	outputNames: ['Model'],
	credentials: [
		{
			name: 'openAiApi',
			required: true,
		},
	],
	requestDefaults: {
		ignoreHttpStatusErrors: true,
		baseURL:
			'={{ $credentials?.url?.split("/").slice(0,-1).join("/") || "https://api.openai.com" }}',
	},
	properties: openAiProperties,
};
