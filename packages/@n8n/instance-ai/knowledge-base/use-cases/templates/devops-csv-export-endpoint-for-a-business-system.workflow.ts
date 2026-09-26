// Use case: devops / CSV Export Endpoint for a Business System.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Call GET <webhook url>/export?id=<export id>. The response is a CSV file.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// Receives the export request. The response comes from a Respond to Webhook node.
const exportRequest = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'Export Request',
		parameters: { httpMethod: 'GET', path: 'export', responseMode: 'responseNode', options: {} },
		output: [{ headers: {}, params: {}, query: { id: '1042' }, body: {} }],
	},
});

// True when the request names the export.
const hasRequiredParameters = ifElse({
	version: 2.2,
	config: {
		name: 'Has Required Parameters',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.query.id || "" }}'),
						rightValue: '',
						operator: { type: 'string', operation: 'notEmpty', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Fetches the records of the export from the business system. The next node reads $json.records.
const fetchRecords = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Fetch Records',
		credentials: { httpTemplatedCustomAuth: newCredential('Business system account') },
		parameters: {
			method: 'GET',
			url: placeholder(
				'Records endpoint of the business system, for example https://api.example.com/v1/contacts',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendQuery: true,
			specifyQuery: 'keypair',
			queryParameters: { parameters: [{ name: 'list_id', value: expr('{{ $json.query.id }}') }] },
		},
		output: [
			{
				records: [
					{ id: 1, name: 'Jane Doe', email: 'jane@example.com', phone: '+1 555 0100' },
					{ id: 2, name: 'John Roe', email: 'john@example.com', phone: '+1 555 0101' },
				],
			},
		],
	},
});

// One item per record.
const splitRecords = node({
	type: 'n8n-nodes-base.splitOut',
	version: 1,
	config: { name: 'Split Records', parameters: { fieldToSplitOut: 'records', options: {} } },
});

// Builds one CSV file from all records.
const buildCsv = node({
	type: 'n8n-nodes-base.convertToFile',
	version: 1.1,
	config: {
		name: 'Build CSV',
		parameters: {
			operation: 'csv',
			options: {
				fileName: expr("{{ 'export-' + $('Export Request').first().json.query.id + '.csv' }}"),
			},
		},
	},
});

// Returns the CSV file as the response.
const returnCsv = node({
	type: 'n8n-nodes-base.respondToWebhook',
	version: 1.5,
	config: {
		name: 'Return CSV',
		parameters: { respondWith: 'binary', responseDataSource: 'automatically' },
	},
});

// Rejects a request without an export id.
const rejectRequest = node({
	type: 'n8n-nodes-base.respondToWebhook',
	version: 1.5,
	config: {
		name: 'Reject Request',
		parameters: {
			respondWith: 'json',
			responseBody: expr('{{ { "error": "Missing query parameter: id" } }}'),
			options: { responseCode: 400 },
		},
	},
});

export default workflow('id', 'CSV Export Endpoint for a Business System')
	.add(exportRequest)
	.to(hasRequiredParameters.onTrue(fetchRecords).onFalse(rejectRequest))
	.add(fetchRecords)
	.to(splitRecords)
	.to(buildCsv)
	.to(returnCsv);
