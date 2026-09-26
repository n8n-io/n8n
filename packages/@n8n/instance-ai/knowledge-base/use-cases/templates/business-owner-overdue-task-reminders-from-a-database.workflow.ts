// Use case: business-owner / Overdue Task Reminders from a Database.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The query returns one row per overdue item with the columns name, email, item and due_at.
// Change the SQL to your schema and keep those four column names.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every hour at minute 15.
const everyHour = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Hour',
		parameters: {
			rule: { interval: [{ field: 'hours', hoursInterval: 1, triggerAtMinute: 15 }] },
		},
	},
});

// [database] Tool. Swap for another database: replace this node only. It runs on the
// trigger's schedule. The next nodes read $json.name, $json.email, $json.item and $json.due_at.
const findOverdueItems = node({
	type: 'n8n-nodes-base.mySql',
	version: 2.5,
	config: {
		name: 'Find Overdue Items',
		credentials: { mySql: newCredential('MySQL account') },
		parameters: {
			resource: 'database',
			operation: 'executeQuery',
			query: `SELECT u.name, u.email, t.title AS item, t.due_at
FROM tasks t
JOIN users u ON u.id = t.owner_id
WHERE t.completed_at IS NULL
  AND t.due_at BETWEEN NOW() - INTERVAL 25 HOUR AND NOW() - INTERVAL 24 HOUR`,
		},
		output: [
			{
				name: 'Jane Doe',
				email: 'jane@example.com',
				item: 'Feedback for the Monday 10:00 class',
				due_at: '2026-09-16T10:00:00.000Z',
			},
			{
				name: 'John Smith',
				email: 'john@example.com',
				item: 'Feedback for the Monday 16:00 class',
				due_at: '2026-09-16T16:00:00.000Z',
			},
		],
	},
});

// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
const NOTIFY = 'gmail';

// Personal reminder, one per row. Gmail and Outlook write to the owner ($json.email);
// Slack and Teams post the reminder to a channel. Each reads $json.name, $json.item, $json.due_at.
const ownerSinks = {
	slack: {
		type: 'n8n-nodes-base.slack',
		version: 2.7,
		config: {
			name: 'Remind Owner',
			credentials: { slackOAuth2Api: newCredential('Slack account') },
			parameters: {
				resource: 'message',
				operation: 'post',
				authentication: 'oAuth2',
				select: 'channel',
				channelId: {
					__rl: true,
					mode: 'name',
					value: placeholder('Slack channel name, for example reminders'),
				},
				messageType: 'text',
				text: expr(
					'{{ "Reminder for " + $json.name + ": " + $json.item + " was due on " + $json.due_at + "." }}',
				),
				otherOptions: { includeLinkToWorkflow: false },
			},
		},
	},
	teams: {
		type: 'n8n-nodes-base.microsoftTeams',
		version: 2,
		config: {
			name: 'Remind Owner',
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
					'{{ "Reminder for " + $json.name + ": " + $json.item + " was due on " + $json.due_at + "." }}',
				),
			},
		},
	},
	gmail: {
		type: 'n8n-nodes-base.gmail',
		version: 2.2,
		config: {
			name: 'Remind Owner',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'send',
				authentication: 'oAuth2',
				sendTo: expr('{{ $json.email }}'),
				subject: expr('{{ "Reminder: " + $json.item }}'),
				emailType: 'text',
				message: expr(
					'{{ "Hi " + $json.name + ", " + $json.item + " was due on " + $json.due_at + ". Please complete it today." }}',
				),
				options: { appendAttribution: false },
			},
		},
	},
	outlook: {
		type: 'n8n-nodes-base.microsoftOutlook',
		version: 2,
		config: {
			name: 'Remind Owner',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'send',
				toRecipients: expr('{{ $json.email }}'),
				subject: expr('{{ "Reminder: " + $json.item }}'),
				bodyContent: expr(
					'{{ "Hi " + $json.name + ", " + $json.item + " was due on " + $json.due_at + ". Please complete it today." }}',
				),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const remindOwner = node(ownerSinks[NOTIFY]);

// Collects all rows into one item for the team summary.
const collectAll = node({
	type: 'n8n-nodes-base.aggregate',
	version: 1,
	config: {
		name: 'Collect All',
		parameters: {
			aggregate: 'aggregateAllItemData',
			destinationFieldName: 'rows',
			include: 'allFields',
		},
	},
});

// Builds the summary subject and message, one line per overdue item.
const buildSummary = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Build Summary',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'subject',
						value: expr('{{ $json.rows.length + " overdue items in the last 24 hours" }}'),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'message',
						value: expr(
							'{{ $json.rows.map(r => r.name + " - " + r.item + " (due " + r.due_at + ")").join("\\n") }}',
						),
						type: 'string',
					},
				],
			},
		},
	},
});

// Team summary, one per run. Each reads $json.subject and $json.message.
const teamSinks = {
	slack: {
		type: 'n8n-nodes-base.slack',
		version: 2.7,
		config: {
			name: 'Notify Team',
			credentials: { slackOAuth2Api: newCredential('Slack account') },
			parameters: {
				resource: 'message',
				operation: 'post',
				authentication: 'oAuth2',
				select: 'channel',
				channelId: {
					__rl: true,
					mode: 'name',
					value: placeholder('Slack channel name for the team summary, for example ops'),
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
			name: 'Notify Team',
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
			name: 'Notify Team',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'send',
				authentication: 'oAuth2',
				sendTo: placeholder('Team mailbox for the summary, for example ops@example.com'),
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
			name: 'Notify Team',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'send',
				toRecipients: placeholder('Team mailbox for the summary, for example ops@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notifyTeam = node(teamSinks[NOTIFY]);

export default workflow('id', 'Overdue Task Reminders from a Database')
	.add(everyHour)
	.to(findOverdueItems)
	.to(remindOwner)
	.add(findOverdueItems)
	.to(collectAll)
	.to(buildSummary)
	.to(notifyTeam);
