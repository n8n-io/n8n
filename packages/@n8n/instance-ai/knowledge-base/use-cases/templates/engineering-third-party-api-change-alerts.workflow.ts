// Use case: engineering / Third-party API change alerts.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap another tool: replace only the node marked with that family. Keep the variable
// name and the fields the next node reads.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Day at 8am',
		parameters: {
			rule: {
				interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 8, triggerAtMinute: 0 }],
			},
		},
	},
});

// Downloads the current OpenAPI document as text.
const fetchSpec = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Fetch Current Spec',
		parameters: {
			method: 'GET',
			url: placeholder('OpenAPI document URL, for example https://api.example.com/openapi.json'),
			options: { response: { response: { responseFormat: 'text', outputPropertyName: 'data' } } },
		},
		output: [{ data: '{"openapi":"3.0.0","paths":{"/users":{},"/orders":{}}}' }],
	},
});

// Reads yesterday's copy. The table needs the string columns api and spec.
const loadPreviousSpec = node({
	type: 'n8n-nodes-base.dataTable',
	version: 1.1,
	config: {
		name: 'Load Previous Spec',
		alwaysOutputData: true,
		parameters: {
			resource: 'row',
			operation: 'get',
			dataTableId: {
				__rl: true,
				mode: 'name',
				value: placeholder('Data table name, for example api_specs'),
			},
			matchType: 'allConditions',
			filters: { conditions: [{ keyName: 'api', condition: 'eq', keyValue: 'watched-api' }] },
			returnAll: false,
			limit: 1,
		},
		output: [{ id: 1, api: 'watched-api', spec: '{"openapi":"3.0.0","paths":{"/users":{}}}' }],
	},
});

// Tool-neutral step: compares the two documents and writes a plain-text change summary
// ($json.subject, $json.message). The store node reads $json.api and $json.spec.
// ponytail: path-level diff; compare operations too if you need finer alerts.
// Code node: try/catch around JSON.parse of the stored copy, then a set difference of paths.
const diffSpecs = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Diff Specs',
		parameters: {
			mode: 'runOnceForAllItems',
			jsCode: `const current = $('Fetch Current Spec').first().json.data;
const previousRow = $input.first().json;
const previous = previousRow && previousRow.spec ? previousRow.spec : '';
if (current === previous) {
  return [];
}
const paths = (text) => {
  try {
    return Object.keys(JSON.parse(text).paths || {});
  } catch (error) {
    return [];
  }
};
const before = paths(previous);
const after = paths(current);
const added = after.filter((p) => !before.includes(p));
const removed = before.filter((p) => !after.includes(p));
const lines = [];
if (added.length) lines.push('Added: ' + added.join(', '));
if (removed.length) lines.push('Removed: ' + removed.join(', '));
if (!lines.length) lines.push('The document changed but the set of paths is the same.');
const subject = 'API change detected';
const message = subject + '\\n' + lines.join('\\n');
return [{ json: { api: 'watched-api', spec: current, subject, message } }];`,
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
					value: placeholder('Slack channel name, for example api-alerts'),
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
				sendTo: placeholder('Recipient email address, for example api-team@example.com'),
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
				toRecipients: placeholder('Recipient email address, for example api-team@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notify = node(sinks[NOTIFY]);

// Stores the current document for tomorrow's comparison.
const storeSpec = node({
	type: 'n8n-nodes-base.dataTable',
	version: 1.1,
	config: {
		name: 'Store Current Spec',
		parameters: {
			resource: 'row',
			operation: 'upsert',
			dataTableId: {
				__rl: true,
				mode: 'name',
				value: placeholder('Data table name, for example api_specs'),
			},
			matchType: 'allConditions',
			filters: {
				conditions: [
					{ keyName: 'api', condition: 'eq', keyValue: "={{ $('Diff Specs').first().json.api }}" },
				],
			},
			columns: {
				mappingMode: 'defineBelow',
				value: {
					api: "={{ $('Diff Specs').first().json.api }}",
					spec: "={{ $('Diff Specs').first().json.spec }}",
				},
				matchingColumns: ['api'],
				schema: [
					{
						id: 'api',
						displayName: 'api',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: true,
					},
					{
						id: 'spec',
						displayName: 'spec',
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: false,
					},
				],
			},
		},
	},
});

export default workflow('id', 'Third-Party API Change Alerts')
	.add(schedule)
	.to(fetchSpec)
	.to(loadPreviousSpec)
	.to(diffSpecs)
	.to(notify)
	.to(storeSpec);
