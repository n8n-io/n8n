import { benchmarkTaskSchema } from '../benchmark.schema';

const documentId = '1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo';
const sheetId = 1603099698;
const values = { Order: 'O-23523', Status: 'Shipped' };

export const updateOrderStatusTask = benchmarkTaskSchema.parse({
	id: 'update-order-status',
	title: 'Google Sheets change row',
	prompt:
		'Can you update order O-23523 status to "Shipped" in spreadsheet "Financial reports"? Don\'t stop to ask questions, just update the status.',
	categories: [
		'discovery',
		'chained-resolution',
		'resource-mapping',
		'matching-columns',
		'update',
		'execution',
	],
	variants: ['eval-json-schema-generic-batch', 'eval-action-lookup'],
	timeoutMs: 120_000,
	oracle: {
		allowedActionIds: ['n8n-nodes-base.googleSheets@4.7/sheet.update'],
		requiredInput: {
			documentId,
			sheetName: sheetId,
			columns: {
				values,
				matchingColumns: ['Order'],
			},
		},
		alternativeInputs: [
			{
				documentId,
				sheetName: sheetId,
				columns: {
					mappingMode: 'defineBelow',
					value: values,
					matchingColumns: ['Order'],
				},
			},
		],
		forbiddenInputPaths: ['columns.schema'],
		finalAnswerIncludes: ['Financial reports', 'O-23523', 'Shipped'],
	},
	fixtures: {
		document: { name: 'Financial reports', id: documentId },
		sheets: [
			{ name: 'Sheet1', id: 'gid=0' },
			{ name: 'Fixtures/Orders', id: sheetId },
		],
		columns: [
			{ name: 'Order', type: 'string' },
			{ name: 'Status', type: 'string' },
		],
		executionOutput: values,
		operationOutputs: {
			'sheet.read': [
				{ row_number: 2, Order: 'O-123', Status: 'In Progress' },
				{ row_number: 3, Order: 'O-23523', Status: 'In Progress' },
				{ row_number: 4, Order: 'O-908', Status: 'Shipped' },
			],
		},
	},
	source: {
		kind: 'recorded-conversation',
		threadId: '51e2a75f-f4f1-4964-87de-464b1b79155b',
		relatedThreadIds: ['d139d577-da7a-4b15-957b-69d8953b52b4'],
		agentName: 'Spreadsheets MCP and Action Lookup MCP',
		catalogVersion: 'compact-resource-mapper-input',
		model: 'anthropic/claude-sonnet-5',
		observedDurationMs: 41_657,
		observedPromptTokens: 133_085,
		observedCompletionTokens: 1_920,
		observedCostUsd: 0.1096692,
	},
});
