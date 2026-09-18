// Use case: other / CRM Deals Updated from the Data Warehouse.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Setup: the data warehouse query returns unprocessed deal updates with DEAL_ID, AMOUNT,
// STAGE (Snowflake returns unquoted column names in upper case). DEAL_ID matches the
// CRM's deal ID.
import { workflow, node, trigger, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

const NOTIFY = 'slack';

// Runs once a day at 05:00.
const schedule = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Daily at 05:00',
		parameters: {
			rule: {
				interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 5, triggerAtMinute: 0 }],
			},
		},
	},
});

// [data warehouse] Snowflake. Swap for another data warehouse: replace this node only.
// The next node reads $json.DEAL_ID, $json.AMOUNT, $json.STAGE.
const readDealUpdates = node({
	type: 'n8n-nodes-base.snowflake',
	version: 1.1,
	config: {
		name: 'Read Deal Updates',
		credentials: { snowflake: newCredential('Snowflake account') },
		parameters: {
			authentication: 'credentials',
			operation: 'executeQuery',
			query: 'SELECT DEAL_ID, AMOUNT, STAGE FROM DEAL_UPDATES WHERE PROCESSED = FALSE;',
		},
	},
	output: [
		{ DEAL_ID: '5001', AMOUNT: 12000, STAGE: 'closedwon' },
		{ DEAL_ID: '5002', AMOUNT: 4300, STAGE: 'contractsent' },
	],
});

// [CRM] HubSpot. Swap for another CRM: replace this node only. It reads $json.DEAL_ID,
// $json.AMOUNT, $json.STAGE. The next node reads its output.
const updateDeal = node({
	type: 'n8n-nodes-base.hubspot',
	version: 2.2,
	config: {
		name: 'Update Deal',
		onError: 'continueRegularOutput',
		credentials: { hubspotAppToken: newCredential('HubSpot account') },
		parameters: {
			resource: 'deal',
			operation: 'update',
			authentication: 'appToken',
			dealId: { __rl: true, mode: 'id', value: expr('{{ $json.DEAL_ID }}') },
			updateFields: {
				amount: expr('{{ $json.AMOUNT }}'),
				stage: expr('{{ $json.STAGE }}'),
			},
		},
	},
	output: [{ id: '5001', properties: { amount: '12000', dealstage: 'closedwon' } }],
});

// Collects every updated deal into one item so Summarize Run can count them.
const collectAll = node({
	type: 'n8n-nodes-base.aggregate',
	version: 1,
	config: {
		name: 'Collect All',
		parameters: {
			aggregate: 'aggregateAllItemData',
			destinationFieldName: 'deals',
			include: 'allFields',
		},
	},
});

// Builds the notification text from the count of updated deals.
const summarizeRun = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Summarize Run',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'subject', value: 'CRM Deal Sync Complete', type: 'string' },
					{
						id: 'a2',
						name: 'message',
						value: expr(
							"{{ $json.deals.filter(d => !d.error).length + ' deals updated, ' + $json.deals.filter(d => d.error).length + ' failed' }}",
						),
						type: 'string',
					},
				],
			},
		},
	},
});

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
					value: placeholder('Slack channel name, for example sales-ops'),
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
				sendTo: placeholder('Recipient email address, for example sales-ops@example.com'),
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
				toRecipients: placeholder('Recipient email address, for example sales-ops@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const notify = node(sinks[NOTIFY]);

export default workflow('id', 'CRM Deals Updated from the Data Warehouse')
	.add(schedule)
	.to(readDealUpdates)
	.to(updateDeal)
	.to(collectAll)
	.to(summarizeRun)
	.to(notify);
