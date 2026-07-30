import { benchmarkTaskSchema } from '../benchmark.schema';

const handbookPageId = '3ab4fcc8-bcd0-819c-bcab-f038f40ccb0a';

export const searchNotionTask = benchmarkTaskSchema.parse({
	id: 'search-notion',
	title: 'Search Notion',
	prompt: 'What is the support escalation code in the Company Handbook in notion?',
	categories: ['discovery', 'search', 'read-only', 'multi-step', 'execution'],
	variants: ['eval-notion-action-lookup'],
	timeoutMs: 120_000,
	oracle: {
		allowedActionIds: ['n8n-nodes-base.notion@3/page.getMarkdown'],
		requiredInput: {
			pageId: handbookPageId,
		},
		alternativeInputs: [
			{
				pageId: {
					mode: 'id',
					value: handbookPageId,
				},
			},
		],
		forbiddenInputPaths: [],
		finalAnswerIncludes: ['ORCHID-42'],
	},
	fixtures: {
		operationOutputs: {
			'page.search': [
				{
					id: '3ab4fcc8-bcd0-818d-9e01-ecd505dfc58e',
					name: 'Company Knowledgebase',
					url: 'https://app.notion.com/p/Company-Knowledgebase',
				},
				{
					id: handbookPageId,
					name: 'Company Handbook',
					url: 'https://app.notion.com/p/Company-Handbook',
				},
			],
			'page.getMarkdown': [
				{
					object: 'page_markdown',
					id: handbookPageId,
					markdown:
						'# Support\nFor critical customer incidents, contact the on-call lead before escalating.\n**Support escalation code:** `ORCHID-42`\n# Working agreements\nDocument decisions, owners, and follow-up dates in the relevant project page.',
					truncated: false,
					unknown_block_ids: [],
				},
			],
		},
	},
	source: {
		kind: 'recorded-conversation',
		threadId: '15392818-1066-4928-862b-4ab24cc5ff8b',
		relatedThreadIds: [],
		agentName: 'Action Lookup Notion',
		catalogVersion: 'notion-node-catalog',
		model: 'anthropic/claude-opus-5',
		observedDurationMs: 19_874,
		observedPromptTokens: 58_285,
		observedCompletionTokens: 798,
		observedCostUsd: 0.093844,
	},
});
