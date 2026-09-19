// Use case: data-science / Help Desk Ticket for Each New Table Request.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The requests table has the fields Title, Description, Requester email, Created and
// Ticket ID. Created is a "created time" field the trigger watches.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// [database] Tool. Swap for another database: replace this node only. It returns one item
// per new record with $json.id and $json.fields.
const newRequest = trigger({
	type: 'n8n-nodes-base.airtableTrigger',
	version: 1,
	config: {
		name: 'New Request',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		parameters: {
			pollTimes: { item: [{ mode: 'everyMinute' }] },
			authentication: 'airtableTokenApi',
			baseId: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable base ID of the requests base'),
			},
			tableId: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable table ID of the Requests table'),
			},
			triggerField: 'Created',
			additionalFields: {
				viewId: placeholder('Airtable view ID that lists the requests without a ticket'),
			},
		},
		output: [
			{
				id: 'recAcme0001',
				createdTime: '2026-09-17T09:30:00.000Z',
				fields: {
					Title: 'Broken zipper on order 1042',
					Description: 'The zipper of the jacket broke after two days.',
					'Requester email': 'jane@example.com',
					Created: '2026-09-17T09:30:00.000Z',
				},
			},
		],
	},
});

// [help desk] Tool. Swap for another help desk: replace this node only. It reads
// $json.fields. The next node reads $json.id, the new ticket id.
const createTicket = node({
	type: 'n8n-nodes-base.zendesk',
	version: 1,
	config: {
		name: 'Create Ticket',
		credentials: { zendeskApi: newCredential('Zendesk account') },
		parameters: {
			resource: 'ticket',
			operation: 'create',
			authentication: 'apiToken',
			description: expr(
				'{{ $json.fields.Description + "\\n\\nRequester: " + $json.fields["Requester email"] + "\\nRequest record: " + $json.id }}',
			),
			additionalFields: { subject: expr('{{ $json.fields.Title }}'), type: 'problem' },
		},
		output: [{ id: 1234, status: 'new', subject: 'Broken zipper on order 1042' }],
	},
});

// [database] Tool. Swap for another database: replace this node only. It writes the ticket id
// to the record that started the run.
const writeTicketId = node({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	config: {
		name: 'Write Ticket ID',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		parameters: {
			authentication: 'airtableTokenApi',
			resource: 'record',
			operation: 'update',
			base: { __rl: true, mode: 'id', value: placeholder('Airtable base ID of the requests base') },
			table: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable table ID of the Requests table'),
			},
			columns: {
				mappingMode: 'defineBelow',
				matchingColumns: ['id'],
				value: {
					id: expr("{{ $('New Request').item.json.id }}"),
					'Ticket ID': expr('{{ String($json.id) }}'),
				},
				schema: [
					{
						id: 'id',
						displayName: 'id',
						required: false,
						defaultMatch: true,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
					{
						id: 'Ticket ID',
						displayName: 'Ticket ID',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
				],
			},
			options: {},
		},
	},
});

export default workflow('id', 'Help Desk Ticket for Each New Table Request')
	.add(newRequest)
	.to(createTicket)
	.to(writeTicketId);
