import { t } from '@n8n/node-sdk';

import { webhook } from '../webhook.node';

const headers = t.obj({ entries: t.arr(t.obj({ name: t.str(), value: t.str() })) });

const replyOptions = t
	.obj({
		responseCode: t.int().optional().hint('200 when not set'),
		responseHeaders: headers.optional(),
		responseKey: t.str().optional().hint('For the incoming items: wrap them in this field'),
		enableStreaming: t.bool().optional(),
	})
	.optional();

/** The Webhook node, version 2.2. */
export const webhookTrigger = webhook.trigger('trigger', {
	trigger: 'On webhook call',
	summary: 'Starts the workflow when an HTTP request reaches the webhook path.',
	input: {
		httpMethod: t
			.oneOf('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD')
			.hint('A caller sends a JSON body with POST, PUT or PATCH'),
		path: t
			.str()
			.with({ minLength: 1 })
			.hint('URL path after /webhook/, e.g. incidents. :id is a path parameter'),
		authentication: t
			.oneOf('none', 'basicAuth', 'headerAuth', 'jwtAuth')
			.default('none')
			.hint('Setup asks for the credential'),
		responseMode: t
			.oneOf('onReceived', 'lastNode', 'responseNode')
			.default('onReceived')
			.hint('responseNode: webhook.respond sends the reply'),
		responseData: t
			.oneOf('allEntries', 'firstEntryJson', 'firstEntryBinary', 'noData')
			.optional()
			.hint('For responseMode lastNode: what the reply holds'),
		responseBinaryPropertyName: t.str().optional().hint('For responseData firstEntryBinary'),
		options: t
			.obj({
				rawBody: t.bool().optional(),
				binaryPropertyName: t
					.str()
					.optional()
					.hint('Field for a received file; output binary.data needs data'),
				ignoreBots: t.bool().optional(),
				ipWhitelist: t.str().optional().hint('Comma-separated IPs or CIDR ranges'),
				noResponseBody: t.bool().optional(),
				responseData: t.str().optional().hint('For responseMode onReceived: the reply text'),
				responseCode: t
					.obj({ values: t.obj({ responseCode: t.int(), customCode: t.int().optional() }) })
					.optional()
					.hint('Not for responseMode responseNode'),
				responseContentType: t.str().optional(),
				responseHeaders: headers.optional(),
				responsePropertyName: t.str().optional(),
			})
			.optional(),
	},
	output: t.obj({
		headers: t.record(t.str()).hint('Lower-case names'),
		params: t.record(t.str()).hint('Path parameters, e.g. id for :id'),
		query: t.record(t.union(t.str(), t.arr(t.str()))).hint('A repeated key gives a list'),
		body: t
			.declared()
			.hint('Declare its JSON Schema in schema.body to type it; n8n does not check the body'),
		webhookUrl: t.str(),
		executionMode: t.oneOf('test', 'production'),
		data: t.binary().optional().hint('A received file, with options.binaryPropertyName data'),
	}),
	native: { type: 'n8n-nodes-base.webhook', version: 2.2, on: 'webhook' },
	reply: {
		operation: 'respond',
		action: 'Respond to webhook',
		summary: 'Sends the HTTP reply to the webhook caller and passes the items on.',
		native: { type: 'n8n-nodes-base.respondToWebhook', version: 1.5 },
		awaits: { field: 'responseMode', value: 'responseNode' },
		input: t.variant('respondWith', {
			json: {
				responseBody: t.json().hint('A JSON object; respond with allIncomingItems for a list'),
				options: replyOptions,
			},
			text: { responseBody: t.str(), options: replyOptions },
			firstIncomingItem: { options: replyOptions },
			allIncomingItems: { options: replyOptions },
			binary: {
				responseDataSource: t.oneOf('automatically', 'set').default('automatically'),
				inputFieldName: t.str().optional().hint('For responseDataSource set: the binary field'),
				options: replyOptions,
			},
			redirect: { redirectURL: t.str().hint('An absolute URL'), options: replyOptions },
			jwt: {
				payload: t.json().hint('The JWT claims; setup asks for the jwtAuth credential'),
				options: replyOptions,
			},
			noData: { options: replyOptions },
		}),
	},
});
