// Use case: other / Daily BI Report Export to File Storage.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Setup: the BI tool's report API returns an array of rows shaped { email, plan, amount }.
// Rows from the QA test domain must not reach the report.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// QA checks use this domain; it is not a real customer.
const TEST_DOMAIN = '@test.example.com';

// Runs once a day at 05:00.
const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Daily at 05:00',
		parameters: {
			rule: {
				interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 5, triggerAtMinute: 0 }],
			},
		},
	},
});

// Runs the saved report in the BI tool for yesterday's date range.
const runReport = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Run Report',
		credentials: { httpTemplatedCustomAuth: newCredential('BI tool API') },
		parameters: {
			method: 'POST',
			url: placeholder(
				'BI tool report run URL, for example https://api.example.com/reports/123/run',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr(
				'{{ JSON.stringify({ from: $now.minus({ days: 1 }).startOf("day").toISO(), to: $now.minus({ days: 1 }).endOf("day").toISO() }) }}',
			),
		},
	},
	output: [
		{ email: 'jane.doe@example.com', plan: 'pro', amount: 49 },
		{ email: 'qa.bot@test.example.com', plan: 'trial', amount: 0 },
	],
});

// Drops rows from the QA test domain.
const dropTestRows = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Drop Test Rows',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.email }}'),
						rightValue: TEST_DOMAIN,
						operator: { type: 'string', operation: 'notEndsWith' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Converts the remaining rows to a CSV file.
const buildCsv = node({
	type: 'n8n-nodes-base.convertToFile',
	version: 1.1,
	config: {
		name: 'Build CSV',
		parameters: { operation: 'csv', options: { fileName: 'bi_report.csv' } },
	},
});

// [file storage] Box. Swap for another file storage tool: replace this node only.
// It reads the CSV binary file from Build CSV.
const uploadReport = node({
	type: 'n8n-nodes-base.box',
	version: 1,
	config: {
		name: 'Upload Report',
		credentials: { boxOAuth2Api: newCredential('Box account') },
		parameters: {
			resource: 'file',
			operation: 'upload',
			binaryData: true,
			parentId: placeholder('Box folder ID to upload the report into'),
		},
	},
});

export default workflow('id', 'Daily BI Report Export to File Storage')
	.add(schedule)
	.to(runReport)
	.to(dropTestRows)
	.to(buildCsv)
	.to(uploadReport);
