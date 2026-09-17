// Use case: engineering / Developer onboarding checklist.
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

// [chat] Slack. Swap for Microsoft Teams, Discord or Telegram: replace this node only.
// It reads the New Hire Row fields and $json.url.
const welcomeInChat = node({
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
			text: expr(
				"{{ 'Welcome ' + $('New Hire Row').item.json.name + ' to the ' + $('New Hire Row').item.json.team + ' team! Your onboarding checklist: ' + $json.url }}",
			),
			otherOptions: { includeLinkToWorkflow: false },
		},
	},
});

export default workflow('id', 'Developer Onboarding Checklist')
	.add(newHireRow)
	.to(inviteToGitHub)
	.to(createOnboardingPage)
	.to(welcomeInChat);
