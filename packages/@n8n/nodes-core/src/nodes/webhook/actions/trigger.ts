import { t } from '@n8n/node-sdk';

import { webhook } from '../webhook.node';

const headers = t
	.obj({
		entries: t
			.arr(t.obj({ name: t.str().title('Name'), value: t.str().title('Value') }))
			.title('Entries'),
	})
	.title('Response Headers');

const replyOptions = t
	.obj({
		responseCode: t.int().optional().title('Response Code').hint('200 when not set'),
		responseHeaders: headers.optional(),
		responseKey: t
			.str()
			.optional()
			.title('Put Response in Field')
			.hint('For the incoming items: wrap them in this field'),
		enableStreaming: t.bool().optional().title('Enable Streaming'),
	})
	.title('Options')
	.optional();

/** The Webhook node, version 2.2. */
export const webhookTrigger = webhook.trigger('trigger', {
	trigger: 'On webhook call',
	summary: 'Starts the workflow when an HTTP request reaches the webhook path.',
	input: {
		httpMethod: t
			.oneOf('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD')
			.title('HTTP Method')
			.hint('A caller sends a JSON body with POST, PUT or PATCH'),
		path: t
			.str()
			.with({ minLength: 1 })
			.title('Path')
			.hint('URL path after /webhook/, e.g. incidents. :id is a path parameter'),
		authentication: t
			.oneOf('none', 'basicAuth', 'headerAuth', 'jwtAuth')
			.default('none')
			.title('Authentication')
			.hint('Setup asks for the credential'),
		responseMode: t
			.oneOf('onReceived', 'lastNode', 'responseNode')
			.default('onReceived')
			.title('Respond')
			.hint('responseNode: webhook.respond sends the reply'),
		responseData: t
			.oneOf('allEntries', 'firstEntryJson', 'firstEntryBinary', 'noData')
			.optional()
			.title('Response Data')
			.hint('For responseMode lastNode: what the reply holds'),
		responseBinaryPropertyName: t
			.str()
			.optional()
			.title('Property Name')
			.hint('For responseData firstEntryBinary'),
		options: t
			.obj({
				rawBody: t.bool().optional().title('Raw Body'),
				binaryPropertyName: t
					.str()
					.optional()
					.title('Field Name for Binary Data')
					.hint('Key of a binary body; multipart files get <name>0, <name>1, …'),
				ignoreBots: t.bool().optional().title('Ignore Bots'),
				ipWhitelist: t
					.str()
					.optional()
					.title('IP(s) Allowlist')
					.hint('Comma-separated IPs or CIDR ranges'),
				noResponseBody: t.bool().optional().title('No Response Body'),
				responseData: t
					.str()
					.optional()
					.title('Response Data')
					.hint('For responseMode onReceived: the reply text'),
				responseCode: t
					.obj({
						values: t
							.obj({
								responseCode: t.int().title('Code'),
								customCode: t.int().optional().title('Custom Code'),
							})
							.title('Values'),
					})
					.optional()
					.title('Response Code')
					.hint('Not for responseMode responseNode'),
				responseContentType: t.str().optional().title('Response Content-Type'),
				responseHeaders: headers.optional(),
				responsePropertyName: t.str().optional().title('Property Name'),
			})
			.title('Options')
			.optional(),
	},
	output: t.openBinaries(
		t.obj({
			headers: t.record(t.str()).hint('Lower-case names'),
			params: t.record(t.str()).hint('Path parameters, e.g. id for :id'),
			query: t.record(t.union(t.str(), t.arr(t.str()))).hint('A repeated key gives a list'),
			body: t
				.declared()
				.hint('Declare its JSON Schema, with required, in schema.body; n8n does not check it'),
			webhookUrl: t.str(),
			executionMode: t.oneOf('test', 'production'),
		}),
		'A multipart file is under its form field name; a binary or raw body under data',
	),
	native: { type: 'n8n-nodes-base.webhook', version: 2.2, on: 'webhook' },
	reply: {
		operation: 'respond',
		action: 'Respond to webhook',
		summary: 'Sends the HTTP reply to the webhook caller and passes the items on.',
		native: { type: 'n8n-nodes-base.respondToWebhook', version: 1.5 },
		awaits: { field: 'responseMode', value: 'responseNode' },
		input: t.variant('respondWith', {
			json: {
				responseBody: t
					.json()
					.title('Response Body')
					.hint('A JSON object; respond with allIncomingItems for a list'),
				options: replyOptions,
			},
			text: { responseBody: t.str().title('Response Body'), options: replyOptions },
			firstIncomingItem: { options: replyOptions },
			allIncomingItems: { options: replyOptions },
			binary: {
				responseDataSource: t
					.oneOf('automatically', 'set')
					.default('automatically')
					.title('Response Data Source'),
				inputFieldName: t
					.str()
					.optional()
					.title('Input Field Name')
					.hint('For responseDataSource set: the binary field'),
				options: replyOptions,
			},
			redirect: {
				redirectURL: t.str().title('Redirect URL').hint('An absolute URL'),
				options: replyOptions,
			},
			jwt: {
				payload: t
					.json()
					.title('Payload')
					.hint('The JWT claims; setup asks for the jwtAuth credential'),
				options: replyOptions,
			},
			noData: { options: replyOptions },
		}),
	},
});
