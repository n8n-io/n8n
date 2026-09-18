// Use case: customer-support / Unassign Form Tickets in the Help Desk.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The help desk here is Intercom through its REST API with the Intercom credential.
// Set the ticket type and the agent in Keep Matching Tickets.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every hour at minute 45.
const everyHour = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Hour',
		parameters: {
			rule: { interval: [{ field: 'hours', hoursInterval: 1, triggerAtMinute: 45 }] },
		},
	},
});

// [help desk] Tool. Swap for another help desk: replace this node only. It returns the
// recent conversations. The next node reads $json.conversations.
const fetchConversations = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Fetch Conversations',
		credentials: { intercomApi: newCredential('Intercom account') },
		parameters: {
			method: 'GET',
			url: 'https://api.intercom.io/conversations',
			authentication: 'predefinedCredentialType',
			nodeCredentialType: 'intercomApi',
			sendQuery: true,
			specifyQuery: 'keypair',
			queryParameters: { parameters: [{ name: 'per_page', value: '150' }] },
		},
		output: [
			{
				conversations: [
					{
						id: '215469955170512',
						state: 'open',
						admin_assignee_id: 7815290,
						ticket: { id: '4711', ticket_type: 'In-app form' },
					},
				],
			},
		],
	},
});

// One item per conversation.
const oneItemPerConversation = node({
	type: 'n8n-nodes-base.splitOut',
	version: 1,
	config: {
		name: 'One Item per Conversation',
		parameters: { fieldToSplitOut: 'conversations', include: 'noOtherFields', options: {} },
	},
});

// Keeps the tickets of the given type that sit with the given agent.
const keepMatchingTickets = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Keep Matching Tickets',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.ticket ? $json.ticket.ticket_type : "" }}'),
						rightValue: placeholder('Ticket type to unassign, for example In-app form'),
						operator: { type: 'string', operation: 'equals' },
					},
					{
						id: 'c2',
						leftValue: expr('{{ String($json.admin_assignee_id) }}'),
						rightValue: placeholder(
							'Intercom admin ID of the agent whose tickets go back to the queue',
						),
						operator: { type: 'string', operation: 'equals' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// [help desk] Tool. Swap for another help desk: replace this node only. It reads
// $json.ticket.id and $json.admin_assignee_id. Assignee 0 puts the ticket back in the queue.
const unassignTicket = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Unassign Ticket',
		credentials: { intercomApi: newCredential('Intercom account') },
		parameters: {
			method: 'PUT',
			url: expr('{{ "https://api.intercom.io/tickets/" + $json.ticket.id }}'),
			authentication: 'predefinedCredentialType',
			nodeCredentialType: 'intercomApi',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr(
				'{{ JSON.stringify({ assignment: { admin_id: String($json.admin_assignee_id), assignee_id: "0" } }) }}',
			),
		},
	},
});

export default workflow('id', 'Unassign Form Tickets in the Help Desk')
	.add(everyHour)
	.to(fetchConversations)
	.to(oneItemPerConversation)
	.to(keepMatchingTickets)
	.to(unassignTicket);
