// Use case: business-owner / New Client Document Alerts from the CRM.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The CRM activity endpoint returns
// { data: [{ id, type, created_at, file_name, contact_name, contact_email, url }] }.
// Rename the fields in Prepare Alert when your CRM uses other names.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every 15 minutes.
const every15Minutes = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 15 Minutes',
		parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 15 }] } },
	},
});

// Fetches the recent document activities from the CRM, newest first.
const fetchActivities = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Fetch Activities',
		credentials: { httpTemplatedCustomAuth: newCredential('CRM account') },
		parameters: {
			method: 'GET',
			url: placeholder(
				'CRM API URL that lists recent activities, for example https://api.example.com/v1/activities',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendQuery: true,
			specifyQuery: 'keypair',
			queryParameters: {
				parameters: [
					{ name: 'type', value: 'document_uploaded' },
					{ name: 'sort', value: '-created_at' },
				],
			},
		},
		output: [
			{
				data: [
					{
						id: 'act_1042',
						type: 'document_uploaded',
						created_at: '2026-09-17T09:30:00.000Z',
						file_name: 'signed-agreement.pdf',
						contact_name: 'Jane Doe',
						contact_email: 'jane@example.com',
						url: 'https://crm.example.com/contacts/1042/documents/77',
					},
				],
			},
		],
	},
});

// One item per activity.
const oneItemPerActivity = node({
	type: 'n8n-nodes-base.splitOut',
	version: 1,
	config: {
		name: 'One Item per Activity',
		parameters: { fieldToSplitOut: 'data', include: 'noOtherFields', options: {} },
	},
});

// Keeps the uploads not seen in earlier runs, so each document alerts once.
const keepNewUploads = node({
	type: 'n8n-nodes-base.removeDuplicates',
	version: 2,
	config: {
		name: 'Keep New Uploads',
		parameters: {
			operation: 'removeItemsSeenInPreviousExecutions',
			logic: 'removeItemsWithAlreadySeenKeyValues',
			dedupeValue: expr('{{ $json.id }}'),
			options: { scope: 'node', historySize: 10000 },
		},
	},
});

// Builds the alert subject and message.
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
						value: expr('{{ "New document from " + $json.contact_name }}'),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'message',
						value: expr(
							'{{ $json.contact_name + " (" + $json.contact_email + ") uploaded " + $json.file_name + " at " + $json.created_at + ". Open it: " + $json.url }}',
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
					value: placeholder('Slack channel name, for example client-documents'),
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
				sendTo: placeholder('Recipient email address, for example legal@example.com'),
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
				toRecipients: placeholder('Recipient email address, for example legal@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notify = node(sinks[NOTIFY]);

export default workflow('id', 'New Client Document Alerts from the CRM')
	.add(every15Minutes)
	.to(fetchActivities)
	.to(oneItemPerActivity)
	.to(keepNewUploads)
	.to(prepareAlert)
	.to(notify);
