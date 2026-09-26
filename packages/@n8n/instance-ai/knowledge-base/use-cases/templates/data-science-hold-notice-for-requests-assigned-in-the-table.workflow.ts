// Use case: data-science / Hold Notice for Requests Assigned in the Table.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The requests table has the fields Request ID, Title, Description, Requester email, Assignee,
// Assigned at (a "last modified time" field on Assignee), Ticket ID and Acknowledged at.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// [database] Tool. Swap for another database: replace this node only. It returns one item per
// record whose Assigned at changed, with $json.id and $json.fields.
const requestAssigned = trigger({
	type: 'n8n-nodes-base.airtableTrigger',
	version: 1,
	config: {
		name: 'Request Assigned',
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
			triggerField: 'Assigned at',
			additionalFields: { formula: "AND({Assignee} != '', {Acknowledged at} = '')" },
		},
		output: [
			{
				id: 'recAcme0002',
				createdTime: '2026-09-17T09:30:00.000Z',
				fields: {
					'Request ID': 'REQ-2042',
					Title: 'Custom offer for 200 units',
					Description: 'The customer asks for a volume price on order 1042.',
					'Requester email': 'jane@example.com',
					Assignee: 'Offers team',
					'Assigned at': '2026-09-17T10:00:00.000Z',
					'Ticket ID': '',
				},
			},
		],
	},
});

// True when the record already holds a ticket id.
const hasTicket = ifElse({
	version: 2.2,
	config: {
		name: 'Has Ticket',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.fields["Ticket ID"] || "" }}'),
						rightValue: '',
						operator: { type: 'string', operation: 'notEmpty', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// [help desk] Tool. Swap for another help desk: replace this node only. It puts the existing
// ticket on hold with a note. The next node reads $json.id and $json.updated_at.
const holdTicket = node({
	type: 'n8n-nodes-base.zendesk',
	version: 1,
	config: {
		name: 'Hold Ticket',
		credentials: { zendeskApi: newCredential('Zendesk account') },
		parameters: {
			resource: 'ticket',
			operation: 'update',
			authentication: 'apiToken',
			id: expr('{{ $json.fields["Ticket ID"] }}'),
			updateFields: {
				status: 'hold',
				internalNote: expr(
					'{{ "We received request " + $json.fields["Request ID"] + ". Assignee: " + $json.fields.Assignee + ". This ticket updates automatically when the team answers." }}',
				),
			},
		},
		output: [{ id: 1234, status: 'hold', updated_at: '2026-09-17T10:01:00.000Z' }],
	},
});

// [help desk] Tool. Swap for another help desk: replace this node only. It creates the ticket
// on hold when the record has none. The next node reads $json.id and $json.updated_at.
const createTicketOnHold = node({
	type: 'n8n-nodes-base.zendesk',
	version: 1,
	config: {
		name: 'Create Ticket on Hold',
		credentials: { zendeskApi: newCredential('Zendesk account') },
		parameters: {
			resource: 'ticket',
			operation: 'create',
			authentication: 'apiToken',
			description: expr(
				'{{ $json.fields.Description + "\\n\\nRequester: " + $json.fields["Requester email"] + "\\nRequest: " + $json.fields["Request ID"] + "\\nAssignee: " + $json.fields.Assignee }}',
			),
			additionalFields: { subject: expr('{{ $json.fields.Title }}'), status: 'hold' },
		},
		output: [{ id: 1235, status: 'hold', updated_at: '2026-09-17T10:01:00.000Z' }],
	},
});

// [database] Tool. Swap for another database: replace this node only. It writes the ticket id
// and the acknowledgment time to the record that started the run.
const markAcknowledged = node({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	config: {
		name: 'Mark Acknowledged',
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
					id: expr("{{ $('Request Assigned').item.json.id }}"),
					'Ticket ID': expr('{{ String($json.id) }}'),
					'Acknowledged at': expr('{{ $json.updated_at }}'),
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
					{
						id: 'Acknowledged at',
						displayName: 'Acknowledged at',
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

export default workflow('id', 'Hold Notice for Requests Assigned in the Table')
	.add(requestAssigned)
	.to(hasTicket.onTrue(holdTicket).onFalse(createTicketOnHold))
	.add(holdTicket)
	.to(markAcknowledged)
	.add(createTicketOnHold)
	.to(markAcknowledged);
