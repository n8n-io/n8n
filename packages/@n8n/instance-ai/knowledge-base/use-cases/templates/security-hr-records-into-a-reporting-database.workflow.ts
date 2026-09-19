// Use case: security / HR Records Into A Reporting Database.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// CREATE TABLE hr_records (employee_id text PRIMARY KEY, full_name text, department text,
// status text, updated_at timestamptz);
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

const SUPABASE_PROJECT = 'your-project-ref';

// Runs every 2 hours.
const everyTwoHours = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 2 Hours',
		parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 2 }] } },
	},
});

// Downloads the HR records changed since the last run.
const fetchChangedRecords = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Fetch Changed Records',
		credentials: { httpTemplatedCustomAuth: newCredential('HR system account') },
		parameters: {
			method: 'GET',
			url: placeholder(
				'HR system API URL that returns changed records, for example https://api.example.com/hr/records',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendQuery: true,
			specifyQuery: 'keypair',
			queryParameters: {
				parameters: [{ name: 'since', value: expr('{{ $now.minus({ hours: 2 }).toISO() }}') }],
			},
		},
		output: [
			{
				id: 'e-1001',
				full_name: 'Jane Doe',
				dept: 'Sales',
				is_active: true,
				last_modified: '2026-09-17T10:00:00.000Z',
			},
			{
				id: 'e-1002',
				full_name: 'John Smith',
				dept: 'Support',
				is_active: false,
				last_modified: '2026-09-17T11:30:00.000Z',
			},
		],
	},
});

// Renames the HR system fields to the reporting table's column names.
const normalizeRecord = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Normalize Record',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'employee_id', value: expr('{{ $json.id }}'), type: 'string' },
					{ id: 'a2', name: 'full_name', value: expr('{{ $json.full_name }}'), type: 'string' },
					{ id: 'a3', name: 'department', value: expr('{{ $json.dept }}'), type: 'string' },
					{
						id: 'a4',
						name: 'status',
						value: expr('{{ $json.is_active ? "active" : "inactive" }}'),
						type: 'string',
					},
					{
						id: 'a5',
						name: 'updated_at',
						value: expr('{{ $json.last_modified }}'),
						type: 'string',
					},
				],
			},
		},
	},
});

// [database] Tool. Swap for another database: replace this node only. It reads $json.employee_id,
// $json.full_name, $json.department, $json.status, $json.updated_at.
const upsertRow = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Upsert Row',
		credentials: { supabaseApi: newCredential('Supabase service key') },
		parameters: {
			method: 'POST',
			url: `https://${SUPABASE_PROJECT}.supabase.co/rest/v1/hr_records`,
			authentication: 'predefinedCredentialType',
			nodeCredentialType: 'supabaseApi',
			sendHeaders: true,
			specifyHeaders: 'keypair',
			headerParameters: { parameters: [{ name: 'Prefer', value: 'resolution=merge-duplicates' }] },
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: expr('{{ JSON.stringify($json) }}'),
		},
	},
});
// ponytail: one request per record, add an Aggregate before this node when more than a few
// hundred records change per run

export default workflow('id', 'HR Records Into A Reporting Database')
	.add(everyTwoHours)
	.to(fetchChangedRecords)
	.to(normalizeRecord)
	.to(upsertRow);
