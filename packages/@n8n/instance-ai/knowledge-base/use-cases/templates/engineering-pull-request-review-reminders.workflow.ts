// Use case: engineering / Pull request review reminders.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap another tool: replace only the node marked with that family. Keep the variable
// name and the fields the next node reads ($json.subject, $json.message).
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Weekday at 9am',
		parameters: {
			rule: {
				interval: [
					{
						field: 'weeks',
						weeksInterval: 1,
						triggerAtDay: [1, 2, 3, 4, 5],
						triggerAtHour: 9,
						triggerAtMinute: 0,
					},
				],
			},
		},
	},
});

// [code hosting] GitHub. Swap for GitLab or Bitbucket: replace this node only.
// The next nodes read: number, title, html_url, created_at, draft, user.login.
const getOpenPRs = node({
	type: 'n8n-nodes-base.github',
	version: 1.1,
	config: {
		name: 'Get Open PRs',
		credentials: { githubApi: newCredential('GitHub account') },
		parameters: {
			resource: 'repository',
			operation: 'getPullRequests',
			authentication: 'accessToken',
			owner: { __rl: true, mode: 'name', value: placeholder('GitHub owner (org or username)') },
			repository: { __rl: true, mode: 'name', value: placeholder('Repository name') },
			returnAll: true,
			getRepositoryPullRequestsFilters: { state: 'open', sort: 'created', direction: 'asc' },
		},
		output: [
			{
				number: 42,
				title: 'Fix authentication bug',
				html_url: 'https://github.com/acme/api/pull/42',
				created_at: '2026-09-15T05:00:00.000Z',
				draft: false,
				user: { login: 'alice' },
				requested_reviewers: [{ login: 'bob' }, { login: 'carol' }],
			},
			{
				number: 43,
				title: 'Add new feature',
				html_url: 'https://github.com/acme/api/pull/43',
				created_at: '2026-09-16T07:00:00.000Z',
				draft: false,
				user: { login: 'dave' },
				requested_reviewers: [{ login: 'eve' }],
			},
		],
	},
});

// Keeps pull requests open for more than 24 hours and not marked as draft.
const olderThan24h = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Older Than 24h',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.created_at }}'),
						rightValue: expr('{{ $now.minus({ hours: 24 }).toISO() }}'),
						operator: { type: 'dateTime', operation: 'before' },
					},
					{
						id: 'c2',
						leftValue: expr('{{ $json.draft }}'),
						rightValue: '',
						operator: { type: 'boolean', operation: 'false', singleValue: true },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Formats one line per pull request.
const formatPrLine = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Format PR Line',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'line',
						value: expr(
							'{{ "#" + $json.number + " " + $json.title + " by " + $json.user.login + ", opened " + $json.created_at + " " + $json.html_url }}',
						),
						type: 'string',
					},
				],
			},
		},
	},
});

// Collects the formatted lines into one list.
const collectLines = node({
	type: 'n8n-nodes-base.aggregate',
	version: 1,
	config: {
		name: 'Collect Lines',
		parameters: {
			aggregate: 'aggregateIndividualFields',
			fieldsToAggregate: { fieldToAggregate: [{ fieldToAggregate: 'line' }] },
		},
	},
});

// Builds the chat message and email subject and body.
const buildMessage = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Build Message',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'subject',
						value: expr('{{ "Pull requests waiting for review: " + $json.line.length }}'),
						type: 'string',
					},
					{
						id: 'a2',
						name: 'message',
						value: expr('{{ $json.line.join("\\n") }}'),
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
					value: placeholder('Slack channel name, for example dev-prs'),
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
				sendTo: placeholder('Recipient email address, for example dev-team@example.com'),
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
				toRecipients: placeholder('Recipient email address, for example dev-team@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notify = node(sinks[NOTIFY]);

export default workflow('id', 'PR Review Reminders')
	.add(schedule)
	.to(getOpenPRs)
	.to(olderThan24h)
	.to(formatPrLine)
	.to(collectLines)
	.to(buildMessage)
	.to(notify);
