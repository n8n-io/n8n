// Use case: it / Missing House Number Check on New Orders.
// Notification tool: set NOTIFY to slack, teams, gmail or outlook. Nothing else changes.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// ponytail: one language; add a Switch on $json.customer_locale for more.
import {
	workflow,
	node,
	trigger,
	placeholder,
	newCredential,
	expr,
	ifElse,
} from '@n8n/workflow-sdk';

// [e-commerce] Tool. Swap for another e-commerce tool: replace this node only. It returns the
// order with $json.name, $json.email and $json.shipping_address.
const newOrder = trigger({
	type: 'n8n-nodes-base.shopifyTrigger',
	version: 1,
	config: {
		name: 'New Order',
		credentials: { shopifyAccessTokenApi: newCredential('Shopify account') },
		parameters: { authentication: 'accessToken', topic: 'orders/create' },
		output: [
			{
				id: 5001,
				name: '#1042',
				email: 'jane@example.com',
				customer_locale: 'en',
				shipping_address: {
					first_name: 'Jane',
					last_name: 'Doe',
					address1: 'Main Street',
					address2: '',
					city: 'Springfield',
					zip: '12345',
					country_code: 'US',
				},
			},
		],
	},
});

// True when neither address line holds a digit.
const missingHouseNumber = ifElse({
	version: 2.2,
	config: {
		name: 'Missing House Number',
		parameters: {
			conditions: {
				options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
				conditions: [
					{
						id: 'c1',
						leftValue: expr(
							'{{ ($json.shipping_address.address1 || "") + " " + ($json.shipping_address.address2 || "") }}',
						),
						rightValue: '/\\d/',
						operator: { type: 'string', operation: 'notRegex' },
					},
				],
				combinator: 'and',
			},
		},
	},
});

// Builds the request to the customer. The notification node reads $json.email, $json.subject
// and $json.message.
const prepareRequest = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Prepare Request',
		parameters: {
			mode: 'manual',
			includeOtherFields: false,
			assignments: {
				assignments: [
					{ id: 'a1', name: 'email', value: expr('{{ $json.email }}'), type: 'string' },
					{
						id: 'a2',
						name: 'subject',
						value: expr('{{ "House number missing for order " + $json.name }}'),
						type: 'string',
					},
					{
						id: 'a3',
						name: 'message',
						value: expr(
							'{{ "Dear " + $json.shipping_address.first_name + " " + $json.shipping_address.last_name + ",\\n\\nThank you for your order " + $json.name + ". The house number is missing from the shipping address you entered. Reply to this message with your house number so we can ship your order.\\n\\nKind regards" }}',
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

// One ready node per tool. Mail goes to the customer; chat posts the request to a channel.
const sinks = {
	slack: {
		type: 'n8n-nodes-base.slack',
		version: 2.7,
		config: {
			name: 'Request House Number',
			credentials: { slackOAuth2Api: newCredential('Slack account') },
			parameters: {
				resource: 'message',
				operation: 'post',
				authentication: 'oAuth2',
				select: 'channel',
				channelId: {
					__rl: true,
					mode: 'name',
					value: placeholder('Slack channel name, for example orders'),
				},
				messageType: 'text',
				text: expr('{{ "To: " + $json.email + "\\n" + $json.subject + "\\n\\n" + $json.message }}'),
				otherOptions: { includeLinkToWorkflow: false },
			},
		},
	},
	teams: {
		type: 'n8n-nodes-base.microsoftTeams',
		version: 2,
		config: {
			name: 'Request House Number',
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
				message: expr(
					'{{ "To: " + $json.email + "\\n" + $json.subject + "\\n\\n" + $json.message }}',
				),
			},
		},
	},
	gmail: {
		type: 'n8n-nodes-base.gmail',
		version: 2.2,
		config: {
			name: 'Request House Number',
			credentials: { gmailOAuth2: newCredential('Gmail account') },
			parameters: {
				resource: 'message',
				operation: 'send',
				authentication: 'oAuth2',
				sendTo: expr('{{ $json.email }}'),
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
			name: 'Request House Number',
			credentials: { microsoftOutlookOAuth2Api: newCredential('Microsoft Outlook account') },
			parameters: {
				authentication: 'microsoftOutlookOAuth2Api',
				resource: 'message',
				operation: 'send',
				toRecipients: expr('{{ $json.email }}'),
				subject: expr('{{ $json.subject }}'),
				bodyContent: expr('{{ $json.message }}'),
				additionalFields: { bodyContentType: 'Text' },
			},
		},
	},
};
const requestHouseNumber = node(sinks[NOTIFY]);

export default workflow('id', 'Missing House Number Check on New Orders')
	.add(newOrder)
	.to(missingHouseNumber.onTrue(prepareRequest))
	.add(prepareRequest)
	.to(requestHouseNumber);
