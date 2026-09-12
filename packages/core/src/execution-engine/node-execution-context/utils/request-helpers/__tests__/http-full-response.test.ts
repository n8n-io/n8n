import { Readable } from 'stream';

import {
	materializeHttpResponseBody,
	toHttpFullResponse,
	toHttpFullResponseOrBody,
} from '../http-full-response';

describe('toHttpFullResponse', () => {
	it('reads a legacy full response', () => {
		expect(
			toHttpFullResponse({
				statusCode: 400,
				body: { code: 10001 },
				headers: { 'content-type': 'application/json' },
				statusMessage: 'Bad Request',
			}),
		).toEqual({
			statusCode: 400,
			body: { code: 10001 },
			headers: { 'content-type': 'application/json' },
			statusMessage: 'Bad Request',
		});
	});

	it('reads an axios-style error', () => {
		expect(
			toHttpFullResponse({
				response: {
					status: 401,
					data: { error: 'token_expired' },
					headers: { server: 'gateway' },
					statusText: 'Unauthorized',
				},
			}),
		).toEqual({
			statusCode: 401,
			body: { error: 'token_expired' },
			headers: { server: 'gateway' },
			statusMessage: 'Unauthorized',
		});
	});

	it('reads a legacy error payload from the top-level error field', () => {
		expect(
			toHttpFullResponse({
				statusCode: 400,
				error: { errcode: 40001 },
				response: {
					status: 400,
					headers: {},
					statusText: 'Bad Request',
				},
			}),
		).toEqual({
			statusCode: 400,
			body: { errcode: 40001 },
			headers: {},
			statusMessage: 'Bad Request',
		});
	});

	it('parses a JSON buffer body', () => {
		expect(
			toHttpFullResponse({
				statusCode: 200,
				body: Buffer.from(JSON.stringify({ code: 10001 })),
				headers: {},
			}),
		).toEqual({
			statusCode: 200,
			body: { code: 10001 },
			headers: {},
		});
	});

	it('returns undefined for a body-only value', () => {
		expect(toHttpFullResponse({ code: 10001 })).toBeUndefined();
	});

	it('does not treat a readable stream as a response envelope', () => {
		const stream = Readable.from([Buffer.from('{"code":10001}')]);
		(stream as unknown as { statusCode: number }).statusCode = 200;

		expect(toHttpFullResponse(stream)).toBeUndefined();
	});

	it('parses a JSON string body', () => {
		expect(
			toHttpFullResponse({
				statusCode: 200,
				body: '{"code":10001}',
				headers: {},
			}),
		).toEqual({
			statusCode: 200,
			body: { code: 10001 },
			headers: {},
		});
	});
});

describe('toHttpFullResponseOrBody', () => {
	it('wraps a body-only success as status 200', () => {
		expect(toHttpFullResponseOrBody({ code: 10001 })).toEqual({
			statusCode: 200,
			body: { code: 10001 },
			headers: {},
		});
	});

	it('leaves a stream body unparsed until it is materialized', () => {
		const stream = Readable.from([Buffer.from(JSON.stringify({ code: 10001 }))]);
		const wrapped = toHttpFullResponseOrBody({
			statusCode: 200,
			body: stream,
			headers: {},
		});

		expect(wrapped.body).toBe(stream);
		expect(
			typeof wrapped.body === 'object' && wrapped.body !== null && 'code' in wrapped.body,
		).toBe(false);
	});

	it('keeps an already-normalized full response', () => {
		expect(
			toHttpFullResponseOrBody({
				statusCode: 400,
				body: { error: 'token_expired' },
				headers: { server: 'gateway' },
				statusMessage: 'Bad Request',
			}),
		).toEqual({
			statusCode: 400,
			body: { error: 'token_expired' },
			headers: { server: 'gateway' },
			statusMessage: 'Bad Request',
		});
	});
});

describe('materializeHttpResponseBody', () => {
	it('reads a JSON stream on a full response so $response.body is an object', async () => {
		const response = {
			statusCode: 200,
			body: Readable.from([Buffer.from(JSON.stringify({ code: 10001 }))]),
			headers: {},
		};

		const materialized = await materializeHttpResponseBody(response);

		expect(materialized).toBe(response);
		expect(toHttpFullResponseOrBody(materialized)).toEqual({
			statusCode: 200,
			body: { code: 10001 },
			headers: {},
		});
	});

	it('does not consume a non-JSON stream body', async () => {
		const stream = Readable.from([Buffer.from('binary-file')]);
		const response = {
			statusCode: 200,
			body: stream,
			headers: { 'content-type': 'application/octet-stream' },
		};

		const materialized = await materializeHttpResponseBody(response);

		expect(materialized).toBe(response);
		expect(response.body).toBe(stream);
		expect(stream.readable).toBe(true);
	});

	it('returns a body-only stream as a parsed Buffer', async () => {
		const stream = Readable.from([Buffer.from(JSON.stringify({ code: 0 }))]);
		const materialized = await materializeHttpResponseBody(stream);

		expect(Buffer.isBuffer(materialized)).toBe(true);
		expect(toHttpFullResponseOrBody(materialized)).toEqual({
			statusCode: 200,
			body: { code: 0 },
			headers: {},
		});
	});
});
