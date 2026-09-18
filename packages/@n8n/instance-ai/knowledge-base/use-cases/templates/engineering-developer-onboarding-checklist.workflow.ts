// Use case: engineering / Developer onboarding checklist.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the node marked with that family. Keep the variable name
// and the fields the next node reads.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// [spreadsheet] Google Sheets. Swap for Microsoft Excel 365 or Airtable: replace this node
// only. The sheet has the columns name, email, github, team. The next nodes read them.
const newHireRow = trigger({
	type: 'n8n-nodes-base.googleSheetsTrigger',
	version: 1,
	config: {
		name: 'New Hire Row',
		credentials: { googleSheetsTriggerOAuth2Api: newCredential('Google Sheets account') },
		parameters: {
			authentication: 'triggerOAuth2',
			documentId: {
				__rl: true,
				mode: 'url',
				value: placeholder('Google Sheets URL of the new hires sheet'),
			},
			sheetName: { __rl: true, mode: 'id', value: 'gid=0' },
			event: 'rowAdded',
		},
		output: [{ name: 'Alex Doe', email: 'alex@example.com', github: 'alexdoe', team: 'Platform' }],
	},
});

// [code hosting] GitHub. Swap for GitLab or Bitbucket: replace this node only.
// It reads $json.email.
const inviteToGitHub = node({
	type: 'n8n-nodes-base.github',
	version: 1.1,
	config: {
		name: 'Invite to GitHub Org',
		credentials: { githubApi: newCredential('GitHub account') },
		parameters: {
			resource: 'user',
			operation: 'invite',
			authentication: 'accessToken',
			organization: placeholder('GitHub organization'),
			email: expr('{{ $json.email }}'),
		},
	},
});

// [docs] Notion. Swap for Google Docs or Coda: replace this node only.
// It reads the New Hire Row fields. The next node reads $json.url.
const createOnboardingPage = node({
	type: 'n8n-nodes-base.notion',
	version: 2.2,
	config: {
		name: 'Create Onboarding Page',
		credentials: { notionApi: newCredential('Notion account') },
		parameters: {
			resource: 'page',
			operation: 'create',
			authentication: 'apiKey',
			pageId: {
				__rl: true,
				mode: 'url',
				value: placeholder('Notion URL of the parent onboarding page'),
			},
			title: expr("{{ $('New Hire Row').item.json.name + ' onboarding' }}"),
			simple: true,
			blockUi: {
				blockValues: [
					{
						type: 'to_do',
						richText: false,
						textContent: 'Accept the GitHub organization invitation',
						checked: false,
					},
					{
						type: 'to_do',
						richText: false,
						textContent: 'Set up the local development environment',
						checked: false,
					},
					{
						type: 'to_do',
						richText: false,
						textContent: 'Read the team handbook and pick a first issue',
						checked: false,
					},
				],
			},
		},
		output: [
			{
				id: '2f1a0b3c-0000-4000-8000-000000000000',
				url: 'https://www.notion.so/Alex-Doe-onboarding-2f1a0b3c',
				name: 'Alex Doe onboarding',
			},
		],
	},
});

// Builds the welcome text from the New Hire Row fields and the page $json.url.
const prepareWelcome = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Welcome',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'subject',
						value: expr("{{ 'Welcome to the ' + $('New Hire Row').item.json.team + ' team' }}"),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'message',
						value: expr(
							"{{ 'Welcome ' + $('New Hire Row').item.json.name + ' to the ' + $('New Hire Row').item.json.team + ' team! Your onboarding checklist: ' + $json.url }}",
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
			name: 'Post Welcome Message',
			credentials: { slackOAuth2Api: newCredential('Slack account') },
			parameters: {
				resource: 'message',
				operation: 'post',
				authentication: 'oAuth2',
				select: 'channel',
				channelId: {
					__rl: true,
					mode: 'name',
					value: placeholder('Slack channel name, for example engineering'),
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
			name: 'Post Welcome Message',
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
			name: 'Send Welcome Email',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'send',
				authentication: 'oAuth2',
				sendTo: placeholder('Recipient email address, for example engineering@example.com'),
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
			name: 'Send Welcome Email',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'send',
				toRecipients: placeholder('Recipient email address, for example engineering@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notify = node(sinks[NOTIFY]);

export default workflow('id', 'Developer Onboarding Checklist')
	.add(newHireRow)
	.to(inviteToGitHub)
	.to(createOnboardingPage)
	.to(prepareWelcome)
	.to(notify);
