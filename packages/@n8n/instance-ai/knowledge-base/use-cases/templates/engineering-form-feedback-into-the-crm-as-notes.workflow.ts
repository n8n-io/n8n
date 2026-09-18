// Use case: engineering / Form Feedback into the CRM as Notes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The form tool posts each submission to the webhook with the fields Contact ID (hidden),
// Category, Section (optional) and Comment.
// ponytail: one note text in one language. Add a Set node per language before Write Note
// if the form has a language field.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Receives one form submission per request.
const feedbackSubmission = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'Feedback Submission',
		parameters: { httpMethod: 'POST', path: 'feedback', options: {} },
		output: [
			{
				headers: {},
				params: {},
				query: {},
				body: {
					eventType: 'FORM_RESPONSE',
					data: {
						fields: [
							{ key: 'q1', label: 'Contact ID', type: 'HIDDEN_FIELDS', value: '1234567' },
							{ key: 'q2', label: 'Category', type: 'DROPDOWN', value: 'Billing' },
							{ key: 'q3', label: 'Section', type: 'DROPDOWN', value: 'Invoices' },
							{
								key: 'q4',
								label: 'Comment',
								type: 'TEXTAREA',
								value: 'The invoice PDF shows the wrong VAT rate.',
							},
						],
					},
				},
			},
		],
	},
});

// Picks each form field by its label. The next node reads $json.contact_id, $json.category,
// $json.section and $json.comment.
const pickFormFields = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Pick Form Fields',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'contact_id',
						value: expr(
							'{{ ($json.body.data.fields.find(f => f.label === "Contact ID") || {}).value || "" }}',
						),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'category',
						value: expr(
							'{{ ($json.body.data.fields.find(f => f.label === "Category") || {}).value || "" }}',
						),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'section',
						value: expr(
							'{{ ($json.body.data.fields.find(f => f.label === "Section") || {}).value || "" }}',
						),
						type: 'string',
					},
					{
						id: 'a4',
						name: 'comment',
						value: expr(
							'{{ ($json.body.data.fields.find(f => f.label === "Comment") || {}).value || "" }}',
						),
						type: 'string',
					},
				],
			},
		},
		output: [
			{
				contact_id: '1234567',
				category: 'Billing',
				section: 'Invoices',
				comment: 'The invoice PDF shows the wrong VAT rate.',
			},
		],
	},
});

// Writes the note text. The next nodes read $json.contact_id and $json.note.
const writeNote = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Write Note',
		parameters: {
			mode: 'manual',
			includeOtherFields: true,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'note',
						value: expr(
							'{{ "Feedback from the client on the product " + $json.category + ($json.section ? " (" + $json.section + ")" : "") + ":\\n\\n" + $json.comment }}',
						),
						type: 'string',
					},
				],
			},
		},
		output: [
			{
				contact_id: '1234567',
				category: 'Billing',
				section: 'Invoices',
				comment: 'The invoice PDF shows the wrong VAT rate.',
				note: 'Feedback from the client on the product Billing (Invoices):\n\nThe invoice PDF shows the wrong VAT rate.',
			},
		],
	},
});

// [CRM] Tool. Swap for another CRM: replace this node only. It reads $json.contact_id and
// $json.note and adds the note to that contact.
const addCrmNote = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Add CRM Note',
		credentials: { hubspotAppToken: newCredential('HubSpot account') },
		parameters: {
			method: 'POST',
			url: 'https://api.hubapi.com/crm/v3/objects/notes',
			authentication: 'predefinedCredentialType',
			nodeCredentialType: 'hubspotAppToken',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr(
				'{{ JSON.stringify({ properties: { hs_timestamp: $now.toISO(), hs_note_body: $json.note }, associations: [{ to: { id: $json.contact_id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] }] }) }}',
			),
			options: {},
		},
		output: [
			{
				id: '90123456789',
				properties: { hs_note_body: 'Feedback from the client on the product Billing (Invoices)' },
			},
		],
	},
});

// Adds the same feedback as a history entry in the internal CRM. It reads $json.contact_id
// and $json.note.
const addHistoryEntry = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Add History Entry',
		credentials: { httpTemplatedCustomAuth: newCredential('Internal CRM account') },
		parameters: {
			method: 'POST',
			url: placeholder(
				'Internal CRM history endpoint, for example https://crm.example.com/api/history',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr('{{ JSON.stringify({ client_id: $json.contact_id, content: $json.note }) }}'),
			options: {},
		},
	},
});

export default workflow('id', 'Form Feedback into the CRM as Notes')
	.add(feedbackSubmission)
	.to(pickFormFields)
	.to(writeNote)
	.to(addCrmNote)
	.add(writeNote)
	.to(addHistoryEntry);
