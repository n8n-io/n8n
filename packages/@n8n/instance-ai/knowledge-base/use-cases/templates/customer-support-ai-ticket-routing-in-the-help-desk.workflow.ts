// Use case: customer-support / AI Ticket Routing in the Help Desk.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The help desk here is Gorgias through its REST API with HTTP basic auth (email + API key).
// A Gorgias HTTP integration on "Ticket created" posts { ticket_id, subject, message, channel,
// tags }. Map other help desks' fields in Prepare Ticket.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	languageModel,
	outputParser,
} from '@n8n/workflow-sdk';

// Receives the new ticket. Register the production URL in the help desk integration.
const newTicket = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'New Ticket',
		parameters: { httpMethod: 'POST', path: 'new-ticket', options: {} },
		output: [
			{
				headers: {},
				params: {},
				query: {},
				body: {
					ticket_id: 352753449,
					subject: 'Where is my order?',
					message: 'I ordered two weeks ago and the tracking page has not moved. Order 1042.',
					channel: 'email',
					tags: ['website'],
				},
			},
		],
	},
});

// Skips the tickets that are closed automatically.
const keepOpenTickets = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Keep Open Tickets',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.body.tags || [] }}'),
						rightValue: 'auto-close',
						operator: { type: 'array', operation: 'notContains', rightType: 'any' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Ticket fields plus the help desk settings the later nodes read.
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
						name: 'ticket_id',
						value: expr('{{ $json.body.ticket_id }}'),
						type: 'string',
					},
					{ id: 'a2', name: 'subject', value: expr('{{ $json.body.subject }}'), type: 'string' },
					{ id: 'a3', name: 'message', value: expr('{{ $json.body.message }}'), type: 'string' },
					{ id: 'a4', name: 'channel', value: expr('{{ $json.body.channel }}'), type: 'string' },
					{
						id: 'a5',
						name: 'api_url',
						value: placeholder('Gorgias API base URL, for example https://acme.gorgias.com/api'),
						type: 'string',
					},
					{
						id: 'a6',
						name: 'reason_field_id',
						value: placeholder('ID of the Contact reason custom field in Gorgias'),
						type: 'string',
					},
					{
						id: 'a7',
						name: 'sales_team_id',
						value: placeholder('Gorgias team ID of the sales team'),
						type: 'string',
					},
					{
						id: 'a8',
						name: 'post_purchase_team_id',
						value: placeholder('Gorgias team ID of the post-purchase team'),
						type: 'string',
					},
				],
			},
		},
	},
});

// [AI model] Tool. Swap for another AI model: replace the chat model subnode only.
// Reads $json.subject and $json.message. The next nodes read $json.output.contact_reason
// and $json.output.team.
const classifyTicket = node({
	type: '@n8n/n8n-nodes-langchain.chainLlm',
	version: 1.7,
	config: {
		name: 'Classify Ticket',
		parameters: {
			promptType: 'define',
			text: expr('{{ "Subject: " + $json.subject + "\\n\\nMessage:\\n" + $json.message }}'),
			hasOutputParser: true,
			messages: {
				messageValues: [
					{
						type: 'SystemMessagePromptTemplate',
						message:
							'You route customer service tickets for an online shop. Return the contact reason as one of: Order status, Shipping delay, Return or refund, Product question, Subscription, Other. Return the team as "sales" for questions before a purchase and "post_purchase" for everything about an existing order.',
					},
				],
			},
		},
		subnodes: {
			model: languageModel({
				type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
				version: 1,
				config: {
					name: 'Google Gemini Chat Model',
					credentials: { googlePalmApi: newCredential('Google Gemini account') },
					parameters: { modelName: 'models/gemini-2.5-flash', options: {} },
				},
			}),
			outputParser: outputParser({
				type: '@n8n/n8n-nodes-langchain.outputParserStructured',
				version: 1.3,
				config: {
					name: 'Structured Output',
					parameters: {
						schemaType: 'fromJson',
						jsonSchemaExample: '{ "contact_reason": "Shipping delay", "team": "post_purchase" }',
					},
				},
			}),
		},
		output: [{ output: { contact_reason: 'Shipping delay', team: 'post_purchase' } }],
	},
});

// [help desk] Tool. Swap for another help desk: replace this node only. It writes
// $json.output.contact_reason to the custom field of the ticket in Prepare Ticket.
const setContactReason = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Set Contact Reason',
		credentials: { httpBasicAuth: newCredential('Gorgias account') },
		parameters: {
			method: 'PUT',
			url: expr(
				"{{ $('Prepare Ticket').item.json.api_url + '/tickets/' + $('Prepare Ticket').item.json.ticket_id + '/custom-fields/' + $('Prepare Ticket').item.json.reason_field_id }}",
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpBasicAuth',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr('{{ JSON.stringify($json.output.contact_reason) }}'),
		},
	},
});

// [help desk] Tool. Swap for another help desk: replace this node only. It assigns the
// ticket to the team chosen by Classify Ticket.
const assignTeam = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Assign Team',
		credentials: { httpBasicAuth: newCredential('Gorgias account') },
		parameters: {
			method: 'PUT',
			url: expr(
				"{{ $('Prepare Ticket').item.json.api_url + '/tickets/' + $('Prepare Ticket').item.json.ticket_id }}",
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpBasicAuth',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr(
				"{{ JSON.stringify({ assignee_team: { id: Number($('Classify Ticket').item.json.output.team === 'sales' ? $('Prepare Ticket').item.json.sales_team_id : $('Prepare Ticket').item.json.post_purchase_team_id) } }) }}",
			),
		},
	},
});

export default workflow('id', 'AI Ticket Routing in the Help Desk')
	.add(newTicket)
	.to(keepOpenTickets)
	.to(prepareTicket)
	.to(classifyTicket)
	.to(setContactReason)
	.to(assignTeam);
