// Use case: product-design / Webhook Messages into Help Desk Tickets.
// Swap a tool: replace only the node marked with that family. Keep the variable name
// and the fields the next node reads.
// Expected webhook body: { sender_name, sender_email, subject, message, priority }.
// priority is optional; it defaults to normal.
import { workflow, node, trigger, newCredential, expr } from '@n8n/workflow-sdk';

// An external app or a form posts JSON here: { sender_name, sender_email, subject, message,
// priority }. priority is optional.
const inboundMessage = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'Inbound Message',
		parameters: { httpMethod: 'POST', path: 'inbound-message', responseMode: 'responseNode' },
		output: [
			{
				body: {
					sender_name: 'Jane Doe',
					sender_email: 'jane@example.com',
					subject: 'Cannot log in',
					message: 'I get an error when I try to sign in.',
					priority: 'normal',
				},
			},
		],
	},
});

// Maps the incoming message to a ticket subject, description, requester email and priority.
const prepareTicket = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Ticket',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'subject',
						value: expr(
							'{{ $json.body.subject || ("Message from " + ($json.body.sender_name || "a customer")) }}',
						),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'description',
						value: expr(
							'{{ ($json.body.message || "") + "\\n\\n" + "From: " + ($json.body.sender_name || "A customer") + " <" + ($json.body.sender_email || "") + ">" }}',
						),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'requesterEmail',
						value: expr('{{ $json.body.sender_email || "" }}'),
						type: 'string',
					},
					{
						id: 'a4',
						name: 'priority',
						value: expr('{{ $json.body.priority || "normal" }}'),
						type: 'string',
					},
				],
			},
		},
	},
});

// [help desk] Zendesk. Swap for Freshdesk, Help Scout or Intercom: replace this node only.
// It reads $json.description and $json.subject. The next node reads $json.id.
// ponytail: this node version has no separate requester field on ticket create; the
// requester name and email are folded into the description text instead.
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
			description: expr('{{ $json.description }}'),
			additionalFields: { subject: expr('{{ $json.subject }}') },
		},
		output: [{ id: 1234, status: 'new', subject: 'Message from Jane Doe' }],
	},
});

// Returns the created ticket to the caller.
const respondToCaller = node({
	type: 'n8n-nodes-base.respondToWebhook',
	version: 1.5,
	config: {
		name: 'Respond to Caller',
		parameters: { respondWith: 'firstIncomingItem' },
	},
});

export default workflow('id', 'Webhook Messages into Help Desk Tickets')
	.add(inboundMessage)
	.to(prepareTicket)
	.to(createTicket)
	.to(respondToCaller);
