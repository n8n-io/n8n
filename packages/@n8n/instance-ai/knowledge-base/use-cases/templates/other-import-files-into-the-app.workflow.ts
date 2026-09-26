// Use case: other / Import Files into the App Database.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Setup: the CSV export has the columns name and email. The app needs a data type name
// to create one object per row.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every 4 hours.
const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 4 Hours',
		parameters: {
			rule: { interval: [{ field: 'hours', hoursInterval: 4 }] },
		},
	},
});

// Downloads the CSV export as a binary file.
const downloadFile = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Download File',
		credentials: { httpTemplatedCustomAuth: newCredential('CSV export API') },
		parameters: {
			method: 'GET',
			url: placeholder('CSV export URL, for example https://api.example.com/exports/latest.csv'),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			options: { response: { response: { responseFormat: 'file' } } },
		},
	},
});

// Parses the downloaded CSV into rows.
const parseCsv = node({
	type: 'n8n-nodes-base.extractFromFile',
	version: 1.1,
	config: {
		name: 'Parse CSV',
		parameters: { operation: 'csv' },
	},
});

// Keeps only rows that have a name.
const rowsWithAName = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Rows with a Name',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.name }}'),
						rightValue: '',
						operator: { type: 'string', operation: 'notEmpty', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Adds the import timestamp to each row.
const prepareRow = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Row',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'name', value: expr('{{ $json.name }}'), type: 'string' },
					{ id: 'a2', name: 'email', value: expr('{{ $json.email }}'), type: 'string' },
					{ id: 'a3', name: 'imported_at', value: expr('{{ $now.toISO() }}'), type: 'string' },
				],
			},
		},
	},
});

// [app builder] Bubble. Swap for another app builder: replace this node only. It reads
// $json.name, $json.email, $json.imported_at.
const createRow = node({
	type: 'n8n-nodes-base.bubble',
	version: 1,
	config: {
		name: 'Create Row',
		credentials: { bubbleApi: newCredential('Bubble account') },
		parameters: {
			resource: 'object',
			operation: 'create',
			typeName: placeholder('Bubble data type name, for example contact'),
			properties: {
				property: [
					{ key: 'name', value: expr('{{ $json.name }}') },
					{ key: 'email', value: expr('{{ $json.email }}') },
					{ key: 'imported_at', value: expr('{{ $json.imported_at }}') },
				],
			},
		},
	},
});

export default workflow('id', 'Import Files into the App Database')
	.add(schedule)
	.to(downloadFile)
	.to(parseCsv)
	.to(rowsWithAName)
	.to(prepareRow)
	.to(createRow);
