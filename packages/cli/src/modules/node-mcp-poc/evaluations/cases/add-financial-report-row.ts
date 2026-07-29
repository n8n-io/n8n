import { benchmarkTaskSchema } from '../benchmark.schema';

export const addFinancialReportRowTask = benchmarkTaskSchema.parse({
	id: 'add-financial-report-row',
	title: 'Google Sheets append row',
	prompt:
		'Can you add a new row to gsheet document "Financial reports"? Month=01/01/2027, Amount = 5000. Don\'t stop to ask questions, just add the row.',
	categories: ['discovery', 'chained-resolution', 'resource-mapping', 'execution'],
	variants: ['eval-json-schema-generic-batch', 'eval-action-lookup'],
	timeoutMs: 120_000,
	oracle: {
		allowedActionIds: ['n8n-nodes-base.googleSheets@4.7/sheet.append'],
		requiredInput: {
			documentId: '1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo',
			sheetName: 'gid=0',
			columns: {
				mappingMode: 'defineBelow',
				value: {
					Month: '01/01/2027',
					'Amount $': '5000',
				},
			},
		},
		alternativeInputs: [
			{
				documentId: '1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo',
				sheetName: 'gid=0',
				columns: {
					Month: '01/01/2027',
					'Amount $': '5000',
				},
			},
		],
		forbiddenInputPaths: ['columns.schema', 'columns.matchingColumns'],
		finalAnswerIncludes: ['Financial reports', '01/01/2027', '5000'],
	},
	fixtures: {
		document: {
			name: 'Financial reports',
			id: '1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo',
		},
		sheets: [
			{ name: 'Sheet1', id: 'gid=0' },
			{ name: 'Fixtures/Orders', id: 1603099698 },
		],
		columns: [
			{ name: 'Month', type: 'string' },
			{ name: 'Amount $', type: 'string' },
		],
		executionOutput: {
			Month: '01/01/2027',
			'Amount $': '5000',
		},
	},
	source: {
		kind: 'recorded-conversation',
		threadId: '9f811a12-a86c-493d-851c-78e01696ce55',
		agentName: 'Action Lookup MCP',
		catalogVersion: 'compact-resource-mapper-input',
		model: 'anthropic/claude-sonnet-5',
		observedDurationMs: 25_928,
		observedPromptTokens: 65_894,
		observedCompletionTokens: 1_309,
		observedCostUsd: 0.039024,
	},
});
