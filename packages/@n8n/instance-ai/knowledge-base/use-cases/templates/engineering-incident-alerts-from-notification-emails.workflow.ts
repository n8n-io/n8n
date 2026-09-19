// Use case: engineering / Incident Alerts from Notification Emails.
// Email inbox: set INBOX to gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// Email inbox: set INBOX to gmail or outlook. Nothing else changes.
const INBOX = 'gmail';

// One ready trigger per tool, and the field that holds the mail body per tool
// (Gmail: text, Outlook: bodyPreview). Keep Incident Mails and Extract Incident read that field.
const inboxes = {
	gmail: {
		type: 'n8n-nodes-base.gmailTrigger',
		version: 1.4,
		config: {
			name: 'Watch Monitoring Inbox',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				simple: false,
				filters: {
					sender: placeholder(
						'Sender address of the monitoring mails, for example alerts@monitoring.example.com',
					),
				},
			},
			output: [
				{
					subject: 'Incident: API latency above 2 s in eu-west',
					text: 'The API p95 latency is above 2 s since 09:12 UTC. Affected: checkout. Status: investigating.',
				},
			],
		},
	},
	outlook: {
		type: 'n8n-nodes-base.microsoftOutlookTrigger',
		version: 1,
		config: {
			name: 'Watch Monitoring Inbox',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				event: 'messageReceived',
				output: 'simple',
				filters: {
					sender: placeholder(
						'Sender address of the monitoring mails, for example alerts@monitoring.example.com',
					),
				},
			},
			output: [
				{
					subject: 'Incident: API latency above 2 s in eu-west',
					bodyPreview:
						'The API p95 latency is above 2 s since 09:12 UTC. Affected: checkout. Status: investigating.',
				},
			],
		},
	},
};
const bodies = { gmail: '$json.text', outlook: '$json.bodyPreview' };
const notificationMail = trigger(inboxes[INBOX]);
const body = bodies[INBOX];

// Keeps the mails that mention an incident or an outage. Skips replies and forwards, and
// skips mails that mention a password.
const keepIncidentMails = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Keep Incident Mails',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.subject }}'),
						rightValue: '/^(re|fw|fwd)\\s*:/i',
						operator: { type: 'string', operation: 'notRegex' },
					},
					{
						id: 'c2',
						leftValue: expr('{{ $json.subject + "\\n" + ' + body + ' }}'),
						rightValue: '/incident|outage/i',
						operator: { type: 'string', operation: 'regex' },
					},
					{
						id: 'c3',
						leftValue: expr('{{ $json.subject + "\\n" + ' + body + ' }}'),
						rightValue: '/password/i',
						operator: { type: 'string', operation: 'notRegex' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// [AI model] Tool. Swap for another AI model: replace this node only. It reads $json.subject
// and the mail body. The next node reads $json.message.content.title and
// $json.message.content.summary.
const extractIncident = node({
	type: '@n8n/n8n-nodes-langchain.openAi',
	version: 1.8,
	config: {
		name: 'Extract Incident',
		credentials: { openAiApi: newCredential('OpenAI account') },
		parameters: {
			resource: 'text',
			operation: 'message',
			modelId: {
				__rl: true,
				mode: 'id',
				value: placeholder('OpenAI model ID, for example gpt-4o-mini'),
			},
			messages: {
				values: [
					{
						role: 'user',
						content: expr(
							'{{ "This mail may report a system incident or outage. Respond with JSON only, with the keys title (one line) and summary (what is affected, since when, and the current status). If the mail does not report an incident, set both keys to an empty string.\\n\\nSubject: " + $json.subject + "\\n\\n" + ' +
								body +
								' }}',
						),
					},
				],
			},
			jsonOutput: true,
		},
		output: [
			{
				message: {
					content: {
						title: 'API latency above 2 s in eu-west',
						summary: 'Checkout API p95 latency above 2 s since 09:12 UTC. Status: investigating.',
					},
				},
			},
		],
	},
});

// True when the model found an incident.
const isIncident = ifElse({
	version: 2.2,
	config: {
		name: 'Is Incident',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.message.content.summary }}'),
						rightValue: '',
						operator: { type: 'string', operation: 'notEmpty', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Posts the alert to the incident webhook. It reads $json.message.content.title and
// $json.message.content.summary.
const postAlert = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Post Alert',
		parameters: {
			method: 'POST',
			url: placeholder(
				'Incident webhook URL, for example the inbound webhook of the on-call or chat tool',
			),
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr(
				'{{ JSON.stringify({ title: $json.message.content.title, body: $json.message.content.summary }) }}',
			),
			options: {},
		},
	},
});

export default workflow('id', 'Incident Alerts from Notification Emails')
	.add(notificationMail)
	.to(keepIncidentMails)
	.to(extractIncident)
	.to(isIncident.onTrue(postAlert));
