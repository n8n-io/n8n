// Use case: other / Sales Report in a Spreadsheet.
// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Setup: the orders table has the columns created_at and amount. The report sheet has
// the columns sale_date and total_amount, with sale_date as the unique key per row.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
const SPREADSHEET = 'sheets';

// Runs every morning.
const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Daily Morning',
		parameters: {
			rule: {
				interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 0 }],
			},
		},
	},
});

// [database] MySQL. Swap for PostgreSQL or another database: replace this node only.
// The next node reads $json.sale_date, $json.total_amount.
const dailySalesTotals = node({
	type: 'n8n-nodes-base.mySql',
	version: 2.5,
	config: {
		name: 'Daily Sales Totals',
		credentials: { mySql: newCredential('MySQL account') },
		parameters: {
			resource: 'database',
			operation: 'executeQuery',
			query:
				'SELECT DATE(created_at) AS sale_date, SUM(amount) AS total_amount FROM orders WHERE created_at >= CURDATE() - INTERVAL 1 DAY AND created_at < CURDATE() GROUP BY DATE(created_at);',
		},
	},
	output: [{ sale_date: '2026-09-16', total_amount: 4231.5 }],
});

// Spreadsheet: one ready node per tool. It appends or updates the row that matches sale_date
// and reads $json.sale_date, $json.total_amount.
const appendOrUpdateRowConfigs = {
	sheets: {
		type: 'n8n-nodes-base.googleSheets',
		version: 4.7,
		config: {
			name: 'Append or Update Row',
			credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
			parameters: {
				resource: 'sheet',
				operation: 'appendOrUpdate',
				authentication: 'oAuth2',
				documentId: {
					__rl: true,
					mode: 'list',
					value: placeholder('Google Sheets URL of the sales report'),
				},
				sheetName: { __rl: true, mode: 'name', value: 'Sales' },
				columns: {
					mappingMode: 'defineBelow',
					value: {
						sale_date: expr('{{ $json.sale_date }}'),
						total_amount: expr('{{ $json.total_amount }}'),
					},
					schema: [
						{
							id: 'sale_date',
							displayName: 'sale_date',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: true,
						},
						{
							id: 'total_amount',
							displayName: 'total_amount',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'number',
							canBeUsedToMatch: false,
						},
					],
					matchingColumns: ['sale_date'],
				},
			},
		},
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Append or Update Row',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'upsert',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook of the sales report'),
				},
				worksheet: { __rl: true, mode: 'list', value: placeholder('Worksheet, for example Sales') },
				dataMode: 'define',
				columnToMatchOn: 'sale_date',
				valueToMatchOn: expr('{{ $json.sale_date }}'),
				fieldsUi: {
					values: [{ column: 'total_amount', fieldValue: expr('{{ $json.total_amount }}') }],
				},
			},
		},
	},
};
const appendOrUpdateRow = node(appendOrUpdateRowConfigs[SPREADSHEET]);

export default workflow('id', 'Sales Report in a Spreadsheet')
	.add(schedule)
	.to(dailySalesTotals)
	.to(appendOrUpdateRow);
