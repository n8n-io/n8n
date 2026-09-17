// Use case: security / Timed Follow-Ups.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The sheet has the columns name, email, phone, created_at, progressed,
// reminder_4h_sent_at, reminder_24h_sent_at.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// Runs every 30 minutes.
const every30Minutes = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 30 Minutes',
		parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] } },
	},
});

// [spreadsheet] Google Sheets. Swap for Microsoft Excel 365 or Airtable: replace this node
// only. The sheet has the columns name, email, phone, created_at, progressed,
// reminder_4h_sent_at, reminder_24h_sent_at. The next nodes read them.
const readProspectQueue = node({
	type: 'n8n-nodes-base.googleSheets',
	version: 4.7,
	config: {
		name: 'Read Prospect Queue',
		credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
		parameters: {
			resource: 'sheet',
			operation: 'read',
			authentication: 'oAuth2',
			documentId: {
				__rl: true,
				mode: 'url',
				value: placeholder('Google Sheets URL of the prospect queue'),
			},
			sheetName: {
				__rl: true,
				mode: 'name',
				value: placeholder('Sheet tab name, for example Sheet1'),
			},
		},
		output: [
			{
				name: 'Jane Doe',
				email: 'jane@example.com',
				phone: '+15550100',
				created_at: '2026-09-17T05:00:00.000Z',
				progressed: false,
				reminder_4h_sent_at: '',
				reminder_24h_sent_at: '',
			},
			{
				name: 'John Smith',
				email: 'john@example.com',
				phone: '+15550101',
				created_at: '2026-09-16T04:00:00.000Z',
				progressed: false,
				reminder_4h_sent_at: '2026-09-16T08:00:00.000Z',
				reminder_24h_sent_at: '',
			},
		],
	},
});

// Keeps prospects that have not progressed and are due for the 4 hour or the 24 hour reminder.
const dueReminders = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Due Reminders',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr(
							'{{ !$json.progressed && ((!$json.reminder_4h_sent_at && DateTime.fromISO($json.created_at) <= $now.minus({ hours: 4 })) || ($json.reminder_4h_sent_at && !$json.reminder_24h_sent_at && DateTime.fromISO($json.created_at) <= $now.minus({ hours: 24 }))) }}',
						),
						rightValue: '',
						operator: { type: 'boolean', operation: 'true', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// True when the 4 hour reminder has not been sent yet; false means the 24 hour reminder is due.
const isFourHourDue = ifElse({
	version: 2.2,
	config: {
		name: 'Is Four Hour Due',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ !$json.reminder_4h_sent_at }}'),
						rightValue: '',
						operator: { type: 'boolean', operation: 'true', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// [SMS] Twilio. Swap for another SMS tool: replace this node only. It reads $json.phone, $json.name.
const sendSms = node({
	type: 'n8n-nodes-base.twilio',
	version: 1,
	config: {
		name: 'Send SMS',
		credentials: { twilioApi: newCredential('Twilio account') },
		parameters: {
			resource: 'sms',
			operation: 'send',
			from: placeholder('Twilio sender number, for example +15550199'),
			to: expr('{{ $json.phone }}'),
			message: expr(
				'{{ "Hi " + $json.name + ", just checking in on your setup. Reply STOP to opt out." }}',
			),
		},
	},
});

// [email] Gmail. Swap for Outlook or another email tool: replace this node only.
// It reads $json.email, $json.name.
const sendEmail = node({
	type: 'n8n-nodes-base.gmail',
	version: 2.2,
	config: {
		name: 'Send Email',
		credentials: { gmailOAuth2: newCredential('Gmail account') },
		parameters: {
			resource: 'message',
			operation: 'send',
			authentication: 'oAuth2',
			sendTo: expr('{{ $json.email }}'),
			subject: expr('{{ "Still there, " + $json.name + "?" }}'),
			emailType: 'text',
			message: expr(
				'{{ "Hi " + $json.name + ", just checking in on your setup. Let us know if you need a hand." }}',
			),
			options: { appendAttribution: false },
		},
	},
});

// [spreadsheet] Google Sheets. Swap for Microsoft Excel 365 or Airtable: replace this node
// only. It reads the Read Prospect Queue fields.
const markReminderSent = node({
	type: 'n8n-nodes-base.googleSheets',
	version: 4.7,
	config: {
		name: 'Mark Reminder Sent',
		credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
		parameters: {
			resource: 'sheet',
			operation: 'appendOrUpdate',
			authentication: 'oAuth2',
			documentId: {
				__rl: true,
				mode: 'url',
				value: placeholder('Google Sheets URL of the prospect queue'),
			},
			sheetName: {
				__rl: true,
				mode: 'name',
				value: placeholder('Sheet tab name, for example Sheet1'),
			},
			columns: {
				mappingMode: 'defineBelow',
				value: {
					email: expr("{{ $('Due Reminders').item.json.email }}"),
					reminder_4h_sent_at: expr(
						"{{ $('Due Reminders').item.json.reminder_4h_sent_at || $now.toISO() }}",
					),
					reminder_24h_sent_at: expr(
						"{{ $('Due Reminders').item.json.reminder_4h_sent_at ? $now.toISO() : ($('Due Reminders').item.json.reminder_24h_sent_at || '') }}",
					),
				},
				schema: [
					{
						id: 'email',
						displayName: 'email',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: true,
					},
					{
						id: 'reminder_4h_sent_at',
						displayName: 'reminder_4h_sent_at',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: false,
					},
					{
						id: 'reminder_24h_sent_at',
						displayName: 'reminder_24h_sent_at',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: false,
					},
				],
				matchingColumns: ['email'],
			},
		},
	},
});

export default workflow('id', 'Timed Follow-Ups')
	.add(every30Minutes)
	.to(readProspectQueue)
	.to(dueReminders)
	.to(isFourHourDue.onTrue(sendSms).onFalse(sendEmail))
	.add(sendSms)
	.to(markReminderSent)
	.add(sendEmail)
	.to(markReminderSent);
