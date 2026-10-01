import type { IN8nHttpFullResponse } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { decodeBufferBody, ENCODED_BUFFER_KEY, encodeBufferBody } from '../buffer-body-codec';

const fullResponse = (body: unknown): IN8nHttpFullResponse => ({
	body: body as IN8nHttpFullResponse['body'],
	headers: { 'content-type': 'application/octet-stream' },
	statusCode: 200,
});

describe('encodeBufferBody', () => {
	it('replaces a Buffer body with a base64 envelope', () => {
		const response = fullResponse(Buffer.from('hello'));

		const encoded = encodeBufferBody(response);

		expect(encoded).toBe(response);
		expect(encoded.body).toEqual({ [ENCODED_BUFFER_KEY]: 'aGVsbG8=' });
	});

	it('encodes an empty Buffer', () => {
		const encoded = encodeBufferBody(fullResponse(Buffer.alloc(0)));

		expect(encoded.body).toEqual({ [ENCODED_BUFFER_KEY]: '' });
	});

	it.each([
		['a JSON body', { hello: 'world' }],
		['a string body', 'hello'],
		['a null body', null],
		['a binary-data reference', { binaryData: { id: 'filesystem-v2:abc' } }],
	])('leaves %s untouched', (_label, body) => {
		const encoded = encodeBufferBody(fullResponse(body));

		expect(encoded.body).toEqual(body);
	});

	it('keeps the headers and the status code', () => {
		const encoded = encodeBufferBody(fullResponse(Buffer.from('hello')));

		expect(encoded.headers).toEqual({ 'content-type': 'application/octet-stream' });
		expect(encoded.statusCode).toBe(200);
	});
});

describe('decodeBufferBody', () => {
	it('restores a base64 envelope to a Buffer', () => {
		const response = fullResponse({ [ENCODED_BUFFER_KEY]: 'aGVsbG8=' });

		const decoded = decodeBufferBody(response);

		expect(decoded).toBe(response);
		expect(decoded.body).toEqual(Buffer.from('hello'));
	});

	it('round-trips arbitrary bytes through JSON', () => {
		const bytes = Buffer.from([0x00, 0xff, 0x10, 0x80]);

		// `deepCopy` is a JSON round trip, the same transform a JSON transport applies.
		const relayed: unknown = deepCopy(encodeBufferBody(fullResponse(bytes)));
		const decoded = decodeBufferBody(relayed) as IN8nHttpFullResponse;

		expect(decoded.body).toEqual(bytes);
	});

	it('round-trips an empty Buffer', () => {
		const decoded = decodeBufferBody(encodeBufferBody(fullResponse(Buffer.alloc(0))));

		expect(decoded.body).toEqual(Buffer.alloc(0));
	});

	it.each([
		['a JSON body', { hello: 'world' }],
		['a string body', 'hello'],
		['a null body', null],
		['a binary-data reference', { binaryData: { id: 'filesystem-v2:abc' } }],
		['an envelope whose payload is not a string', { [ENCODED_BUFFER_KEY]: 42 }],
	])('leaves %s untouched', (_label, body) => {
		const decoded = decodeBufferBody(fullResponse(body));

		expect(decoded.body).toEqual(body);
	});

	it('leaves a payload that is not a full response untouched', () => {
		const payload = { toolResult: 'done' };

		expect(decodeBufferBody(payload)).toBe(payload);
	});
});
