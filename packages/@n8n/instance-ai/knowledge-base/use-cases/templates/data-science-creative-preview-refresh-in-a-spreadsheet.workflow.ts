// Use case: data-science / Creative Preview Refresh in a Spreadsheet.
// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The sheet has the columns ad_id, preview_url, screenshot_url and status. A row is
// pending while status is not "ok". The screenshot service returns { screenshot_url }.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every hour.
const everyHour = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Hour',
		parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
	},
});

// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
const SPREADSHEET = 'sheets';

// One ready reader per tool. Each returns one item per ad row.
const adReaders = {
	sheets: {
		type: 'n8n-nodes-base.googleSheets',
		version: 4.7,
		config: {
			name: 'Read Ads',
			credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
			parameters: {
				resource: 'sheet',
				operation: 'read',
				authentication: 'oAuth2',
				documentId: {
					__rl: true,
					mode: 'url',
					value: placeholder('Google Sheets URL of the ad report'),
				},
				sheetName: {
					__rl: true,
					mode: 'name',
					value: placeholder('Sheet tab name, for example Ads'),
				},
			},
			output: [
				{
					ad_id: '120210001',
					preview_url: 'https://www.facebook.com/ads/preview/?id=120210001',
					screenshot_url: '',
					status: 'pending',
				},
			],
		},
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Read Ads',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'readRows',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook of the ad report'),
				},
				worksheet: { __rl: true, mode: 'list', value: placeholder('Worksheet, for example Ads') },
			},
			output: [
				{
					ad_id: '120210001',
					preview_url: 'https://www.facebook.com/ads/preview/?id=120210001',
					screenshot_url: '',
					status: 'pending',
				},
			],
		},
	},
};
const readAds = node(adReaders[SPREADSHEET]);

// Keeps the rows with a preview link and no good screenshot yet.
const keepPendingRows = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Keep Pending Rows',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.preview_url }}'),
						rightValue: '',
						operator: { type: 'string', operation: 'notEmpty', singleValue: true },
					},
					{
						id: 'c2',
						leftValue: expr('{{ $json.status }}'),
						rightValue: 'ok',
						operator: { type: 'string', operation: 'notEquals' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// ponytail: ten rows per run keeps the screenshot service quota; raise maxItems if it allows more.
const nextTenRows = node({
	type: 'n8n-nodes-base.limit',
	version: 1,
	config: { name: 'Next Ten Rows', parameters: { maxItems: 10, keep: 'firstItems' } },
});

// Renders the preview page to an image. The next node reads $json.screenshot_url.
const renderPreview = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Render Preview',
		onError: 'continueRegularOutput',
		credentials: { httpTemplatedCustomAuth: newCredential('Screenshot service account') },
		parameters: {
			method: 'GET',
			url: placeholder(
				'Screenshot service endpoint, for example https://api.example.com/screenshot',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendQuery: true,
			specifyQuery: 'keypair',
			queryParameters: { parameters: [{ name: 'url', value: expr('{{ $json.preview_url }}') }] },
		},
		output: [{ screenshot_url: 'https://cdn.example.com/screenshots/120210001.png' }],
	},
});

// One ready writer per tool. Each writes the screenshot link and the status to the row that
// matches ad_id. A failed render leaves status as "error" for the next run.
const adWriters = {
	sheets: {
		type: 'n8n-nodes-base.googleSheets',
		version: 4.7,
		config: {
			name: 'Update Ad Row',
			credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
			parameters: {
				resource: 'sheet',
				operation: 'appendOrUpdate',
				authentication: 'oAuth2',
				documentId: {
					__rl: true,
					mode: 'url',
					value: placeholder('Google Sheets URL of the ad report'),
				},
				sheetName: {
					__rl: true,
					mode: 'name',
					value: placeholder('Sheet tab name, for example Ads'),
				},
				columns: {
					mappingMode: 'defineBelow',
					value: {
						ad_id: expr("{{ $('Next Ten Rows').item.json.ad_id }}"),
						screenshot_url: expr('{{ $json.screenshot_url || "" }}'),
						status: expr('{{ $json.screenshot_url ? "ok" : "error" }}'),
					},
					schema: [
						{
							id: 'ad_id',
							displayName: 'ad_id',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: true,
						},
						{
							id: 'screenshot_url',
							displayName: 'screenshot_url',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'status',
							displayName: 'status',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
					],
					matchingColumns: ['ad_id'],
				},
			},
		},
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Update Ad Row',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'upsert',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook of the ad report'),
				},
				worksheet: { __rl: true, mode: 'list', value: placeholder('Worksheet, for example Ads') },
				dataMode: 'define',
				columnToMatchOn: 'ad_id',
				valueToMatchOn: expr("{{ $('Next Ten Rows').item.json.ad_id }}"),
				fieldsUi: {
					values: [
						{ column: 'screenshot_url', fieldValue: expr('{{ $json.screenshot_url || "" }}') },
						{ column: 'status', fieldValue: expr('{{ $json.screenshot_url ? "ok" : "error" }}') },
					],
				},
			},
		},
	},
};
const updateAdRow = node(adWriters[SPREADSHEET]);

export default workflow('id', 'Creative Preview Refresh in a Spreadsheet')
	.add(everyHour)
	.to(readAds)
	.to(keepPendingRows)
	.to(nextTenRows)
	.to(renderPreview)
	.to(updateAdRow);
