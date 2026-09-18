// Use case: customer-support / Re-engagement Emails after Sign-up.
// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The sign-up sheet has the columns email, name, created_at (ISO date) and emails_sent.
// emails_sent holds the steps already sent, for example "day3 day7".
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every day at 08:00.
const dailyAt8 = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Daily at 08:00',
		parameters: {
			rule: {
				interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 8, triggerAtMinute: 0 }],
			},
		},
	},
});

// Spreadsheet tool: set SPREADSHEET to sheets or excel. Nothing else changes.
const SPREADSHEET = 'sheets';

// One ready reader per tool. Each returns one item per sign-up row.
const signUpReaders = {
	sheets: {
		type: 'n8n-nodes-base.googleSheets',
		version: 4.7,
		config: {
			name: 'Read Sign-ups',
			credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
			parameters: {
				resource: 'sheet',
				operation: 'read',
				authentication: 'oAuth2',
				documentId: {
					__rl: true,
					mode: 'url',
					value: placeholder('Google Sheets URL of the sign-up list'),
				},
				sheetName: {
					__rl: true,
					mode: 'name',
					value: placeholder('Sheet tab name, for example Sign-ups'),
				},
			},
			output: [
				{
					email: 'jane@example.com',
					name: 'Jane',
					created_at: '2026-09-15T09:12:00.000Z',
					emails_sent: '',
				},
			],
		},
	},
	excel: {
		type: 'n8n-nodes-base.microsoftExcel',
		version: 2.2,
		config: {
			name: 'Read Sign-ups',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'readRows',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook with the sign-up list'),
				},
				worksheet: {
					__rl: true,
					mode: 'list',
					value: placeholder('Worksheet, for example Sign-ups'),
				},
			},
			output: [
				{
					email: 'jane@example.com',
					name: 'Jane',
					created_at: '2026-09-15T09:12:00.000Z',
					emails_sent: '',
				},
			],
		},
	},
};
const readSignUps = node(signUpReaders[SPREADSHEET]);

// Adds the step due today: day3 or day7 by the age of the sign-up, empty on other days.
const findStep = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Find Step',
		parameters: {
			mode: 'manual',
			includeOtherFields: true,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'step',
						value: expr(
							'{{ (days => [3, 7].includes(days) ? "day" + days : "")(Math.floor($now.diff(DateTime.fromISO($json.created_at), "days").days)) }}',
						),
						type: 'string',
					},
				],
			},
		},
	},
});

// Keeps the rows with a step due today that was not sent yet.
const dueToday = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Due Today',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.step }}'),
						rightValue: '',
						operator: { type: 'string', operation: 'notEmpty', singleValue: true },
					},
					{
						id: 'c2',
						leftValue: expr('{{ $json.emails_sent || "" }}'),
						rightValue: expr('{{ $json.step }}'),
						operator: { type: 'string', operation: 'notContains' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Writes the subject and message of the step. Edit the two texts to your product.
const prepareEmail = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Email',
		parameters: {
			mode: 'manual',
			includeOtherFields: true,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'subject',
						value: expr(
							'{{ $json.step === "day3" ? "Pick up where you left off" : "Your plan is waiting for you" }}',
						),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'message',
						value: expr(
							'{{ "Hi " + $json.name + ",\\n\\n" + ($json.step === "day3" ? "You started a plan three days ago. Continue it in a few clicks: https://app.example.com/login" : "Your plan from last week is still saved. Finish it today: https://app.example.com/login") }}',
						),
						type: 'string',
					},
				],
			},
		},
	},
});

// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
const NOTIFY = 'gmail';

// One ready node per tool. Gmail and Outlook mail the person in $json.email. Slack and
// Teams post the text to a channel with the recipient on the first line.
const sinks = {
	slack: {
		type: 'n8n-nodes-base.slack',
		version: 2.7,
		config: {
			name: 'Send Email',
			credentials: { slackOAuth2Api: newCredential('Slack account') },
			parameters: {
				resource: 'message',
				operation: 'post',
				authentication: 'oAuth2',
				select: 'channel',
				channelId: {
					__rl: true,
					mode: 'name',
					value: placeholder('Slack channel name, for example re-engagement'),
				},
				messageType: 'text',
				text: expr('{{ "To: " + $json.email + "\\n" + $json.subject + "\\n" + $json.message }}'),
				otherOptions: { includeLinkToWorkflow: false },
			},
		},
	},
	teams: {
		type: 'n8n-nodes-base.microsoftTeams',
		version: 2,
		config: {
			name: 'Send Email',
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
				message: expr('{{ "To: " + $json.email + "\\n" + $json.subject + "\\n" + $json.message }}'),
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
				subject: expr('{{ $json.subject }}'),
				emailType: 'text',
				message: expr('{{ $json.message }}'),
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
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const sendEmail = node(sinks[NOTIFY]);

// One ready writer per tool. Each adds the step to emails_sent in the row that matches email.
const markSentWriters = {
	sheets: {
		type: 'n8n-nodes-base.googleSheets',
		version: 4.7,
		config: {
			name: 'Mark Step Sent',
			credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account') },
			parameters: {
				resource: 'sheet',
				operation: 'appendOrUpdate',
				authentication: 'oAuth2',
				documentId: {
					__rl: true,
					mode: 'url',
					value: placeholder('Google Sheets URL of the sign-up list'),
				},
				sheetName: {
					__rl: true,
					mode: 'name',
					value: placeholder('Sheet tab name, for example Sign-ups'),
				},
				columns: {
					mappingMode: 'defineBelow',
					value: {
						email: expr("{{ $('Prepare Email').item.json.email }}"),
						emails_sent: expr(
							"{{ (($('Prepare Email').item.json.emails_sent || '') + ' ' + $('Prepare Email').item.json.step).trim() }}",
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
							id: 'emails_sent',
							displayName: 'emails_sent',
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
			name: 'Mark Step Sent',
			credentials: { microsoftExcelOAuth2Api: newCredential('Microsoft Excel 365 account') },
			parameters: {
				authentication: 'microsoftExcelOAuth2Api',
				resource: 'worksheet',
				operation: 'upsert',
				workbook: {
					__rl: true,
					mode: 'list',
					value: placeholder('Excel workbook with the sign-up list'),
				},
				worksheet: {
					__rl: true,
					mode: 'list',
					value: placeholder('Worksheet, for example Sign-ups'),
				},
				dataMode: 'define',
				columnToMatchOn: 'email',
				valueToMatchOn: expr("{{ $('Prepare Email').item.json.email }}"),
				fieldsUi: {
					values: [
						{
							column: 'emails_sent',
							fieldValue: expr(
								"{{ (($('Prepare Email').item.json.emails_sent || '') + ' ' + $('Prepare Email').item.json.step).trim() }}",
							),
						},
					],
				},
			},
		},
	},
};
const markStepSent = node(markSentWriters[SPREADSHEET]);

export default workflow('id', 'Re-engagement Emails after Sign-up')
	.add(dailyAt8)
	.to(readSignUps)
	.to(findStep)
	.to(dueToday)
	.to(prepareEmail)
	.to(sendEmail)
	.to(markStepSent);
