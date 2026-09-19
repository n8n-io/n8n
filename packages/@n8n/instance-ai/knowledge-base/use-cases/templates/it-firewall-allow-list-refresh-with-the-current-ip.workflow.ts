// Use case: it / Firewall Allow-List Refresh with the Current IP.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// ponytail: one rule for port 443; copy Add Allow Rule for more ports. The firewall rejects a
// duplicate rule, so an unchanged IP creates no new rule and sends no mail.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// Runs every hour.
const everyHour = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Hour',
		parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
	},
});

// Looks up the public IP of this instance. The next node reads $json.ip.
const getPublicIp = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Get Public IP',
		parameters: { method: 'GET', url: 'https://api.ipify.org?format=json', options: {} },
		output: [{ ip: '203.0.113.10' }],
	},
});

// Adds the allow rule to the firewall. The full response keeps $json.statusCode for the check.
const addAllowRule = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.5,
	config: {
		name: 'Add Allow Rule',
		credentials: { httpTemplatedCustomAuth: newCredential('Firewall account') },
		parameters: {
			method: 'POST',
			url: placeholder(
				'Firewall rules endpoint, for example https://api.example.com/v2/firewalls/<firewall id>/rules',
			),
			authentication: 'genericCredentialType',
			genericAuthType: 'httpTemplatedCustomAuth',
			sendBody: true,
			specifyBody: 'json',
			jsonBody: expr(
				'{{ JSON.stringify({ ip_type: "v4", protocol: "tcp", port: "443", subnet: $json.ip, subnet_size: 32, notes: "n8n instance" }) }}',
			),
			options: { response: { response: { fullResponse: true, neverError: true } } },
		},
		output: [
			{
				statusCode: 201,
				statusMessage: 'Created',
				headers: {},
				body: { firewall_rule: { id: 1 } },
			},
		],
	},
});

// True when the firewall created the rule.
const ruleCreated = ifElse({
	version: 2.2,
	config: {
		name: 'Rule Created',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr('{{ $json.statusCode }}'),
						rightValue: 201,
						operator: { type: 'number', operation: 'equals' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Builds the confirmation. The notification node reads $json.subject and $json.message.
const prepareConfirmation = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Confirmation',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'subject', value: 'Firewall: new n8n IP allow-listed', type: 'string' },
					{
						id: 'a2',
						name: 'message',
						value: expr(
							"{{ 'OK: allow-listed the new n8n IP address ' + $('Get Public IP').item.json.ip + ' for port 443.' }}",
						),
						type: 'string',
					},
				],
			},
		},
	},
});

// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
const NOTIFY = 'gmail';

// One ready node per tool. Each reads $json.subject and $json.message.
const sinks = {
	slack: {
		type: 'n8n-nodes-base.slack',
		version: 2.7,
		config: {
			name: 'Confirm Rule',
			credentials: { slackOAuth2Api: newCredential('Slack account') },
			parameters: {
				resource: 'message',
				operation: 'post',
				authentication: 'oAuth2',
				select: 'channel',
				channelId: {
					__rl: true,
					mode: 'name',
					value: placeholder('Slack channel name, for example it-ops'),
				},
				messageType: 'text',
				text: expr('{{ $json.subject + "\\n" + $json.message }}'),
				otherOptions: { includeLinkToWorkflow: false },
			},
		},
	},
	teams: {
		type: 'n8n-nodes-base.microsoftTeams',
		version: 2,
		config: {
			name: 'Confirm Rule',
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
				message: expr('{{ $json.subject + "\\n" + $json.message }}'),
			},
		},
	},
	gmail: {
		type: 'n8n-nodes-base.gmail',
		version: 2.2,
		config: {
			name: 'Confirm Rule',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'send',
				authentication: 'oAuth2',
				sendTo: placeholder('IT mailbox, for example it@example.com'),
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
			name: 'Confirm Rule',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'send',
				toRecipients: placeholder('IT mailbox, for example it@example.com'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const confirmRule = node(sinks[NOTIFY]);

export default workflow('id', 'Firewall Allow-List Refresh with the Current IP')
	.add(everyHour)
	.to(getPublicIp)
	.to(addAllowRule)
	.to(ruleCreated.onTrue(prepareConfirmation))
	.add(prepareConfirmation)
	.to(confirmRule);
