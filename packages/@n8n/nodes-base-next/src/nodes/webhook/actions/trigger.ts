import {
	arr,
	binary,
	bool,
	declared,
	int,
	json,
	obj,
	oneOf,
	record,
	str,
	union,
	variant,
} from '@n8n/node-sdk';

import { webhook } from '../webhook.node';

const headers = obj({ entries: arr(obj({ name: str(), value: str() })) });

const replyOptions = obj({
	responseCode: int().optional().hint('200 when not set'),
	responseHeaders: headers.optional(),
	responseKey: str().optional().hint('For the incoming items: wrap them in this field'),
	enableStreaming: bool().optional(),
}).optional();

/** The Webhook node, version 2.2. */
export const webhookTrigger = webhook.trigger('trigger', {
	trigger: 'On webhook call',
	summary: 'Starts the workflow when an HTTP request reaches the webhook path.',
	input: {
		httpMethod: oneOf('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD').hint(
			'A caller sends a JSON body with POST, PUT or PATCH',
		),
		path: str()
			.with({ minLength: 1 })
			.hint('URL path after /webhook/, e.g. incidents. :id is a path parameter'),
		authentication: oneOf('none', 'basicAuth', 'headerAuth', 'jwtAuth')
			.default('none')
			.hint('Setup asks for the credential'),
		responseMode: oneOf('onReceived', 'lastNode', 'responseNode')
			.default('onReceived')
			.hint('responseNode: webhook.respond sends the reply'),
		responseData: oneOf('allEntries', 'firstEntryJson', 'firstEntryBinary', 'noData')
			.optional()
			.hint('For responseMode lastNode: what the reply holds'),
		responseBinaryPropertyName: str().optional().hint('For responseData firstEntryBinary'),
		options: obj({
			rawBody: bool().optional(),
			binaryPropertyName: str()
				.optional()
				.hint('Field for a received file; output binary.data needs data'),
			ignoreBots: bool().optional(),
			ipWhitelist: str().optional().hint('Comma-separated IPs or CIDR ranges'),
			noResponseBody: bool().optional(),
			responseData: str().optional().hint('For responseMode onReceived: the reply text'),
			responseCode: obj({ values: obj({ responseCode: int(), customCode: int().optional() }) })
				.optional()
				.hint('Not for responseMode responseNode'),
			responseContentType: str().optional(),
			responseHeaders: headers.optional(),
			responsePropertyName: str().optional(),
		}).optional(),
	},
	output: obj({
		headers: record(str()).hint('Lower-case names'),
		params: record(str()).hint('Path parameters, e.g. id for :id'),
		query: record(union(str(), arr(str()))).hint('A repeated key gives a list'),
		body: declared().hint(
			'Declare its JSON Schema in schema.body to type it; n8n does not check the body',
		),
		webhookUrl: str(),
		executionMode: oneOf('test', 'production'),
		data: binary().optional().hint('A received file, with options.binaryPropertyName data'),
	}),
	native: { type: 'n8n-nodes-base.webhook', version: 2.2, on: 'webhook' },
	reply: {
		operation: 'respond',
		action: 'Respond to webhook',
		summary: 'Sends the HTTP reply to the webhook caller and passes the items on.',
		native: { type: 'n8n-nodes-base.respondToWebhook', version: 1.5 },
		awaits: { field: 'responseMode', value: 'responseNode' },
		input: variant('respondWith', {
			json: {
				responseBody: json().hint('A JSON object; respond with allIncomingItems for a list'),
				options: replyOptions,
			},
			text: { responseBody: str(), options: replyOptions },
			firstIncomingItem: { options: replyOptions },
			allIncomingItems: { options: replyOptions },
			binary: {
				responseDataSource: oneOf('automatically', 'set').default('automatically'),
				inputFieldName: str().optional().hint('For responseDataSource set: the binary field'),
				options: replyOptions,
			},
			redirect: { redirectURL: str().hint('An absolute URL'), options: replyOptions },
			jwt: {
				payload: json().hint('The JWT claims; setup asks for the jwtAuth credential'),
				options: replyOptions,
			},
			noData: { options: replyOptions },
		}),
	},
});
