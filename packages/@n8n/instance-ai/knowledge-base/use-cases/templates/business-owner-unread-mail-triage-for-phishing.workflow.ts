// Use case: business-owner / Unread Mail Triage for Phishing.
// Email inbox: set INBOX to gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The analyzer is your own endpoint, for example the production URL of another n8n webhook.
// It receives { id, from, subject, body } and returns { verdict: "phishing" | "legitimate", reason }.
// Create the Phishing and Legitimate labels (Gmail) or categories (Outlook) first.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// Runs every hour.
const everyHour = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Hour',
		parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
	},
});

// Email inbox: set INBOX to gmail or outlook. Nothing else changes.
const INBOX = 'gmail';

// One ready reader per tool. Each returns the unread messages; Prepare Email maps their fields.
const inboxReaders = {
	gmail: {
		type: 'n8n-nodes-base.gmail',
		version: 2.1,
		config: {
			name: 'Read Unread Mail',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'getAll',
				authentication: 'oAuth2',
				returnAll: false,
				limit: 50,
				simple: true,
				filters: { readStatus: 'unread' },
			},
			output: [
				{
					id: '18f3c2a1b2c3d4e5',
					threadId: '18f3c2a1b2c3d4e5',
					snippet: 'Your account will be suspended unless you confirm your password today.',
					From: 'IT Support <it-support@example-mail.test>',
					Subject: 'Action required: confirm your password',
					labels: [{ id: 'UNREAD', name: 'UNREAD' }],
				},
			],
		},
	},
	outlook: {
		type: 'n8n-nodes-base.microsoftOutlook',
		version: 2,
		config: {
			name: 'Read Unread Mail',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'getAll',
				returnAll: false,
				limit: 50,
				output: 'simple',
				filtersUI: { values: { filterBy: 'filters', filters: { readStatus: 'unread' } } },
			},
			output: [
				{
					id: 'AAMkAGI2THVSAAA=',
					subject: 'Action required: confirm your password',
					bodyPreview: 'Your account will be suspended unless you confirm your password today.',
					from: { emailAddress: { name: 'IT Support', address: 'it-support@example-mail.test' } },
					isRead: false,
				},
			],
		},
	},
};
// The field names differ per tool. Prepare Email reads these.
const fields = {
	gmail: { from: '$json.From', subject: '$json.Subject', body: '$json.snippet' },
	outlook: {
		from: '$json.from.emailAddress.address',
		subject: '$json.subject',
		body: '$json.bodyPreview',
	},
};
const readUnreadMail = node(inboxReaders[INBOX]);
const field = fields[INBOX];

// Maps the message to the fields the analyzer expects. The label nodes read $json.id from here.
const prepareEmail = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Email',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'id', value: expr('{{ $json.id }}'), type: 'string' },
					{ id: 'a2', name: 'from', value: expr(`{{ ${field.from} }}`), type: 'string' },
					{ id: 'a3', name: 'subject', value: expr(`{{ ${field.subject} }}`), type: 'string' },
					{ id: 'a4', name: 'body', value: expr(`{{ ${field.body} }}`), type: 'string' },
				],
			},
		},
	},
});

// Sends the message to the analyzer and reads its verdict.
const analyzeEmail = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Analyze Email',
		parameters: {
			method: 'POST',
			url: placeholder(
				'Analyzer URL, for example the production URL of an n8n webhook that scores emails',
			),
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr(
				'{{ JSON.stringify({ id: $json.id, from: $json.from, subject: $json.subject, body: $json.body }) }}',
			),
		},
		output: [{ verdict: 'phishing', reason: 'Urgent password request from a look-alike domain' }],
	},
});

// True when the analyzer flags the message as phishing.
const isPhishing = ifElse({
	version: 2.2,
	config: {
		name: 'Is Phishing',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.verdict }}'),
						rightValue: 'phishing',
						operator: { type: 'string', operation: 'equals' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// One ready labeler per tool and verdict. Each reads the message id from Prepare Email.
const phishingLabelers = {
	gmail: {
		type: 'n8n-nodes-base.gmail',
		version: 2.1,
		config: {
			name: 'Label Phishing',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'addLabels',
				authentication: 'oAuth2',
				messageId: expr("{{ $('Prepare Email').item.json.id }}"),
				labelIds: [placeholder('Gmail label ID of the Phishing label, for example Label_12')],
			},
		},
	},
	outlook: {
		type: 'n8n-nodes-base.microsoftOutlook',
		version: 2,
		config: {
			name: 'Label Phishing',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'update',
				messageId: { __rl: true, mode: 'id', value: expr("{{ $('Prepare Email').item.json.id }}") },
				updateFields: { categories: ['Phishing'] },
			},
		},
	},
};
const legitimateLabelers = {
	gmail: {
		type: 'n8n-nodes-base.gmail',
		version: 2.1,
		config: {
			name: 'Label Legitimate',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'addLabels',
				authentication: 'oAuth2',
				messageId: expr("{{ $('Prepare Email').item.json.id }}"),
				labelIds: [placeholder('Gmail label ID of the Legitimate label, for example Label_13')],
			},
		},
	},
	outlook: {
		type: 'n8n-nodes-base.microsoftOutlook',
		version: 2,
		config: {
			name: 'Label Legitimate',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'update',
				messageId: { __rl: true, mode: 'id', value: expr("{{ $('Prepare Email').item.json.id }}") },
				updateFields: { categories: ['Legitimate'] },
			},
		},
	},
};
const labelPhishing = node(phishingLabelers[INBOX]);
const labelLegitimate = node(legitimateLabelers[INBOX]);

export default workflow('id', 'Unread Mail Triage for Phishing')
	.add(everyHour)
	.to(readUnreadMail)
	.to(prepareEmail)
	.to(analyzeEmail)
	.to(isPhishing.onTrue(labelPhishing).onFalse(labelLegitimate));
