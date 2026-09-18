// Use case: engineering / Standup summary.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap another tool: replace only the node marked with that family. Keep the variable
// name and the fields the next node reads.
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
// The summary node reads: number, title, html_url, merged_at, user.login.
const getMergedPRs = node({
	type: 'n8n-nodes-base.github',
	version: 1.1,
	config: {
		name: 'Get Merged PRs',
		alwaysOutputData: true,
		credentials: { githubApi: newCredential('GitHub account') },
		parameters: {
			resource: 'repository',
			operation: 'getPullRequests',
			authentication: 'accessToken',
			owner: { __rl: true, mode: 'name', value: placeholder('GitHub owner (org or username)') },
			repository: { __rl: true, mode: 'name', value: placeholder('Repository name') },
			returnAll: false,
			limit: 30,
			getRepositoryPullRequestsFilters: { state: 'closed', sort: 'updated', direction: 'desc' },
		},
		output: [
			{
				number: 42,
				title: 'Fix authentication bug',
				html_url: 'https://github.com/acme/api/pull/42',
				merged_at: '2026-09-15T16:00:00.000Z',
				user: { login: 'alice' },
			},
		],
	},
});

// [issue tracker] Jira. Swap for Linear, GitHub Issues, Asana, Trello or ClickUp: replace
// this node only. It runs once per day, not once per pull request. The summary node
// reads: key, fields.summary, fields.status.name, fields.assignee.displayName.
const getUpdatedIssues = node({
	type: 'n8n-nodes-base.jira',
	version: 1,
	config: {
		name: 'Get Updated Issues',
		executeOnce: true,
		alwaysOutputData: true,
		credentials: { jiraSoftwareCloudApi: newCredential('Jira account') },
		parameters: {
			resource: 'issue',
			operation: 'getAll',
			jiraVersion: 'cloud',
			returnAll: false,
			limit: 50,
			options: {
				jql: placeholder(
					'JQL for your team, for example project = ENG AND status changed AFTER -1d',
				),
				fields: 'summary,status,assignee,updated',
			},
		},
		output: [
			{
				key: 'ENG-42',
				fields: {
					summary: 'Rotate API keys',
					status: { name: 'In Review' },
					assignee: { displayName: 'Alice Doe' },
					updated: '2026-09-15T15:00:00.000Z',
				},
			},
		],
	},
});

// Tool-neutral step: groups yesterday's activity per person. Plain text, readable in a
// chat message and in an email.
// Code node: groups two sources by person, a multi-pass algorithm.
const buildSummary = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Build Summary',
		parameters: {
			mode: 'runOnceForAllItems',
			jsCode: `const since = $now.minus({ days: 1 });
const byPerson = {};
const add = (person, line) => {
  byPerson[person] = byPerson[person] || [];
  byPerson[person].push(line);
};
for (const item of $('Get Merged PRs').all()) {
  const pr = item.json;
  if (!pr.merged_at || DateTime.fromISO(pr.merged_at) < since) continue;
  add(pr.user.login, 'merged #' + pr.number + ' ' + pr.title + ' ' + pr.html_url);
}
for (const item of $input.all()) {
  const issue = item.json;
  if (!issue.key) continue;
  const person = (issue.fields.assignee && issue.fields.assignee.displayName) || 'Unassigned';
  add(person, issue.key + ' ' + issue.fields.summary + ' -> ' + issue.fields.status.name);
}
const subject = 'Standup summary for ' + $now.toISODate();
const people = Object.keys(byPerson).sort();
if (people.length === 0) {
  return [{ json: { subject, message: subject + '\\nNo activity since yesterday.' } }];
}
const sections = people.map((person) => person + '\\n' + byPerson[person].map((l) => '- ' + l).join('\\n'));
return [{ json: { subject, message: subject + '\\n\\n' + sections.join('\\n\\n') } }];`,
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
					value: placeholder('Slack channel name, for example team-standup'),
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
				sendTo: placeholder('Recipient email address, for example team@example.com'),
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
				toRecipients: placeholder('Recipient email address, for example team@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notify = node(sinks[NOTIFY]);

export default workflow('id', 'Standup Summary')
	.add(schedule)
	.to(getMergedPRs)
	.to(getUpdatedIssues)
	.to(buildSummary)
	.to(notify);
