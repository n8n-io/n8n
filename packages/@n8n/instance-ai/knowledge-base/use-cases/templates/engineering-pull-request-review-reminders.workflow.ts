// Use case: engineering / Pull request review reminders.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap another tool: replace only the node marked with that family. Keep the variable
// name and the fields the next node reads ($json.subject, $json.message, $json.count).
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
// The next node reads: number, title, html_url, created_at, requested_reviewers[].login.
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
				user: { login: 'alice' },
				requested_reviewers: [{ login: 'bob' }, { login: 'carol' }],
			},
			{
				number: 43,
				title: 'Add new feature',
				html_url: 'https://github.com/acme/api/pull/43',
				created_at: '2026-09-16T07:00:00.000Z',
				user: { login: 'dave' },
				requested_reviewers: [{ login: 'eve' }],
			},
		],
	},
});

// Tool-neutral step: plain text, readable in a chat message and in an email.
const formatMessage = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Filter and Format Message',
		parameters: {
			mode: 'runOnceForAllItems',
			jsCode: `const cutoff = $now.minus({ hours: 24 });
const stale = $input.all().filter((item) => DateTime.fromISO(item.json.created_at) < cutoff);
if (stale.length === 0) {
  return [];
}
const lines = stale.map((item) => {
  const pr = item.json;
  const hoursOpen = Math.floor($now.diff(DateTime.fromISO(pr.created_at), 'hours').hours);
  const reviewers = (pr.requested_reviewers || []).map((r) => '@' + r.login).join(', ') || 'no reviewers assigned';
  return '- #' + pr.number + ' ' + pr.title + ' (' + reviewers + ', open for ' + hoursOpen + 'h) ' + pr.html_url;
});
const subject = 'Pull requests waiting for review (open > 24h): ' + stale.length;
const message = subject + '\\n' + lines.join('\\n');
return [{ json: { subject, message, count: stale.length } }];`,
		},
	},
});

// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
type Sink = 'slack' | 'teams' | 'gmail' | 'outlook';
const NOTIFY: Sink = 'slack';

// One ready node per tool. Each reads $json.subject and $json.message.
const sinks = {
	slack: () =>
		node({
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
		}),
	teams: () =>
		node({
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
		}),
	gmail: () =>
		node({
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
		}),
	outlook: () =>
		node({
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
		}),
};
const notify = sinks[NOTIFY]();

export default workflow('id', 'PR Review Reminders')
	.add(schedule)
	.to(getOpenPRs)
	.to(formatMessage)
	.to(notify);
