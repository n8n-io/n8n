import { benchmarkTaskSchema } from '../benchmark.schema';

const tasksDataSourceId = 'eaa907b8-908c-4b7f-920c-b2beb9144a01';
const propertyValues = [
	{ key: 'Status|select', selectValue: 'Todo' },
	{ key: 'Priority|select', selectValue: 'High' },
	{
		key: 'Due date|date',
		range: false,
		includeTime: false,
		date: '2026-08-15',
	},
];

export const createNotionDatabasePageTask = benchmarkTaskSchema.parse({
	id: 'create-notion-database-page',
	title: 'Create database page',
	prompt:
		'In the Tasks Notion database, create "Review quarterly budget" with status Todo, priority High, and due date 2026-08-15.',
	categories: ['discovery', 'chained-resolution', 'fixed-collection', 'create', 'execution'],
	variants: ['eval-notion-action-lookup'],
	timeoutMs: 120_000,
	oracle: {
		allowedActionIds: ['n8n-nodes-base.notion@3/databasePage.create'],
		requiredInput: {
			dataSourceId: tasksDataSourceId,
			title: 'Review quarterly budget',
			propertiesUi: { propertyValues },
		},
		alternativeInputs: [
			{
				dataSourceId: tasksDataSourceId,
				title: 'Review quarterly budget',
				propertiesUi: propertyValues,
			},
			{
				dataSourceId: {
					mode: 'list',
					value: tasksDataSourceId,
				},
				title: 'Review quarterly budget',
				propertiesUi: { propertyValues },
			},
		],
		forbiddenInputPaths: ['propertiesUi.propertyValues.0.type', 'propertiesUi.0.type'],
		finalAnswerIncludes: ['Review quarterly budget', 'Todo', 'High', '2026-08-15'],
	},
	fixtures: {
		executionOutput: {
			id: 'fixture-budget-review-page',
			name: 'Review quarterly budget',
			url: 'https://app.notion.com/p/Review-quarterly-budget',
			property_priority: 'High',
			property_status: 'Todo',
			property_due_date: {
				start: '2026-08-15',
				end: null,
				time_zone: null,
			},
		},
		resolutionOptions: {
			dataSourceId: [{ name: 'Tasks', value: tasksDataSourceId }],
			'propertiesUi.propertyValues.key': [
				{ name: 'Completed', value: 'Completed|checkbox' },
				{ name: 'Due date', value: 'Due date|date' },
				{ name: 'External ID', value: 'External ID|rich_text' },
				{ name: 'Name', value: 'Name|title' },
				{ name: 'Owner', value: 'Owner|people' },
				{ name: 'Priority', value: 'Priority|select' },
				{ name: 'Status', value: 'Status|select' },
			],
			'propertiesUi.propertyValues.selectValue:Status|select': [
				{ name: 'Todo', value: 'Todo' },
				{ name: 'In Progress', value: 'In Progress' },
				{ name: 'Done', value: 'Done' },
			],
			'propertiesUi.propertyValues.selectValue:Priority|select': [
				{ name: 'Low', value: 'Low' },
				{ name: 'Medium', value: 'Medium' },
				{ name: 'High', value: 'High' },
			],
		},
	},
	source: {
		kind: 'recorded-conversation',
		threadId: '00f1ed72-3f97-4059-b31b-9a703c3bbf39',
		relatedThreadIds: [],
		agentName: 'Action Lookup Notion',
		catalogVersion: 'notion-node-catalog',
		model: 'anthropic/claude-opus-5',
		observedDurationMs: 39_909,
		observedPromptTokens: 88_919,
		observedCompletionTokens: 1_990,
		observedCostUsd: 0.1491915,
	},
});
