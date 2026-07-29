import type { IExecuteResponsePromiseData } from 'n8n-workflow';
import { Readable } from 'node:stream';

import {
	decodeRelayedWebhookResponse,
	ENCODED_BUFFER_KEY,
	prepareWebhookResponseForRelay,
} from '../webhook-response-relay';

const fullResponse = (body: unknown): IExecuteResponsePromiseData =>
	({ body, headers: {}, statusCode: 200 }) as IExecuteResponsePromiseData;

describe('prepareWebhookResponseForRelay', () => {
	it('wraps a Buffer body in a base64 envelope', () => {
		const response = fullResponse(Buffer.from('hello'));

		const prepared = prepareWebhookResponseForRelay(response);

		expect(prepared).toBe(response);
		expect(prepared).toEqual(
			expect.objectContaining({ body: { [ENCODED_BUFFER_KEY]: 'aGVsbG8=' } }),
		);
	});

	it.each([
		['a JSON body', { hello: 'world' }],
		['a string body', 'hello'],
		['a null body', null],
		['a binary-data reference', { binaryData: { id: 'database:abc' } }],
	])('leaves %s untouched', (_label, body) => {
		const prepared = prepareWebhookResponseForRelay(fullResponse(body));

		expect(prepared).toEqual(expect.objectContaining({ body }));
	});

	it('leaves a stream body untouched', () => {
		const stream = Readable.from('hello');

		const prepared = prepareWebhookResponseForRelay(fullResponse(stream));

		expect(prepared).toEqual(expect.objectContaining({ body: stream }));
	});

	it('leaves a payload that is not a full response untouched', () => {
		const payload = { toolResult: 'done' };

		expect(prepareWebhookResponseForRelay(payload)).toBe(payload);
	});
});

describe('decodeRelayedWebhookResponse', () => {
	it('restores a base64 envelope to a Buffer', () => {
		const response = fullResponse({ [ENCODED_BUFFER_KEY]: 'aGVsbG8=' });

		const decoded = decodeRelayedWebhookResponse(response);

		expect(decoded).toBe(response);
		expect((decoded as { body: Buffer }).body).toEqual(Buffer.from('hello'));
	});

	it('round-trips a Buffer body', () => {
		const body = Buffer.from([0x00, 0xff, 0x10]);

		const decoded = decodeRelayedWebhookResponse(
			prepareWebhookResponseForRelay(fullResponse(body)),
		);

		expect((decoded as { body: Buffer }).body).toEqual(body);
	});

	it.each([
		['a JSON body', { hello: 'world' }],
		['a string body', 'hello'],
		['a null body', null],
		['an envelope whose payload is not a string', { [ENCODED_BUFFER_KEY]: 42 }],
	])('leaves %s untouched', (_label, body) => {
		const decoded = decodeRelayedWebhookResponse(fullResponse(body));

		expect(decoded).toEqual(expect.objectContaining({ body }));
	});

	it('leaves a payload that is not a full response untouched', () => {
		const payload = { toolResult: 'done' };

		expect(decodeRelayedWebhookResponse(payload)).toBe(payload);
	});
});
