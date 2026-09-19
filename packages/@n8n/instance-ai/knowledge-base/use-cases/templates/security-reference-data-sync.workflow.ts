// Use case: security / Reference Data Sync.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Calls a source system API that starts a report job and a second API that returns the
// finished rows, then posts the rows in batches to an app backend API.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	splitInBatches,
	nextBatch,
} from '@n8n/workflow-sdk';

// Runs once a day.
const dailySchedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Daily Schedule',
		parameters: { rule: { interval: [{ field: 'days', triggerAtHour: 6, triggerAtMinute: 0 }] } },
	},
});

// Starts a report job on the source system.
const requestReport = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Request Report',
		credentials: { httpTemplatedCustomAuth: newCredential('Source system account') },
		parameters: {
			method: 'POST',
			url: placeholder(
				'Source system API URL that starts a report job, for example https://api.example.com/reports',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
		},
		output: [{ job_id: 'job_123' }],
	},
});

// Gives the source system time to finish building the report.
const waitForReport = node({
	type: 'n8n-nodes-base.wait',
	version: 1.1,
	config: {
		name: 'Wait For Report',
		parameters: { resume: 'timeInterval', amount: 30, unit: 'seconds' },
	},
});

// Downloads the finished report rows.
const fetchResults = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Fetch Results',
		credentials: { httpTemplatedCustomAuth: newCredential('Source system account') },
		parameters: {
			method: 'GET',
			url: placeholder(
				'Source system API URL that returns report rows, for example https://api.example.com/reports/results',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendQuery: true,
			specifyQuery: 'keypair',
			queryParameters: {
				parameters: [{ name: 'job_id', value: expr("{{ $('Request Report').item.json.job_id }}") }],
			},
		},
		output: [
			{ id: 1, name: 'Jane Doe', department: 'Sales', updated_at: '2026-09-17T06:00:00.000Z' },
			{ id: 2, name: 'John Smith', department: 'Support', updated_at: '2026-09-17T06:00:00.000Z' },
		],
	},
});

// Splits the rows into batches so each backend request stays small.
const batchRows = splitInBatches({
	version: 3,
	config: { name: 'Batch Rows', parameters: { batchSize: 200 } },
});

// Collects one batch of rows into a single item.
const collectBatch = node({
	type: 'n8n-nodes-base.aggregate',
	version: 1,
	config: {
		name: 'Collect Batch',
		parameters: {
			aggregate: 'aggregateAllItemData',
			destinationFieldName: 'data',
			include: 'allFields',
		},
	},
});

// Posts one batch of rows to the app backend.
const sendBatch = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Send Batch',
		credentials: { httpTemplatedCustomAuth: newCredential('App backend account') },
		parameters: {
			method: 'POST',
			url: placeholder(
				'App backend API URL that accepts report rows, for example https://api.example.com/reports/import',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: expr('{{ JSON.stringify({ rows: $json.data }) }}'),
		},
	},
});

export default workflow('id', 'Reference Data Sync')
	.add(dailySchedule)
	.to(requestReport)
	.to(waitForReport)
	.to(fetchResults)
	.to(batchRows.onEachBatch(collectBatch.to(sendBatch).to(nextBatch(batchRows))));
