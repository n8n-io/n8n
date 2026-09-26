// Use case: devops / Campaign Plan Sync Between Spreadsheets.
// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Both sheets share the columns campaign_id, budget, start_date, end_date and kpi_target.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every 12 hours.
const twiceADay = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Twice a Day',
		parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 12 }] } },
	},
});

// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
const SPREADSHEET = 'sheets';

// One ready reader per tool. Each returns one item per campaign row of the planning sheet.
const planReaders = {
	sheets: {
		type: 'n8n-nodes-base.googleSheets',
		version: 4.7,
		config: {
			name: 'Read Campaign Plan',
			credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
			parameters: {
				resource: 'sheet',
				operation: 'read',
				authentication: 'oAuth2',
				documentId: {
					__rl: true,
					mode: 'url',
					value: placeholder('Google Sheets URL of the campaign plan'),
				},
				sheetName: {
					__rl: true,
					mode: 'name',
					value: placeholder('Sheet tab name, for example Plan'),
				},
			},
			output: [
				{
					campaign_id: 'CMP-2026-09',
					budget: 12000,
					start_date: '2026-09-01',
					end_date: '2026-09-30',
					kpi_target: 350,
				},
			],
		},
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Read Campaign Plan',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'readRows',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook of the campaign plan'),
				},
				worksheet: { __rl: true, mode: 'list', value: placeholder('Worksheet, for example Plan') },
			},
			output: [
				{
					campaign_id: 'CMP-2026-09',
					budget: 12000,
					start_date: '2026-09-01',
					end_date: '2026-09-30',
					kpi_target: 350,
				},
			],
		},
	},
};
const readCampaignPlan = node(planReaders[SPREADSHEET]);

// Skips the rows without a campaign id.
const hasCampaignId = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Has Campaign ID',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ String($json.campaign_id || "") }}'),
						rightValue: '',
						operator: { type: 'string', operation: 'notEmpty', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// One ready writer per tool. Each updates the report row with the same campaign_id, or adds it.
const reportWriters = {
	sheets: {
		type: 'n8n-nodes-base.googleSheets',
		version: 4.7,
		config: {
			name: 'Update Campaign Report',
			credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
			parameters: {
				resource: 'sheet',
				operation: 'appendOrUpdate',
				authentication: 'oAuth2',
				documentId: {
					__rl: true,
					mode: 'url',
					value: placeholder('Google Sheets URL of the campaign report'),
				},
				sheetName: {
					__rl: true,
					mode: 'name',
					value: placeholder('Sheet tab name, for example Report'),
				},
				columns: {
					mappingMode: 'defineBelow',
					value: {
						campaign_id: expr('{{ $json.campaign_id }}'),
						budget: expr('{{ $json.budget }}'),
						start_date: expr('{{ $json.start_date }}'),
						end_date: expr('{{ $json.end_date }}'),
						kpi_target: expr('{{ $json.kpi_target }}'),
					},
					schema: [
						{
							id: 'campaign_id',
							displayName: 'campaign_id',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: true,
						},
						{
							id: 'budget',
							displayName: 'budget',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'start_date',
							displayName: 'start_date',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'end_date',
							displayName: 'end_date',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'kpi_target',
							displayName: 'kpi_target',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
					],
					matchingColumns: ['campaign_id'],
				},
			},
		},
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Update Campaign Report',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'upsert',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook of the campaign report'),
				},
				worksheet: {
					__rl: true,
					mode: 'list',
					value: placeholder('Worksheet, for example Report'),
				},
				dataMode: 'define',
				columnToMatchOn: 'campaign_id',
				valueToMatchOn: expr('{{ $json.campaign_id }}'),
				fieldsUi: {
					values: [
						{ column: 'budget', fieldValue: expr('{{ $json.budget }}') },
						{ column: 'start_date', fieldValue: expr('{{ $json.start_date }}') },
						{ column: 'end_date', fieldValue: expr('{{ $json.end_date }}') },
						{ column: 'kpi_target', fieldValue: expr('{{ $json.kpi_target }}') },
					],
				},
			},
		},
	},
};
const updateCampaignReport = node(reportWriters[SPREADSHEET]);

export default workflow('id', 'Campaign Plan Sync Between Spreadsheets')
	.add(twiceADay)
	.to(readCampaignPlan)
	.to(hasCampaignId)
	.to(updateCampaignReport);
