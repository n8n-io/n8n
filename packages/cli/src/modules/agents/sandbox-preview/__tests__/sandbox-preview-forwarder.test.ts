import fc from 'fast-check';
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http';
import { mock } from 'vitest-mock-extended';

import { serviceRequestHeaders } from '../sandbox-preview-forwarder';
import { PAGE_REQUEST_HEADERS } from '../sandbox-preview-headers';

const requestWith = (headers: IncomingHttpHeaders) => mock<IncomingMessage>({ headers });

const apiKey = () => `test-key-${crypto.randomUUID()}`;

/** The names that may reach the service, whatever the browser sent. */
const ALLOWED = new Set([
	...PAGE_REQUEST_HEADERS,
	'accept-encoding',
	'connection',
	'content-encoding',
	'content-length',
	'origin',
	'sec-fetch-dest',
	'sec-fetch-mode',
	'sec-fetch-site',
	'sec-fetch-user',
	'transfer-encoding',
	'user-agent',
	'x-api-key',
]);

describe('serviceRequestHeaders', () => {
	it('sets the API key and keep-alive in place of what the browser sent', () => {
		const key = apiKey();
		const req = requestWith({
			connection: 'close',
			'x-api-key': 'client-supplied',
			cookie: 'n8n-auth=session',
			expect: '100-continue',
			accept: '*/*',
		});

		expect(serviceRequestHeaders(req, key, Buffer.alloc(0))).toEqual({
			accept: '*/*',
			connection: 'keep-alive',
			'x-api-key': key,
		});
	});

	it('sends no API key header when the service has no key', () => {
		const headers = serviceRequestHeaders(requestWith({ 'x-api-key': 'x' }), undefined, undefined);

		expect(headers).not.toHaveProperty('x-api-key');
	});

	it('frames a body that n8n read by its byte length', () => {
		const body = Buffer.from('café');
		const req = requestWith({
			'content-type': 'text/plain',
			'content-length': '999',
			'transfer-encoding': 'chunked',
		});

		const headers = serviceRequestHeaders(req, undefined, body);

		expect(headers['content-length']).toBe(5);
		expect(headers).not.toHaveProperty('transfer-encoding');
	});

	it('sends no length for an empty body that n8n read', () => {
		const headers = serviceRequestHeaders(
			requestWith({ 'content-length': '0' }),
			undefined,
			Buffer.alloc(0),
		);

		expect(headers).not.toHaveProperty('content-length');
		expect(headers).not.toHaveProperty('transfer-encoding');
	});

	it.each(['gzip', 'deflate'])('drops %s from a body that n8n decoded', (encoding) => {
		const headers = serviceRequestHeaders(
			requestWith({ 'content-encoding': encoding }),
			undefined,
			Buffer.from('decoded'),
		);

		expect(headers).not.toHaveProperty('content-encoding');
	});

	it('keeps an encoding that n8n does not decode', () => {
		const headers = serviceRequestHeaders(
			requestWith({ 'content-encoding': 'br' }),
			undefined,
			Buffer.from('still encoded'),
		);

		expect(headers['content-encoding']).toBe('br');
	});

	it('keeps the framing of a streamed body as the browser sent it', () => {
		const req = requestWith({
			'content-type': 'multipart/form-data; boundary=b',
			'content-length': '42',
			'content-encoding': 'gzip',
		});

		expect(serviceRequestHeaders(req, undefined, undefined)).toEqual({
			'content-type': 'multipart/form-data; boundary=b',
			'content-length': '42',
			'content-encoding': 'gzip',
			connection: 'keep-alive',
		});
	});

	it('sends only allowed headers and a length that matches a read body, for any request', () => {
		const nameArb = fc.oneof(
			fc.constantFrom(...ALLOWED, 'cookie', 'authorization', 'expect', 'host', 'x-forwarded-for'),
			fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/),
		);
		fc.assert(
			fc.property(
				fc.dictionary(nameArb, fc.string({ maxLength: 12 }), { maxKeys: 12 }),
				fc.option(fc.uint8Array({ maxLength: 64 }), { nil: undefined }),
				fc.option(fc.constant(apiKey()), { nil: undefined }),
				(sent, bytes, key) => {
					const body = bytes === undefined ? undefined : Buffer.from(bytes);

					const headers = serviceRequestHeaders(requestWith(sent), key, body);

					for (const name of Object.keys(headers)) expect(ALLOWED.has(name)).toBe(true);
					expect(headers.connection).toBe('keep-alive');
					expect(headers['x-api-key']).toBe(key);
					if (body) {
						expect(headers['content-length']).toBe(body.length > 0 ? body.length : undefined);
						expect(headers).not.toHaveProperty('transfer-encoding');
					}
				},
			),
		);
	});
});
