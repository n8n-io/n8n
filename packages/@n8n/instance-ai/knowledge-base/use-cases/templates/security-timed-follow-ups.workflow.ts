// Use case: security / Timed Follow-Ups.
// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
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

// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
const SPREADSHEET = 'sheets';

// Runs every 30 minutes.
const every30Minutes = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 30 Minutes',
		parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] } },
	},
});

// Spreadsheet: one ready node per tool. The sheet has the columns name, email, phone,
// created_at, progressed, reminder_4h_sent_at, reminder_24h_sent_at. The next nodes read them.
const readProspectQueueConfigs = {
	sheets: {
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
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Read Prospect Queue',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'readRows',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook with the prospect queue'),
				},
				worksheet: {
					__rl: true,
					mode: 'list',
					value: placeholder('Worksheet, for example Sheet1'),
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
	},
};
const readProspectQueue = node(readProspectQueueConfigs[SPREADSHEET]);

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

// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
const NOTIFY = 'gmail';

// One ready node per tool. Each reads $json.name; the email tools also read $json.email.
// Gmail and Outlook write to the prospect; Slack and Teams post a reminder for the team.
const sinks = {
	slack: {
		type: 'n8n-nodes-base.slack',
		version: 2.7,
		config: {
			name: 'Post to Slack',
			credentials: { slackOAuth2Api: newCredential('Slack account') },
			parameters: {
				resource: 'message',
				operation: 'post',
				authentication: 'oAuth2',
				select: 'channel',
				channelId: {
					__rl: true,
					mode: 'name',
					value: placeholder('Slack channel name, for example sales'),
				},
				messageType: 'text',
				text: expr(
					'{{ "Follow up with " + $json.name + " (" + $json.email + "): no progress after 24 hours." }}',
				),
				otherOptions: { includeLinkToWorkflow: false },
			},
		},
	},
	teams: {
		type: 'n8n-nodes-base.microsoftTeams',
		version: 2,
		config: {
			name: 'Post to Teams',
			credentials: { microsoftTeamsOAuth2Api: newCredential('Microsoft Teams account') },
			parameters: {
				resource: 'channelMessage',
				operation: 'create',
				teamId: {
					__rl: true,
					mode: 'id',
					value: placeholder('Team ID, the groupId in the team link'),
				},
				channelId: {
					__rl: true,
					mode: 'id',
					value: placeholder('Channel ID, the 19:...@thread.tacv2 part of the channel link'),
				},
				contentType: 'text',
				message: expr(
					'{{ "Follow up with " + $json.name + " (" + $json.email + "): no progress after 24 hours." }}',
				),
			},
		},
	},
	gmail: {
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
	},
	outlook: {
		type: 'n8n-nodes-base.microsoftOutlook',
		version: 2,
		config: {
			name: 'Send Email',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'send',
				toRecipients: expr('{{ $json.email }}'),
				subject: expr('{{ "Still there, " + $json.name + "?" }}'),
				bodyContent: expr(
					'{{ "Hi " + $json.name + ", just checking in on your setup. Let us know if you need a hand." }}',
				),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notify = node(sinks[NOTIFY]);

// Spreadsheet: one ready node per tool. It writes the reminder timestamps to the row that
// matches email and reads the Due Reminders fields.
const markReminderSentConfigs = {
	sheets: {
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
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Mark Reminder Sent',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'upsert',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook with the prospect queue'),
				},
				worksheet: {
					__rl: true,
					mode: 'list',
					value: placeholder('Worksheet, for example Sheet1'),
				},
				dataMode: 'define',
				columnToMatchOn: 'email',
				valueToMatchOn: expr("{{ $('Due Reminders').item.json.email }}"),
				fieldsUi: {
					values: [
						{
							column: 'reminder_4h_sent_at',
							fieldValue: expr(
								"{{ $('Due Reminders').item.json.reminder_4h_sent_at || $now.toISO() }}",
							),
						},
						{
							column: 'reminder_24h_sent_at',
							fieldValue: expr(
								"{{ $('Due Reminders').item.json.reminder_4h_sent_at ? $now.toISO() : ($('Due Reminders').item.json.reminder_24h_sent_at || '') }}",
							),
						},
					],
				},
			},
		},
	},
};
const markReminderSent = node(markReminderSentConfigs[SPREADSHEET]);

export default workflow('id', 'Timed Follow-Ups')
	.add(every30Minutes)
	.to(readProspectQueue)
	.to(dueReminders)
	.to(isFourHourDue.onTrue(sendSms).onFalse(notify))
	.add(sendSms)
	.to(markReminderSent)
	.add(notify)
	.to(markReminderSent);
