// Use case: sales-and-marketing / Inbox Leads into the CRM.
// Email inbox: set INBOX to gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Lead emails must have one "Label: value" line per field, for example:
//   Name: Jane Doe
//   Email: jane@example.com
//   Phone: +1 555 0100
//   Company: Acme
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Email inbox: set INBOX to gmail or outlook. Nothing else changes.
const INBOX = 'gmail';

// One ready trigger per tool, and the field that holds the mail body per tool
// (Gmail: text, Outlook: bodyPreview). Parse Lead reads that field.
const inboxes = {
	gmail: {
		type: 'n8n-nodes-base.gmailTrigger',
		version: 1.4,
		config: {
			name: 'Watch Lead Inbox',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				simple: false,
				filters: {
					sender: placeholder(
						'Sender address of the lead emails, for example leads@forms.example.com',
					),
				},
			},
			output: [
				{
					subject: 'New lead from website contact form',
					text: 'Name: Jane Doe\nEmail: jane@example.com\nPhone: +1 555 0100\nCompany: Acme',
				},
			],
		},
	},
	outlook: {
		type: 'n8n-nodes-base.microsoftOutlookTrigger',
		version: 1,
		config: {
			name: 'Watch Lead Inbox',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				event: 'messageReceived',
				output: 'simple',
				filters: {
					sender: placeholder(
						'Sender address of the lead emails, for example leads@forms.example.com',
					),
				},
			},
			output: [
				{
					subject: 'New lead from website contact form',
					bodyPreview: 'Name: Jane Doe\nEmail: jane@example.com\nPhone: +1 555 0100\nCompany: Acme',
				},
			],
		},
	},
};
const bodies = { gmail: '$json.text', outlook: '$json.bodyPreview' };
const leadEmail = trigger(inboxes[INBOX]);
const body = bodies[INBOX];

// Extracts the lead fields from the mail body with one regex per field.
const parseLead = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Parse Lead',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'email',
						value: expr('{{ ((' + body + ' || "").match(/Email:\\s*(\\S+)/) || [])[1] || "" }}'),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'first_name',
						value: expr(
							'{{ (((' +
								body +
								' || "").match(/Name:\\s*(.+)/) || [])[1] || "").split(" ")[0] || "" }}',
						),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'last_name',
						value: expr(
							'{{ (((' +
								body +
								' || "").match(/Name:\\s*(.+)/) || [])[1] || "").split(" ").slice(1).join(" ") }}',
						),
						type: 'string',
					},
					{
						id: 'a4',
						name: 'phone',
						value: expr('{{ ((' + body + ' || "").match(/Phone:\\s*(.+)/) || [])[1] || "" }}'),
						type: 'string',
					},
					{
						id: 'a5',
						name: 'company',
						value: expr('{{ ((' + body + ' || "").match(/Company:\\s*(.+)/) || [])[1] || "" }}'),
						type: 'string',
					},
					{ id: 'a6', name: 'source', value: expr('{{ "Email inbox" }}'), type: 'string' },
					{ id: 'a7', name: 'received_at', value: expr('{{ $now.toISO() }}'), type: 'string' },
				],
			},
		},
	},
});

// [CRM] Tool. Swap for another CRM: replace this node only. It reads $json.email,
// $json.first_name, $json.last_name, $json.phone and $json.company.
const upsertContact = node({
	type: 'n8n-nodes-base.hubspot',
	version: 2.2,
	config: {
		name: 'Upsert Contact',
		credentials: { hubspotOAuth2Api: newCredential('HubSpot account') },
		parameters: {
			resource: 'contact',
			operation: 'upsert',
			email: expr('{{ $json.email }}'),
			additionalFields: {
				firstName: expr('{{ $json.first_name }}'),
				lastName: expr('{{ $json.last_name }}'),
				phoneNumber: expr('{{ $json.phone }}'),
				companyName: expr('{{ $json.company }}'),
			},
		},
	},
});

// [email marketing] Tool. Swap for another email marketing tool: replace this node only.
// It reads $json.email.
const tagSubscriber = node({
	type: 'n8n-nodes-base.convertKit',
	version: 1,
	config: {
		name: 'Tag Subscriber',
		credentials: { convertKitApi: newCredential('ConvertKit account') },
		parameters: {
			resource: 'tagSubscriber',
			operation: 'add',
			tagId: placeholder('ConvertKit tag ID to apply to new leads'),
			email: expr('{{ $json.email }}'),
		},
	},
});

export default workflow('id', 'Inbox Leads into the CRM')
	.add(leadEmail)
	.to(parseLead)
	.to(upsertContact)
	.add(parseLead)
	.to(tagSubscriber);
