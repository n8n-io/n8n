// Use case: data-science / Bug Tickets into a Triage Table.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// A Zendesk trigger on the "product issue" tag calls the webhook with the ticket fields.
// The triage table has the fields Ticket ID, Status, Topic, Requester, Issue date, URL, Description.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Receives the tagged ticket. Register the production URL as a webhook in the help desk.
const taggedTicket = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'Tagged Ticket',
		parameters: { httpMethod: 'POST', path: 'product-issue', options: {} },
		output: [
			{
				headers: {},
				params: {},
				query: {},
				body: {
					ticket: {
						id: 4711,
						status: 'open',
						topic: 'Checkout',
						requester_email: 'jane@example.com',
						bug_date: '2026-09-16',
						url: 'https://app.example.com/checkout',
						description: 'The pay button does nothing after the coupon step.',
					},
				},
			},
		],
	},
});

// Maps the ticket to the table fields.
const prepareBugReport = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Bug Report',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'ticket_id',
						value: expr('{{ String($json.body.ticket.id) }}'),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'status',
						value: expr('{{ $json.body.ticket.status }}'),
						type: 'string',
					},
					{ id: 'a3', name: 'topic', value: expr('{{ $json.body.ticket.topic }}'), type: 'string' },
					{
						id: 'a4',
						name: 'requester',
						value: expr('{{ $json.body.ticket.requester_email }}'),
						type: 'string',
					},
					{
						id: 'a5',
						name: 'issue_date',
						value: expr('{{ $json.body.ticket.bug_date }}'),
						type: 'string',
					},
					{ id: 'a6', name: 'url', value: expr('{{ $json.body.ticket.url }}'), type: 'string' },
					{
						id: 'a7',
						name: 'description',
						value: expr('{{ $json.body.ticket.description }}'),
						type: 'string',
					},
				],
			},
		},
	},
});

// [database] Tool. Swap for another database: replace this node only. It reads the fields
// from Prepare Bug Report.
const addToTriageTable = node({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	config: {
		name: 'Add to Triage Table',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		parameters: {
			authentication: 'airtableTokenApi',
			resource: 'record',
			operation: 'create',
			base: { __rl: true, mode: 'id', value: placeholder('Airtable base ID of the product base') },
			table: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable table ID of the Bug triage table'),
			},
			columns: {
				mappingMode: 'defineBelow',
				value: {
					'Ticket ID': expr('{{ $json.ticket_id }}'),
					Status: expr('{{ $json.status }}'),
					Topic: expr('{{ $json.topic }}'),
					Requester: expr('{{ $json.requester }}'),
					'Issue date': expr('{{ $json.issue_date }}'),
					URL: expr('{{ $json.url }}'),
					Description: expr('{{ $json.description }}'),
				},
				schema: [
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
						id: 'Status',
						displayName: 'Status',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
					{
						id: 'Topic',
						displayName: 'Topic',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
					{
						id: 'Requester',
						displayName: 'Requester',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
					{
						id: 'Issue date',
						displayName: 'Issue date',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
					{
						id: 'URL',
						displayName: 'URL',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
					{
						id: 'Description',
						displayName: 'Description',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
				],
			},
			options: { typecast: true },
		},
	},
});

// [help desk] Tool. Swap for another help desk: replace this node only. It marks the ticket
// as reported with a tag and an internal note.
const markTicketReported = node({
	type: 'n8n-nodes-base.zendesk',
	version: 1,
	config: {
		name: 'Mark Ticket Reported',
		credentials: { zendeskApi: newCredential('Zendesk account') },
		parameters: {
			resource: 'ticket',
			operation: 'update',
			authentication: 'apiToken',
			id: expr("{{ $('Prepare Bug Report').item.json.ticket_id }}"),
			updateFields: {
				internalNote: 'Reported to the product team in the bug triage table.',
				tags: ['reported_to_product'],
			},
		},
	},
});

export default workflow('id', 'Bug Tickets into a Triage Table')
	.add(taggedTicket)
	.to(prepareBugReport)
	.to(addToTriageTable)
	.to(markTicketReported);
