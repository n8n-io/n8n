// Use case: sales-and-marketing / Website Uptime Check.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Edit the "List URLs" node with the real URLs to monitor.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

// Runs every 30 minutes.
const everyThirtyMinutes = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 30 Minutes',
		parameters: {
			rule: {
				interval: [{ field: 'minutes', minutesInterval: 30 }],
			},
		},
	},
});

// Holds the list of URLs to check.
const listUrls = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'List URLs',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'urls',
						value: expr('{{ ["https://example.com", "https://example.com/health"] }}'),
						type: 'array',
					},
				],
			},
		},
	},
});

// Turns the URL list into one item per URL.
const oneItemPerUrl = node({
	type: 'n8n-nodes-base.splitOut',
	version: 1,
	config: {
		name: 'One Item per URL',
		parameters: {
			fieldToSplitOut: 'urls',
			include: 'noOtherFields',
			options: { destinationFieldName: 'url' },
		},
	},
});

// Requests the URL and never throws, so a failed request still reaches the next node.
const checkUrl = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Check URL',
		onError: 'continueRegularOutput',
		parameters: {
			method: 'GET',
			url: expr('{{ $json.url }}'),
			options: {
				response: { response: { fullResponse: true, neverError: true } },
				timeout: 10000,
			},
		},
		output: [{ statusCode: 200 }],
	},
});

// Reads the status code and builds the alert text.
const readStatus = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Read Status',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{
						id: 'a1',
						name: 'url',
						value: expr("{{ $('One Item per URL').item.json.url }}"),
						type: 'string',
					},
					{ id: 'a2', name: 'status', value: expr('{{ $json.statusCode || 0 }}'), type: 'number' },
					{
						id: 'a3',
						name: 'subject',
						value: expr('{{ "Website check failed" }}'),
						type: 'string',
					},
					{
						id: 'a4',
						name: 'message',
						value: expr(
							"{{ $('One Item per URL').item.json.url + ' returned status ' + ($json.statusCode || 0) }}",
						),
						type: 'string',
					},
				],
			},
		},
	},
});

// Keeps only the URLs that did not return a 200 status.
const failedChecks = node({
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	config: {
		name: 'Failed Checks',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.status }}'),
						rightValue: 200,
						operator: { type: 'number', operation: 'notEquals' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

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
				sendTo: placeholder('Recipient email address, for example security@example.com'),
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
				toRecipients: placeholder('Recipient email address, for example security@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notify = node(sinks[NOTIFY]);

export default workflow('id', 'Website Uptime Check')
	.add(everyThirtyMinutes)
	.to(listUrls)
	.to(oneItemPerUrl)
	.to(checkUrl)
	.to(readStatus)
	.to(failedChecks)
	.to(notify);
