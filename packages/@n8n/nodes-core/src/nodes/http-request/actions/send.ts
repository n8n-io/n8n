import { t } from '@n8n/node-sdk';

import { httpRequest } from '../http-request.node';
import {
	bodySchema,
	common,
	commonUi,
	responseOf,
	responseOptions,
	responseOutputOf,
	toItems,
} from '../request';

const output = t.json().hint('The parsed response body; an array body emits one item per element');

export const sendRequest = httpRequest.action('send', {
	// Major 2: an array response gives one item per element, so the action is 1:N, not per-item.
	// Major 3: the action declares that it reaches the host of `url`.
	version: 3,
	// Minor 1: fullResponse and neverError, as the legacy node has them.
	// Minor 2: schema, the declared body that types the items.
	minor: 2,
	action: 'Send a request',
	summary: 'POST, PUT, PATCH, or DELETE to any HTTP API.',
	flow: { effect: 'write', cardinality: '1:N', idempotent: false },
	egress: { fromInput: 'url' },
	input: {
		method: t.oneOf('POST', 'PUT', 'PATCH', 'DELETE').title('Method'),
		...common,
		body: t
			.variant('kind', {
				json: {
					json: t
						.json()
						.title('JSON')
						.hint('A JSON object; build it in one lambda, never as a string'),
				},
				form: { fields: t.record(t.str()).title('Body Fields') },
				text: {
					text: t.str().title('Body'),
					contentType: t.str().title('Content Type').hint('e.g. text/plain'),
				},
				binary: {
					file: t
						.binary()
						.title('Input Data Field Name')
						.hint('Streamed as is; its MIME type is the content-type unless headers set one'),
				},
			})
			.title('Body')
			.optional(),
		...responseOptions,
		schema: bodySchema,
	},
	ui: commonUi,
	output,
	deriveOutput: responseOutputOf(output.json),
	async *run({ input, http }) {
		const { body } = input;
		const headers =
			body?.kind === 'form'
				? { 'content-type': 'application/x-www-form-urlencoded', ...input.headers }
				: body?.kind === 'text'
					? { 'content-type': body.contentType, ...input.headers }
					: input.headers;
		const payload =
			body?.kind === 'json'
				? body.json
				: body?.kind === 'form'
					? new URLSearchParams(body.fields).toString()
					: body?.kind === 'binary'
						? body.file
						: body?.text;
		const request = {
			method: input.method,
			url: input.url,
			query: input.query,
			headers,
			body: payload,
		};
		yield* toItems((await responseOf(http, request, input)) ?? {});
	},
});
