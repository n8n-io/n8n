// Use case: product-design / Alert Log and Chat Notification.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Database table, run once:
//   CREATE TABLE alarms (id INT IDENTITY(1,1) PRIMARY KEY, alarm_name NVARCHAR(200),
//     severity NVARCHAR(50), error_message NVARCHAR(MAX), source NVARCHAR(200),
//     occurred_at DATETIME2);
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Your monitoring tool posts JSON here: { alarm_name, severity, message, source, occurred_at }.
const monitoringAlarm = trigger({
	type: 'n8n-nodes-base.webhook',
	version: 2.1,
	config: {
		name: 'Monitoring Alarm',
		parameters: { httpMethod: 'POST', path: 'monitoring-alarm', responseMode: 'onReceived' },
		output: [
			{
				body: {
					alarm_name: 'Database connection pool exhausted',
					severity: 'critical',
					message: 'Connection pool reached its maximum size of 100.',
					source: 'billing-service',
					occurred_at: '2026-09-15T08:12:00.000Z',
				},
			},
		],
	},
});

// Normalizes the alarm fields and writes a plain-text summary for the database row and
// the chat message.
const prepareAlarm = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Alarm',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'alarm_name',
						value: expr('{{ $json.body.alarm_name || "Unknown alarm" }}'),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'severity',
						value: expr('{{ $json.body.severity || "warning" }}'),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'error_message',
						value: expr('{{ $json.body.message || "" }}'),
						type: 'string',
					},
					{
						id: 'a4',
						name: 'source',
						value: expr('{{ $json.body.source || "unknown" }}'),
						type: 'string',
					},
					{
						id: 'a5',
						name: 'occurred_at',
						value: expr(
							'{{ $json.body.occurred_at ? DateTime.fromISO($json.body.occurred_at).toISO() : $now.toISO() }}',
						),
						type: 'string',
					},
					{
						id: 'a6',
						name: 'subject',
						value: expr(
							'{{ "Alarm: " + ($json.body.alarm_name || "Unknown alarm") + " (" + ($json.body.severity || "warning") + ")" }}',
						),
						type: 'string',
					},
					{
						id: 'a7',
						name: 'message',
						value: expr(
							'{{ "Alarm: " + ($json.body.alarm_name || "Unknown alarm") + " (" + ($json.body.severity || "warning") + ")" + "\\n" + "Source: " + ($json.body.source || "unknown") + "\\n" + "Occurred at: " + ($json.body.occurred_at ? DateTime.fromISO($json.body.occurred_at).toISO() : $now.toISO()) + "\\n" + ($json.body.message || "") }}',
						),
						type: 'string',
					},
				],
			},
		},
	},
});

// [database] Microsoft SQL. Swap for Postgres, MySQL or Supabase: replace this node only.
// It reads $json.alarm_name, $json.severity, $json.error_message, $json.source and
// $json.occurred_at.
const insertAlarmRow = node({
	type: 'n8n-nodes-base.microsoftSql',
	version: 1.1,
	config: {
		name: 'Insert Alarm Row',
		credentials: { microsoftSql: newCredential('Microsoft SQL account') },
		parameters: {
			operation: 'insert',
			table: placeholder('Table name, for example alarms'),
			columns: 'alarm_name, severity, error_message, source, occurred_at',
		},
	},
});

// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
const NOTIFY = 'teams';

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
					value: placeholder('Slack channel name, for example alerts'),
				},
				messageType: 'text',
				text: expr('{{ $json.message }}'),
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
				message: expr('{{ $json.message }}'),
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
				sendTo: placeholder('Recipient email address, for example ops@example.com'),
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
				toRecipients: placeholder('Recipient email address, for example ops@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notify = node(sinks[NOTIFY]);

export default workflow('id', 'Alert Log and Chat Notification')
	.add(monitoringAlarm)
	.to(prepareAlarm)
	.to(insertAlarmRow)
	.add(prepareAlarm)
	.to(notify);
