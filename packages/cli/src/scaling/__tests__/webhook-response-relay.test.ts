import type { IExecuteResponsePromiseData } from 'n8n-workflow';
import { Readable } from 'node:stream';

import { WebhookResponseTooLargeError } from '@/errors/webhook-response-too-large.error';

import {
	assertRelayableSize,
	decodeRelayedWebhookResponse,
	ENCODED_BUFFER_KEY,
	encodeRelayedWebhookResponse,
} from '../webhook-response-relay';

const fullResponse = (body: unknown): IExecuteResponsePromiseData =>
	({ body, headers: {}, statusCode: 200 }) as IExecuteResponsePromiseData;

const ONE_MIB = 1024 * 1024;

describe('encodeRelayedWebhookResponse', () => {
	it('wraps a Buffer body in a base64 envelope', () => {
		const response = fullResponse(Buffer.from('hello'));

		const encoded = encodeRelayedWebhookResponse(response);

		expect(encoded).toBe(response);
		expect(encoded).toEqual(
			expect.objectContaining({ body: { [ENCODED_BUFFER_KEY]: 'aGVsbG8=' } }),
		);
	});

	it.each([
		['a JSON body', { hello: 'world' }],
		['a string body', 'hello'],
		['a null body', null],
		['a binary-data reference', { binaryData: { id: 'database:abc' } }],
	])('leaves %s untouched', (_label, body) => {
		const encoded = encodeRelayedWebhookResponse(fullResponse(body));

		expect(encoded).toEqual(expect.objectContaining({ body }));
	});

	it('leaves a stream body untouched', () => {
		const stream = Readable.from('hello');

		const encoded = encodeRelayedWebhookResponse(fullResponse(stream));

		expect(encoded).toEqual(expect.objectContaining({ body: stream }));
	});

	it('leaves a payload that is not a full response untouched', () => {
		const payload = { toolResult: 'done' };

		expect(encodeRelayedWebhookResponse(payload)).toBe(payload);
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

		const decoded = decodeRelayedWebhookResponse(encodeRelayedWebhookResponse(fullResponse(body)));

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

describe('assertRelayableSize', () => {
	describe('within the limit', () => {
		it.each([
			['a Buffer body', Buffer.alloc(ONE_MIB)],
			['a string body', 'x'.repeat(ONE_MIB)],
			['a JSON body', { blob: 'x'.repeat(ONE_MIB) }],
			['a nested JSON body', { outer: { inner: ['x'.repeat(ONE_MIB)] } }],
			['a null body', null],
			['a stream body', Readable.from('hello')],
			['a binary-data reference', { binaryData: { id: 'database:abc' } }],
		])('accepts %s', (_label, body) => {
			expect(() => assertRelayableSize(fullResponse(body), 2)).not.toThrow();
		});

		it('accepts a payload that is not a full response', () => {
			expect(() => assertRelayableSize({ toolResult: 'done' }, 2)).not.toThrow();
		});

		it('accepts a cyclic body it cannot serialize', () => {
			const body: Record<string, unknown> = { name: 'cycle' };
			body.self = body;

			expect(() => assertRelayableSize(fullResponse(body), 2)).not.toThrow();
		});

		it('accepts a body and headers each within the limit, measuring them separately', () => {
			const response: IExecuteResponsePromiseData = {
				body: 'x'.repeat(ONE_MIB),
				headers: { 'x-data': 'y'.repeat(ONE_MIB) },
				statusCode: 200,
			};

			expect(() => assertRelayableSize(response, 2)).not.toThrow();
		});
	});

	describe('over the limit', () => {
		it.each([
			['a Buffer body', Buffer.alloc(3 * ONE_MIB)],
			['a string body', 'x'.repeat(3 * ONE_MIB)],
			['a multi-byte string body', 'é'.repeat(2 * ONE_MIB)],
			['a JSON body', { blob: 'x'.repeat(3 * ONE_MIB) }],
			['a JSON body nested in an array', { items: [{ blob: 'x'.repeat(3 * ONE_MIB) }] }],
		])('rejects %s', (_label, body) => {
			expect(() => assertRelayableSize(fullResponse(body), 2)).toThrow(
				WebhookResponseTooLargeError,
			);
		});

		it('rejects a Buffer body only its base64 expansion pushes over the limit', () => {
			const body = Buffer.alloc(1.75 * ONE_MIB);

			expect(() => assertRelayableSize(fullResponse(body), 2)).toThrow(
				WebhookResponseTooLargeError,
			);
		});

		it('rejects a payload that is not a full response', () => {
			expect(() => assertRelayableSize({ toolResult: 'x'.repeat(3 * ONE_MIB) }, 2)).toThrow(
				WebhookResponseTooLargeError,
			);
		});

		it('rejects oversized headers', () => {
			const response: IExecuteResponsePromiseData = {
				body: null,
				headers: { 'x-data': 'x'.repeat(3 * ONE_MIB) },
				statusCode: 200,
			};

			expect(() => assertRelayableSize(response, 2)).toThrow(WebhookResponseTooLargeError);
		});

		it('rejects an oversized value beside the body of a payload that is not a full response', () => {
			const payload = { body: 'small', extra: 'x'.repeat(3 * ONE_MIB) };

			expect(() => assertRelayableSize(payload, 2)).toThrow(WebhookResponseTooLargeError);
		});

		it('names the limit and how to raise it', () => {
			let error: WebhookResponseTooLargeError | undefined;
			try {
				assertRelayableSize(fullResponse('x'.repeat(3 * ONE_MIB)), 2);
			} catch (e) {
				error = e as WebhookResponseTooLargeError;
			}

			expect(error?.message).toContain('limit is 2 MiB');
			expect(error?.description).toContain('N8N_WEBHOOK_RESPONSE_RELAY_SIZE_MAX');
		});
	});
});
