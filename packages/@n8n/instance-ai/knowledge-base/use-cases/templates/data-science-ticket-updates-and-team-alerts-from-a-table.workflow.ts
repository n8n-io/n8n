// Use case: data-science / Ticket Updates and Team Alerts from a Table.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The requests table has the fields Request ID, Ticket ID, Answer, Answered at (a "last
// modified time" field on Answer) and Informed on.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// [database] Tool. Swap for another database: replace this node only. It returns one item per
// answered record with $json.id and $json.fields.
const requestAnswered = trigger({
	type: 'n8n-nodes-base.airtableTrigger',
	version: 1,
	config: {
		name: 'Request Answered',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		parameters: {
			pollTimes: { item: [{ mode: 'everyMinute' }] },
			authentication: 'airtableTokenApi',
			baseId: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable base ID of the requests base'),
			},
			tableId: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable table ID of the Requests table'),
			},
			triggerField: 'Answered at',
			additionalFields: { formula: "AND({Answer} != '', {Ticket ID} != '', {Informed on} = '')" },
		},
		output: [
			{
				id: 'recAcme0003',
				createdTime: '2026-09-17T09:30:00.000Z',
				fields: {
					'Request ID': 'REQ-2042',
					'Ticket ID': '1234',
					Answer: 'The carrier confirmed the parcel ships on Monday.',
					'Answered at': '2026-09-18T08:00:00.000Z',
				},
			},
		],
	},
});

// [help desk] Tool. Swap for another help desk: replace this node only. It reads
// $json.fields["Ticket ID"]. The next node reads $json.status.
const fetchTicket = node({
	type: 'n8n-nodes-base.zendesk',
	version: 1,
	config: {
		name: 'Fetch Ticket',
		credentials: { zendeskApi: newCredential('Zendesk account') },
		parameters: {
			resource: 'ticket',
			operation: 'get',
			authentication: 'apiToken',
			id: expr('{{ $json.fields["Ticket ID"] }}'),
			ticketType: 'regular',
		},
		output: [{ id: 1234, status: 'hold', subject: 'Custom offer for 200 units' }],
	},
});

// True when the ticket is already closed and cannot take the answer.
const isClosed = ifElse({
	version: 2.2,
	config: {
		name: 'Is Closed',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.status }}'),
						rightValue: 'closed',
						operator: { type: 'string', operation: 'equals' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Builds the alert for the team. The notification node reads $json.subject and $json.message.
const prepareAlert = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Alert',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'subject',
						value: expr(
							'{{ "Ticket " + $json.id + " is closed, request " + $(\'Request Answered\').item.json.fields[\'Request ID\'] + " was answered" }}',
						),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'message',
						value: expr(
							'{{ "The team answered request " + $(\'Request Answered\').item.json.fields[\'Request ID\'] + " but ticket " + $json.id + " is closed. Contact the customer directly.\\n\\nAnswer: " + $(\'Request Answered\').item.json.fields.Answer }}',
						),
						type: 'string',
					},
				],
			},
		},
	},
});

// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
const NOTIFY = 'slack';

// One ready node per tool. Each reads $json.subject and $json.message.
const sinks = {
	slack: {
		type: 'n8n-nodes-base.slack',
		version: 2.7,
		config: {
			name: 'Alert Team',
			credentials: { slackOAuth2Api: newCredential('Slack account') },
			parameters: {
				resource: 'message',
				operation: 'post',
				authentication: 'oAuth2',
				select: 'channel',
				channelId: {
					__rl: true,
					mode: 'name',
					value: placeholder('Slack channel name, for example support-team'),
				},
				messageType: 'text',
				text: expr('{{ $json.subject + "\\n" + $json.message }}'),
				otherOptions: { includeLinkToWorkflow: false },
			},
		},
	},
	teams: {
		type: 'n8n-nodes-base.microsoftTeams',
		version: 2,
		config: {
			name: 'Alert Team',
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
				message: expr('{{ $json.subject + "\\n" + $json.message }}'),
			},
		},
	},
	gmail: {
		type: 'n8n-nodes-base.gmail',
		version: 2.2,
		config: {
			name: 'Alert Team',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'send',
				authentication: 'oAuth2',
				sendTo: placeholder('Team mailbox, for example support@example.com'),
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
			name: 'Alert Team',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'send',
				toRecipients: placeholder('Team mailbox, for example support@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const alertTeam = node(sinks[NOTIFY]);

// [help desk] Tool. Swap for another help desk: replace this node only. It reopens the ticket
// with the answer as an internal note.
const reopenTicket = node({
	type: 'n8n-nodes-base.zendesk',
	version: 1,
	config: {
		name: 'Reopen Ticket',
		credentials: { zendeskApi: newCredential('Zendesk account') },
		parameters: {
			resource: 'ticket',
			operation: 'update',
			authentication: 'apiToken',
			id: expr('{{ $json.id }}'),
			updateFields: {
				status: 'open',
				internalNote: expr(
					"{{ \"Answer to request \" + $('Request Answered').item.json.fields['Request ID'] + \":\\n\" + $('Request Answered').item.json.fields.Answer }}",
				),
			},
		},
	},
});

// [database] Tool. Swap for another database: replace this node only. It stamps Informed on
// in the record that started the run.
const markInformed = node({
	type: 'n8n-nodes-base.airtable',
	version: 2.2,
	config: {
		name: 'Mark Informed',
		credentials: { airtableTokenApi: newCredential('Airtable account') },
		parameters: {
			authentication: 'airtableTokenApi',
			resource: 'record',
			operation: 'update',
			base: { __rl: true, mode: 'id', value: placeholder('Airtable base ID of the requests base') },
			table: {
				__rl: true,
				mode: 'id',
				value: placeholder('Airtable table ID of the Requests table'),
			},
			columns: {
				mappingMode: 'defineBelow',
				matchingColumns: ['id'],
				value: {
					id: expr("{{ $('Request Answered').item.json.id }}"),
					'Informed on': expr('{{ $now.toISO() }}'),
				},
				schema: [
					{
						id: 'id',
						displayName: 'id',
						required: false,
						defaultMatch: true,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
					{
						id: 'Informed on',
						displayName: 'Informed on',
						required: false,
						defaultMatch: false,
						display: true,
						canBeUsedToMatch: true,
						type: 'string',
					},
				],
			},
			options: {},
		},
	},
});

export default workflow('id', 'Ticket Updates and Team Alerts from a Table')
	.add(requestAnswered)
	.to(fetchTicket)
	.to(isClosed.onTrue(prepareAlert).onFalse(reopenTicket))
	.add(prepareAlert)
	.to(alertTeam)
	.to(markInformed)
	.add(reopenTicket)
	.to(markInformed);
