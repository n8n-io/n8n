// Use case: security / Contract Change Validation.
// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The sheet has the columns row_id, employee_id, field, new_value, status, result.
// Only salary and title changes are accepted; any other field is rejected.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
const SPREADSHEET = 'sheets';

// Runs every hour.
const hourlySchedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Hourly Schedule',
		parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
	},
});

// Spreadsheet: one ready node per tool. Both return the rows with status pending; Excel 365
// needs the rows as a table. The sheet has the columns row_id, employee_id, field, new_value,
// status, result. The next nodes read them.
const readChangeRequestsConfigs = {
	sheets: {
		type: 'n8n-nodes-base.googleSheets',
		version: 4.7,
		config: {
			name: 'Read Change Requests',
			credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
			parameters: {
				resource: 'sheet',
				operation: 'read',
				authentication: 'oAuth2',
				documentId: {
					__rl: true,
					mode: 'url',
					value: placeholder('Google Sheets URL of the contract change queue'),
				},
				sheetName: {
					__rl: true,
					mode: 'name',
					value: placeholder('Sheet tab name, for example Sheet1'),
				},
				filtersUI: { values: [{ lookupColumn: 'status', lookupValue: 'pending' }] },
				combineFilters: 'AND',
			},
			output: [
				{
					row_id: 'r-1',
					employee_id: 'e-1001',
					field: 'salary',
					new_value: '65000',
					status: 'pending',
					result: '',
				},
				{
					row_id: 'r-2',
					employee_id: 'e-1002',
					field: 'manager',
					new_value: 'Jane Doe',
					status: 'pending',
					result: '',
				},
			],
		},
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Read Change Requests',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'table',
				operation: 'lookup',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook with the contract change queue'),
				},
				worksheet: {
					__rl: true,
					mode: 'list',
					value: placeholder('Worksheet, for example Sheet1'),
				},
				table: {
					__rl: true,
					mode: 'list',
					value: placeholder(
						'Excel table that holds the change rows (select the rows, then Insert > Table)',
					),
				},
				lookupColumn: 'status',
				lookupValue: 'pending',
				options: { returnAllMatches: true },
			},
			output: [
				{
					row_id: 'r-1',
					employee_id: 'e-1001',
					field: 'salary',
					new_value: '65000',
					status: 'pending',
					result: '',
				},
				{
					row_id: 'r-2',
					employee_id: 'e-1002',
					field: 'manager',
					new_value: 'Jane Doe',
					status: 'pending',
					result: '',
				},
			],
		},
	},
};
const readChangeRequests = node(readChangeRequestsConfigs[SPREADSHEET]);

// Looks up the employee's current contract to check the requested change against it.
const fetchCurrentContract = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Fetch Current Contract',
		credentials: { httpTemplatedCustomAuth: newCredential('HR system account') },
		parameters: {
			method: 'GET',
			url: placeholder(
				'HR system API URL that returns an employee contract, for example https://api.example.com/hr/contracts',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendQuery: true,
			specifyQuery: 'keypair',
			queryParameters: {
				parameters: [{ name: 'employee_id', value: expr('{{ $json.employee_id }}') }],
			},
		},
		output: [
			{
				employee_id: 'e-1001',
				salary: 60000,
				title: 'Engineer',
				manager: 'John Smith',
				start_date: '2024-01-01',
			},
		],
	},
});

// Compares the requested change to the current contract and decides whether to apply it.
const validateChange = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Validate Change',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'row_id',
						value: expr("{{ $('Read Change Requests').item.json.row_id }}"),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'employee_id',
						value: expr("{{ $('Read Change Requests').item.json.employee_id }}"),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'field',
						value: expr("{{ $('Read Change Requests').item.json.field }}"),
						type: 'string',
					},
					{
						id: 'a4',
						name: 'new_value',
						value: expr("{{ $('Read Change Requests').item.json.new_value }}"),
						type: 'string',
					},
					{
						id: 'a5',
						name: 'valid',
						value: expr(
							"{{ ['salary', 'title'].includes($('Read Change Requests').item.json.field) && String($json[$('Read Change Requests').item.json.field]) !== $('Read Change Requests').item.json.new_value }}",
						),
						type: 'boolean',
					},
					{
						id: 'a6',
						name: 'reason',
						value: expr(
							"{{ !['salary', 'title'].includes($('Read Change Requests').item.json.field) ? 'Field is not editable' : (String($json[$('Read Change Requests').item.json.field]) === $('Read Change Requests').item.json.new_value ? 'New value matches the current contract' : 'Valid change') }}",
						),
						type: 'string',
					},
				],
			},
		},
	},
});

// True when the requested field is editable and the new value differs from the current contract.
const isValid = ifElse({
	version: 2.2,
	config: {
		name: 'Is Valid',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.valid }}'),
						rightValue: '',
						operator: { type: 'boolean', operation: 'true', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Applies the validated change to the employee's contract.
const applyChange = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Apply Change',
		credentials: { httpTemplatedCustomAuth: newCredential('HR system account') },
		parameters: {
			method: 'POST',
			url: placeholder(
				'HR system API URL that updates a contract field, for example https://api.example.com/hr/contracts/update',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: expr(
				'{{ JSON.stringify({ employee_id: $json.employee_id, field: $json.field, new_value: $json.new_value }) }}',
			),
		},
	},
});

// Spreadsheet: one ready node per tool. It writes status and result to the row that matches
// row_id and reads the Validate Change fields.
const logResultConfigs = {
	sheets: {
		type: 'n8n-nodes-base.googleSheets',
		version: 4.7,
		config: {
			name: 'Log Result',
			credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
			parameters: {
				resource: 'sheet',
				operation: 'appendOrUpdate',
				authentication: 'oAuth2',
				documentId: {
					__rl: true,
					mode: 'url',
					value: placeholder('Google Sheets URL of the contract change queue'),
				},
				sheetName: {
					__rl: true,
					mode: 'name',
					value: placeholder('Sheet tab name, for example Sheet1'),
				},
				columns: {
					mappingMode: 'defineBelow',
					value: {
						row_id: expr("{{ $('Validate Change').item.json.row_id }}"),
						status: expr("{{ $('Validate Change').item.json.valid ? 'applied' : 'rejected' }}"),
						result: expr("{{ $('Validate Change').item.json.reason }}"),
					},
					schema: [
						{
							id: 'row_id',
							displayName: 'row_id',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: true,
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
						{
							id: 'result',
							displayName: 'result',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
					],
					matchingColumns: ['row_id'],
				},
			},
		},
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Log Result',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'upsert',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook with the contract change queue'),
				},
				worksheet: {
					__rl: true,
					mode: 'list',
					value: placeholder('Worksheet, for example Sheet1'),
				},
				dataMode: 'define',
				columnToMatchOn: 'row_id',
				valueToMatchOn: expr("{{ $('Validate Change').item.json.row_id }}"),
				fieldsUi: {
					values: [
						{
							column: 'status',
							fieldValue: expr(
								"{{ $('Validate Change').item.json.valid ? 'applied' : 'rejected' }}",
							),
						},
						{ column: 'result', fieldValue: expr("{{ $('Validate Change').item.json.reason }}") },
					],
				},
			},
		},
	},
};
const logResult = node(logResultConfigs[SPREADSHEET]);

export default workflow('id', 'Contract Change Validation')
	.add(hourlySchedule)
	.to(readChangeRequests)
	.to(fetchCurrentContract)
	.to(validateChange)
	.to(isValid.onTrue(applyChange).onFalse(logResult))
	.add(applyChange)
	.to(logResult);
