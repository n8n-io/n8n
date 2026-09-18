// Use case: product-design / Web Page Change Tracker.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// The first run posts every link on the page. Relative links post as found. Add a
// Google Sheets append after Prepare Item to keep a log of posted links.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every 4 Hours',
		parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 4 }] } },
	},
});

// Fetches the watched page as text.
const fetchPage = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Fetch Page',
		parameters: {
			method: 'GET',
			url: placeholder('Page URL to watch, for example https://example.com/blog'),
			options: { response: { response: { responseFormat: 'text', outputPropertyName: 'data' } } },
		},
		output: [
			{
				data: '<html><body><ul><li><a href="https://example.com/blog/new-post">New Post</a></li><li><a href="https://example.com/blog/older-post">Older Post</a></li></ul></body></html>',
			},
		],
	},
});

// Extracts the links and their text from the fetched page.
const extractLinks = node({
	type: 'n8n-nodes-base.html',
	version: 1.2,
	config: {
		name: 'Extract Links',
		parameters: {
			operation: 'extractHtmlContent',
			sourceData: 'json',
			dataPropertyName: 'data',
			extractionValues: {
				values: [
					{
						key: 'url',
						cssSelector: 'a',
						returnValue: 'attribute',
						attribute: 'href',
						returnArray: true,
					},
					{ key: 'title', cssSelector: 'a', returnValue: 'text', returnArray: true },
				],
			},
			options: { trimValues: true },
		},
	},
});

// Turns the link and title arrays into one item per link.
const oneItemPerLink = node({
	type: 'n8n-nodes-base.splitOut',
	version: 1,
	config: {
		name: 'One Item per Link',
		parameters: { fieldToSplitOut: 'url, title', include: 'noOtherFields', options: {} },
	},
});

// Keeps only the links not seen in earlier runs.
const keepNewLinks = node({
	type: 'n8n-nodes-base.removeDuplicates',
	version: 2,
	config: {
		name: 'Keep New Links',
		parameters: {
			operation: 'removeItemsSeenInPreviousExecutions',
			logic: 'removeItemsWithAlreadySeenKeyValues',
			dedupeValue: expr('{{ $json.url }}'),
			options: { scope: 'node', historySize: 10000 },
		},
	},
});

// Builds the chat message for a newly found link.
// ponytail: no spreadsheet log, add a Google Sheets append after Prepare Item when a history is needed
const prepareItem = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Item',
		parameters: {
			mode: 'manual',
			includeOtherFields: true,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'found_at', value: expr('{{ $now.toISO() }}'), type: 'string' },
					{
						id: 'a2',
						name: 'subject',
						value: expr('{{ "New link on the tracked page" }}'),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'message',
						value: expr('{{ "New link: " + $json.title + " " + $json.url }}'),
						type: 'string',
					},
				],
			},
		},
	},
});

// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
const NOTIFY = 'slack';

// One ready node per tool. Each reads $json.subject and $json.message. One message is
// sent per new item found.
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
					value: placeholder('Slack channel name, for example content-updates'),
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
				sendTo: placeholder('Recipient email address, for example content-team@example.com'),
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
				toRecipients: placeholder('Recipient email address, for example content-team@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notify = node(sinks[NOTIFY]);

export default workflow('id', 'Web Page Change Tracker')
	.add(schedule)
	.to(fetchPage)
	.to(extractLinks)
	.to(oneItemPerLink)
	.to(keepNewLinks)
	.to(prepareItem)
	.to(notify);
