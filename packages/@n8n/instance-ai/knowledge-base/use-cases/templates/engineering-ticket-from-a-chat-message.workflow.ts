// Use case: engineering / Ticket from a chat message.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// [chat] Slack. Swap for Microsoft Teams, Discord or Telegram: replace this node and
// the two other chat nodes. The next node reads $json.item.channel and $json.item.ts.
const reactionAdded = trigger({
	type: 'n8n-nodes-base.slackTrigger',
	version: 1,
	config: {
		name: 'Ticket Reaction Added',
		credentials: { slackApi: newCredential('Slack account') },
		parameters: {
			trigger: ['reaction_added'],
			watchWorkspace: true,
			options: { reactionEmojis: 'ticket' },
		},
		output: [
			{
				type: 'reaction_added',
				user: 'U0123456789',
				reaction: 'ticket',
				item: { type: 'message', channel: 'C0123456789', ts: '1758000000.000100' },
			},
		],
	},
});

// [chat] Slack: reads the text of the message that got the reaction.
const getMessage = node({
	type: 'n8n-nodes-base.slack',
	version: 2.7,
	config: {
		name: 'Get Message',
		credentials: { slackOAuth2Api: newCredential('Slack account') },
		parameters: {
			resource: 'channel',
			operation: 'history',
			authentication: 'oAuth2',
			channelId: { __rl: true, mode: 'id', value: expr('{{ $json.item.channel }}') },
			limit: 1,
			filters: {
				inclusive: true,
				oldest: expr('{{ $json.item.ts }}'),
				latest: expr('{{ $json.item.ts }}'),
			},
		},
		output: [
			{
				type: 'message',
				user: 'U0987654321',
				text: 'Login page returns a 500 after a password reset',
				ts: '1758000000.000100',
			},
		],
	},
});

// Tool-neutral step: one item with summary, description, channel and ts.
const prepareTicket = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Prepare Ticket',
		parameters: {
			mode: 'runOnceForAllItems',
			jsCode: `const message = $input.first().json;
const source = $('Ticket Reaction Added').first().json.item;
const text = (message.text || '').trim();
const summary = text.length > 80 ? text.slice(0, 77) + '...' : text;
const description = text + '\\n\\nCreated from a chat message by <@' + (message.user || 'unknown') + '>.';
return [{ json: { summary, description, channel: source.channel, ts: source.ts } }];`,
		},
	},
});

// [issue tracker] Jira. Swap for Linear, GitHub Issues, Asana, Trello or ClickUp: replace
// this node only. It reads $json.summary and $json.description. The next node reads
// $json.key and $json.self.
const createIssue = node({
	type: 'n8n-nodes-base.jira',
	version: 1,
	config: {
		name: 'Create Jira Issue',
		credentials: { jiraSoftwareCloudApi: newCredential('Jira account') },
		parameters: {
			resource: 'issue',
			operation: 'create',
			jiraVersion: 'cloud',
			project: { __rl: true, mode: 'id', value: placeholder('Jira project id') },
			issueType: {
				__rl: true,
				mode: 'id',
				value: placeholder('Jira issue type id, for example the id of Task'),
			},
			summary: expr('{{ $json.summary }}'),
			additionalFields: { description: expr('{{ $json.description }}') },
		},
		output: [
			{ id: '10042', key: 'ENG-42', self: 'https://acme.atlassian.net/rest/api/2/issue/10042' },
		],
	},
});

// [chat] Slack: replies in the thread with the issue link.
const replyInThread = node({
	type: 'n8n-nodes-base.slack',
	version: 2.7,
	config: {
		name: 'Reply in Thread',
		credentials: { slackOAuth2Api: newCredential('Slack account') },
		parameters: {
			resource: 'message',
			operation: 'post',
			authentication: 'oAuth2',
			select: 'channel',
			channelId: {
				__rl: true,
				mode: 'id',
				value: expr("{{ $('Prepare Ticket').first().json.channel }}"),
			},
			messageType: 'text',
			text: expr(
				"{{ 'Created ' + $json.key + ': ' + $json.self.split('/rest/')[0] + '/browse/' + $json.key }}",
			),
			otherOptions: {
				includeLinkToWorkflow: false,
				thread_ts: {
					replyValues: { thread_ts: expr("{{ $('Prepare Ticket').first().json.ts }}") },
				},
			},
		},
	},
});

export default workflow('id', 'Ticket from a Chat Message')
	.add(reactionAdded)
	.to(getMessage)
	.to(prepareTicket)
	.to(createIssue)
	.to(replyInThread);
