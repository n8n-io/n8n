import { t } from '@n8n/node-sdk';

import { httpRequest } from '../http-request.node';
import { common, toItems } from '../request';

export const sendRequest = httpRequest.action('send', {
	// Major 2: an array response gives one item per element, so the action is 1:N, not per-item.
	// Major 3: the action declares that it reaches the host of `url`.
	version: 3,
	action: 'Send a request',
	summary: 'POST, PUT, PATCH, or DELETE to any HTTP API.',
	flow: { effect: 'write', cardinality: '1:N', idempotent: false },
	egress: { fromInput: 'url' },
	input: {
		method: t.oneOf('POST', 'PUT', 'PATCH', 'DELETE'),
		...common,
		body: t
			.variant('kind', {
				json: { json: t.json().hint('A JSON object; build it in one lambda, never as a string') },
				form: { fields: t.record(t.str()) },
				text: { text: t.str(), contentType: t.str().hint('e.g. text/plain') },
				binary: {
					file: t
						.binary()
						.hint('Streamed as is; its MIME type is the content-type unless headers set one'),
				},
			})
			.optional(),
	},
	output: t.json().hint('The parsed response body; an array body emits one item per element'),
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
		const response = await http.request({
			method: input.method,
			url: input.url,
			query: input.query,
			headers,
			body: payload,
		});
		yield* toItems(response ?? {});
	},
});
