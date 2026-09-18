// Use case: engineering / Power Outage Roll Call from Chat Statuses.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Team members set their chat status to the :zap: emoji with a text that contains "power"
// while their power is out, for example "Power outage, back at 15:00".
// ponytail: no sort by status expiry. Add a Sort node on profile.status_expiration before
// Collect Outages if the order matters.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every hour.
const everyHour = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Hour',
		parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
	},
});

// [chat] Tool. Swap for another chat tool: replace this node only. It returns every user of
// the workspace. The next node reads $json.deleted, $json.real_name,
// $json.profile.status_emoji and $json.profile.status_text.
const listUsers = node({
	type: 'n8n-nodes-base.slack',
	version: 2.7,
	config: {
		name: 'List Users',
		credentials: { slackOAuth2Api: newCredential('Slack account') },
		parameters: {
			resource: 'user',
			operation: 'getAll',
			authentication: 'oAuth2',
			returnAll: true,
		},
		output: [
			{
				id: 'U0123456789',
				real_name: 'Jane Doe',
				deleted: false,
				profile: {
					status_emoji: ':zap:',
					status_text: 'Power outage, back at 15:00',
					status_expiration: 1758205200,
				},
			},
		],
	},
});

// Keeps the active users whose status is the :zap: emoji with a text that contains "power".
const keepOutageStatuses = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Keep Outage Statuses',
		parameters: {
			conditions: {
				options: { caseSensitive: false, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.deleted }}'),
						rightValue: '',
						operator: { type: 'boolean', operation: 'false', singleValue: true },
					},
					{
						id: 'c2',
						leftValue: expr('{{ $json.profile.status_emoji }}'),
						rightValue: ':zap:',
						operator: { type: 'string', operation: 'equals' },
					},
					{
						id: 'c3',
						leftValue: expr('{{ $json.profile.status_text }}'),
						rightValue: 'power',
						operator: { type: 'string', operation: 'contains' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Collects the users with an outage into one item. The next node reads $json.users.
const collectOutages = node({
	type: 'n8n-nodes-base.aggregate',
	version: 1,
	config: {
		name: 'Collect Outages',
		parameters: {
			aggregate: 'aggregateAllItemData',
			destinationFieldName: 'users',
			include: 'allFields',
		},
		output: [
			{
				users: [{ real_name: 'Jane Doe', profile: { status_text: 'Power outage, back at 15:00' } }],
			},
		],
	},
});

// Builds the roll call. The notification node reads $json.subject and $json.message.
const prepareRollCall = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Roll Call',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'subject',
						value: expr('{{ "Power outages: " + $json.users.length + " team members are out" }}'),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'message',
						value: expr(
							'{{ $json.users.map(u => u.real_name + ": " + u.profile.status_text).join("\\n") }}',
						),
						type: 'string',
					},
				],
			},
		},
		output: [
			{
				subject: 'Power outages: 1 team members are out',
				message: 'Jane Doe: Power outage, back at 15:00',
			},
		],
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
			name: 'Post Roll Call',
			credentials: { slackOAuth2Api: newCredential('Slack account') },
			parameters: {
				resource: 'message',
				operation: 'post',
				authentication: 'oAuth2',
				select: 'channel',
				channelId: {
					__rl: true,
					mode: 'name',
					value: placeholder('Slack channel name, for example team-status'),
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
			name: 'Post Roll Call',
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
			name: 'Post Roll Call',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'send',
				authentication: 'oAuth2',
				sendTo: placeholder('Team mailbox, for example team@example.com'),
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
			name: 'Post Roll Call',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'send',
				toRecipients: placeholder('Team mailbox, for example team@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const postRollCall = node(sinks[NOTIFY]);

export default workflow('id', 'Power Outage Roll Call from Chat Statuses')
	.add(everyHour)
	.to(listUsers)
	.to(keepOutageStatuses)
	.to(collectOutages)
	.to(prepareRollCall)
	.to(postRollCall);
