// Use case: business-owner / Inbox Summary by AI.
// Email inbox: set INBOX to gmail or outlook. Nothing else changes.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	languageModel,
} from '@n8n/workflow-sdk';

// Runs every day at 17:00.
const dailyAt17 = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Daily at 17:00',
		parameters: {
			rule: {
				interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 17, triggerAtMinute: 0 }],
			},
		},
	},
});

// Email inbox: set INBOX to gmail or outlook. Nothing else changes.
const INBOX = 'gmail';

// One ready reader per tool. Each returns the messages received in the last 24 hours.
const inboxReaders = {
	gmail: {
		type: 'n8n-nodes-base.gmail',
		version: 2.1,
		config: {
			name: 'Read Recent Mail',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'getAll',
				authentication: 'oAuth2',
				returnAll: false,
				limit: 100,
				simple: true,
				filters: { receivedAfter: expr('{{ $now.minus({ hours: 24 }).toISO() }}') },
			},
			output: [
				{
					id: '18f3c2a1b2c3d4e5',
					From: 'Jane Doe <jane@example.com>',
					Subject: 'Friday call',
					snippet: 'Can we move the Friday call to 10:00?',
				},
			],
		},
	},
	outlook: {
		type: 'n8n-nodes-base.microsoftOutlook',
		version: 2,
		config: {
			name: 'Read Recent Mail',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'getAll',
				returnAll: false,
				limit: 100,
				output: 'simple',
				filtersUI: {
					values: {
						filterBy: 'filters',
						filters: { receivedAfter: expr('{{ $now.minus({ hours: 24 }).toISO() }}') },
					},
				},
			},
			output: [
				{
					id: 'AAMkAGI2THVSAAA=',
					subject: 'Friday call',
					bodyPreview: 'Can we move the Friday call to 10:00?',
					from: { emailAddress: { name: 'Jane Doe', address: 'jane@example.com' } },
				},
			],
		},
	},
};
const readRecentMail = node(inboxReaders[INBOX]);

// Collects all messages into one item for the model.
const collectMail = node({
	type: 'n8n-nodes-base.aggregate',
	version: 1,
	config: {
		name: 'Collect Mail',
		parameters: {
			aggregate: 'aggregateAllItemData',
			destinationFieldName: 'emails',
			include: 'allFields',
		},
	},
});

// [AI model] Tool. Swap for another AI model: replace the chat model subnode only.
// The agent reads $json.emails. The next node reads $json.output.
const summarizeInbox = node({
	type: '@n8n/n8n-nodes-langchain.agent',
	version: 2.2,
	config: {
		name: 'Summarize Inbox',
		parameters: {
			promptType: 'define',
			text: expr(
				'{{ "Summarize these emails as a bulleted list, one line per email, most important first. Emails as JSON:\\n" + JSON.stringify($json.emails) }}',
			),
			options: {
				systemMessage:
					'You write short, plain daily inbox summaries for a busy business owner. Name the sender and the ask in each line.',
			},
		},
		subnodes: {
			model: languageModel({
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				version: 1.2,
				config: {
					name: 'OpenAI Chat Model',
					credentials: { openAiApi: newCredential('OpenAI account') },
					parameters: {
						model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
						options: {},
					},
				},
			}),
		},
		output: [
			{
				output:
					'- Jane Doe asks to move the Friday call to 10:00.\n- Acme sent the September invoice, due next week.',
			},
		],
	},
});

// Builds the subject and message for the summary.
const prepareSummary = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Summary',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'subject',
						value: expr('{{ "Inbox summary for " + $now.toFormat("yyyy-LL-dd") }}'),
						type: 'string',
					},
					{ id: 'a2', name: 'message', value: expr('{{ $json.output }}'), type: 'string' },
				],
			},
		},
	},
});

// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
const NOTIFY = 'gmail';

// One ready node per tool. Each reads $json.subject and $json.message.
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
					value: placeholder('Slack channel name, for example inbox-summary'),
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
				message: expr('{{ $json.subject + "\\n" + $json.message }}'),
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
				sendTo: placeholder('Your email address, the summary goes here'),
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
				toRecipients: placeholder('Your email address, the summary goes here'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notify = node(sinks[NOTIFY]);

export default workflow('id', 'Inbox Summary by AI')
	.add(dailyAt17)
	.to(readRecentMail)
	.to(collectMail)
	.to(summarizeInbox)
	.to(prepareSummary)
	.to(notify);
