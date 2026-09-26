// Use case: devops / Changed Rows Copy Between Databases.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Both tables share the columns id, name, state, status and updated_at.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every day at 05:00.
const everyMorning = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Morning',
		parameters: {
			rule: {
				interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 5, triggerAtMinute: 0 }],
			},
		},
	},
});

// [database] Tool. Swap for another database: replace this node only. It returns one item per
// changed row with the columns id, name, state, status and updated_at.
const fetchChangedRows = node({
	type: 'n8n-nodes-base.postgres',
	version: 2.7,
	config: {
		name: 'Fetch Changed Rows',
		credentials: { postgres: newCredential('Source database account') },
		parameters: {
			operation: 'executeQuery',
			query: `SELECT id, name, state, status, updated_at
FROM places
WHERE updated_at >= now() - interval '2 days'
ORDER BY updated_at`,
			options: {},
		},
		output: [
			{
				id: 1042,
				name: 'Acme Downtown',
				state: 'CA',
				status: 'active',
				updated_at: '2026-09-17T10:15:00.000Z',
			},
		],
	},
});

// [database] Tool. Swap for another database: replace this node only. It upserts the row by id.
const upsertRows = node({
	type: 'n8n-nodes-base.postgres',
	version: 2.7,
	config: {
		name: 'Upsert Rows',
		credentials: { postgres: newCredential('Target database account') },
		parameters: {
			operation: 'upsert',
			schema: { __rl: true, mode: 'list', value: 'public' },
			table: {
				__rl: true,
				mode: 'name',
				value: placeholder('Target table name, for example places'),
			},
			columns: {
				mappingMode: 'defineBelow',
				value: {
					id: expr('{{ $json.id }}'),
					name: expr('{{ $json.name }}'),
					state: expr('{{ $json.state }}'),
					status: expr('{{ $json.status }}'),
					updated_at: expr('{{ $json.updated_at }}'),
				},
				matchingColumns: ['id'],
				schema: [
					{
						id: 'id',
						displayName: 'id',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'number',
						canBeUsedToMatch: true,
					},
					{
						id: 'name',
						displayName: 'name',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: true,
					},
					{
						id: 'state',
						displayName: 'state',
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
						canBeUsedToMatch: true,
					},
					{
						id: 'updated_at',
						displayName: 'updated_at',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'dateTime',
						canBeUsedToMatch: true,
					},
				],
			},
			options: {},
		},
	},
});

export default workflow('id', 'Changed Rows Copy Between Databases')
	.add(everyMorning)
	.to(fetchChangedRows)
	.to(upsertRows);
