// Use case: customer-support / Payment Notifications to Invoices and a Ledger.
// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The payment provider posts { reference, status: { status }, amount: { total, currency },
// payer: { name, email } }. Map your provider's fields in Compute Tax and Is Approved.
// The ledger sheet has the columns date, reference, invoice_number, customer, net, tax, total.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// Receives the payment result. Register the production URL in the payment provider.
const paymentWebhook = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'Payment Webhook',
		parameters: { httpMethod: 'POST', path: 'payment-notification', options: {} },
		output: [
			{
				headers: {},
				params: {},
				query: {},
				body: {
					reference: 'ORD-1042',
					status: { status: 'APPROVED' },
					amount: { total: 121, currency: 'EUR' },
					payer: { name: 'Jane Doe', email: 'jane@example.com' },
				},
			},
		],
	},
});

// True when the payment was approved.
const isApproved = ifElse({
	version: 2.2,
	config: {
		name: 'Is Approved',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.body.status.status }}'),
						rightValue: 'APPROVED',
						operator: { type: 'string', operation: 'equals' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
const SPREADSHEET = 'sheets';

// One ready writer per tool. Each appends a rejected payment to the rejections sheet.
const rejectionWriters = {
	sheets: {
		type: 'n8n-nodes-base.googleSheets',
		version: 4.7,
		config: {
			name: 'Log Rejection',
			credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
			parameters: {
				resource: 'sheet',
				operation: 'append',
				authentication: 'oAuth2',
				documentId: {
					__rl: true,
					mode: 'url',
					value: placeholder('Google Sheets URL of the accounting workbook'),
				},
				sheetName: {
					__rl: true,
					mode: 'name',
					value: placeholder('Sheet tab name for rejected payments, for example Rejections'),
				},
				columns: {
					mappingMode: 'defineBelow',
					value: {
						date: expr('{{ $now.toISODate() }}'),
						reference: expr('{{ $json.body.reference }}'),
						status: expr('{{ $json.body.status.status }}'),
						total: expr('{{ $json.body.amount.total }}'),
						customer: expr('{{ $json.body.payer.email }}'),
					},
					schema: [
						{
							id: 'date',
							displayName: 'date',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'reference',
							displayName: 'reference',
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
						{
							id: 'total',
							displayName: 'total',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'customer',
							displayName: 'customer',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
					],
					matchingColumns: [],
				},
				options: {},
			},
		},
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Log Rejection',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'append',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook of the accounting records'),
				},
				worksheet: {
					__rl: true,
					mode: 'list',
					value: placeholder('Worksheet for rejected payments, for example Rejections'),
				},
				dataMode: 'define',
				fieldsUi: {
					values: [
						{ column: 'date', fieldValue: expr('{{ $now.toISODate() }}') },
						{ column: 'reference', fieldValue: expr('{{ $json.body.reference }}') },
						{ column: 'status', fieldValue: expr('{{ $json.body.status.status }}') },
						{ column: 'total', fieldValue: expr('{{ $json.body.amount.total }}') },
						{ column: 'customer', fieldValue: expr('{{ $json.body.payer.email }}') },
					],
				},
			},
		},
	},
};
const logRejection = node(rejectionWriters[SPREADSHEET]);

// Splits the total into net and tax. Change 0.21 to your tax rate.
const computeTax = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Compute Tax',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'reference',
						value: expr('{{ $json.body.reference }}'),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'customer_name',
						value: expr('{{ $json.body.payer.name }}'),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'customer_email',
						value: expr('{{ $json.body.payer.email }}'),
						type: 'string',
					},
					{
						id: 'a4',
						name: 'currency',
						value: expr('{{ $json.body.amount.currency }}'),
						type: 'string',
					},
					{ id: 'a5', name: 'total', value: expr('{{ $json.body.amount.total }}'), type: 'number' },
					{
						id: 'a6',
						name: 'net',
						value: expr('{{ Math.round(($json.body.amount.total / 1.21) * 100) / 100 }}'),
						type: 'number',
					},
					{
						id: 'a7',
						name: 'tax',
						value: expr(
							'{{ Math.round(($json.body.amount.total - $json.body.amount.total / 1.21) * 100) / 100 }}',
						),
						type: 'number',
					},
				],
			},
		},
	},
});

// Creates the electronic invoice. The next node reads $json.invoice_number.
const createInvoice = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Create Invoice',
		credentials: { httpTemplatedCustomAuth: newCredential('Invoicing service account') },
		parameters: {
			method: 'POST',
			url: placeholder(
				'Invoice creation endpoint of the e-invoicing service, for example https://api.example.com/invoices',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr(
				'{{ JSON.stringify({ reference: $json.reference, customer: { name: $json.customer_name, email: $json.customer_email }, currency: $json.currency, net: $json.net, tax: $json.tax, total: $json.total }) }}',
			),
		},
		output: [{ invoice_number: 'INV-2026-0042', status: 'issued' }],
	},
});

// One ready writer per tool. Each appends the accounting entry. It reads $json.invoice_number
// and the amounts from Compute Tax.
const ledgerWriters = {
	sheets: {
		type: 'n8n-nodes-base.googleSheets',
		version: 4.7,
		config: {
			name: 'Append Ledger Entry',
			credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
			parameters: {
				resource: 'sheet',
				operation: 'append',
				authentication: 'oAuth2',
				documentId: {
					__rl: true,
					mode: 'url',
					value: placeholder('Google Sheets URL of the accounting workbook'),
				},
				sheetName: {
					__rl: true,
					mode: 'name',
					value: placeholder('Sheet tab name of the ledger, for example Ledger'),
				},
				columns: {
					mappingMode: 'defineBelow',
					value: {
						date: expr('{{ $now.toISODate() }}'),
						reference: expr("{{ $('Compute Tax').item.json.reference }}"),
						invoice_number: expr('{{ $json.invoice_number }}'),
						customer: expr("{{ $('Compute Tax').item.json.customer_name }}"),
						net: expr("{{ $('Compute Tax').item.json.net }}"),
						tax: expr("{{ $('Compute Tax').item.json.tax }}"),
						total: expr("{{ $('Compute Tax').item.json.total }}"),
					},
					schema: [
						{
							id: 'date',
							displayName: 'date',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'reference',
							displayName: 'reference',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'invoice_number',
							displayName: 'invoice_number',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'customer',
							displayName: 'customer',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'net',
							displayName: 'net',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'tax',
							displayName: 'tax',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
						{
							id: 'total',
							displayName: 'total',
							required: false,
							defaultMatch: false,
							display: true,
							type: 'string',
							canBeUsedToMatch: false,
						},
					],
					matchingColumns: [],
				},
				options: {},
			},
		},
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Append Ledger Entry',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'append',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook of the accounting records'),
				},
				worksheet: {
					__rl: true,
					mode: 'list',
					value: placeholder('Worksheet of the ledger, for example Ledger'),
				},
				dataMode: 'define',
				fieldsUi: {
					values: [
						{ column: 'date', fieldValue: expr('{{ $now.toISODate() }}') },
						{ column: 'reference', fieldValue: expr("{{ $('Compute Tax').item.json.reference }}") },
						{ column: 'invoice_number', fieldValue: expr('{{ $json.invoice_number }}') },
						{
							column: 'customer',
							fieldValue: expr("{{ $('Compute Tax').item.json.customer_name }}"),
						},
						{ column: 'net', fieldValue: expr("{{ $('Compute Tax').item.json.net }}") },
						{ column: 'tax', fieldValue: expr("{{ $('Compute Tax').item.json.tax }}") },
						{ column: 'total', fieldValue: expr("{{ $('Compute Tax').item.json.total }}") },
					],
				},
			},
		},
	},
};
const appendLedgerEntry = node(ledgerWriters[SPREADSHEET]);

export default workflow('id', 'Payment Notifications to Invoices and a Ledger')
	.add(paymentWebhook)
	.to(isApproved.onTrue(computeTax).onFalse(logRejection))
	.add(computeTax)
	.to(createInvoice)
	.to(appendLedgerEntry);
