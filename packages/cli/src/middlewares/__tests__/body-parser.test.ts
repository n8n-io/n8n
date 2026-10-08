import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';
import { Readable } from 'stream';
import { brotliCompressSync, deflateSync, gzipSync } from 'zlib';

import { BadRequestError, UnprocessableRequestError } from '@n8n/errors';

import { isDecodedBodyEncoding, parseBody, rawBodyReader } from '../body-parser';

/** Build a request backed by a real readable stream carrying `payload`. */
const mockRequest = (payload: string | Buffer = '', headers: Record<string, string> = {}) => {
	const req = Readable.from([Buffer.from(payload)]) as unknown as Request;
	req.headers = headers;
	return req;
};

describe('rawBodyReader', () => {
	const next = vi.fn();

	const readRawBody = async (req: Request) => {
		void rawBodyReader(req, mock<Response>(), next);
		await req.readRawBody();
	};

	it('reads the body from a readable stream', async () => {
		const req = mockRequest('hello');
		await readRawBody(req);
		expect(req.rawBody.toString()).toBe('hello');
		expect(req._body).toBe(true);
	});

	it('rejects a non-readable stream with BadRequestError', async () => {
		const req = mockRequest('hello');
		req.destroy();
		await expect(readRawBody(req)).rejects.toThrow(BadRequestError);
	});

	it('maps a raw-body "stream.not.readable" rejection to BadRequestError', async () => {
		const req = mockRequest('hello');
		// Simulate the abort racing the read: readable when our guard checks, but
		// no longer readable by the time raw-body reads it (its own guard rejects
		// with type 'stream.not.readable').
		let reads = 0;
		Object.defineProperty(req, 'readable', { get: () => ++reads === 1 });
		await expect(readRawBody(req)).rejects.toThrow(BadRequestError);
	});

	it('maps a raw-body "request.aborted" rejection to BadRequestError', async () => {
		// A stream that aborts mid-read: raw-body rejects with type 'request.aborted'.
		const req = new Readable({ read() {} }) as unknown as Request;
		req.headers = {};
		const promise = readRawBody(req);
		req.emit('aborted');

		await expect(promise).rejects.toMatchObject({
			constructor: BadRequestError,
			cause: { type: 'request.aborted' },
		});
	});

	it.each([
		['gzip', gzipSync],
		['deflate', deflateSync],
	])('keeps a %s body in decoded form', async (encoding, encode) => {
		const req = mockRequest(encode('hello'), { 'content-encoding': encoding });

		await readRawBody(req);

		expect(req.rawBody.toString()).toBe('hello');
		expect(isDecodedBodyEncoding(encoding)).toBe(true);
	});

	it('keeps a body in another encoding as the bytes that were sent', async () => {
		const sent = brotliCompressSync('hello');
		const req = mockRequest(sent, { 'content-encoding': 'br' });

		await readRawBody(req);

		expect(req.rawBody.equals(sent)).toBe(true);
		expect(isDecodedBodyEncoding('br')).toBe(false);
	});
});

describe('isDecodedBodyEncoding', () => {
	it.each([undefined, '', 'identity', 'GZIP', 'x-gzip', 'gzip, deflate', 'toString', '__proto__'])(
		'is false for %j',
		(encoding) => {
			expect(isDecodedBodyEncoding(encoding)).toBe(false);
		},
	);
});

describe('parseBody', () => {
	/** A request as the n8n app sees it after `rawBodyReader`. */
	const parsedRequest = async (payload: string, contentType: string) => {
		const req = mockRequest(payload, { 'content-type': contentType });
		void rawBodyReader(req, mock<Response>(), vi.fn());
		await parseBody(req);
		return req;
	};

	it.each([
		['application/json', '\uFEFF{"name":"Ada","items":[1,2]}', { name: 'Ada', items: [1, 2] }],
		['application/json; charset=utf-8', 'null', null],
		['application/xml', '<Item><Name>Ada</Name></Item>', { item: { name: 'Ada' } }],
		['application/atom+xml', '<feed>x</feed>', { feed: 'x' }],
		['application/x-www-form-urlencoded', 'name=Ada&tag=a&tag=b', { name: 'Ada', tag: ['a', 'b'] }],
		['text/plain', 'plain text', 'plain text'],
	])('parses a %s body', async (contentType, payload, expected) => {
		const req = await parsedRequest(payload, contentType);

		expect(req.body).toEqual(expected);
		expect(req.rawBody.toString()).toBe(payload);
	});

	it.each(['application/octet-stream', 'text/html', 'image/png'])(
		'keeps only the raw bytes of a %s body',
		async (contentType) => {
			const req = await parsedRequest('raw bytes', contentType);

			expect(req.body).toBeUndefined();
			expect(req.rawBody.toString()).toBe('raw bytes');
		},
	);

	it('leaves the body unset for an empty JSON body', async () => {
		const req = await parsedRequest('', 'application/json');

		expect(req.body).toBeUndefined();
		expect(req.rawBody).toHaveLength(0);
	});

	it('does not read a multipart body, so a later parser can stream it', async () => {
		const req = mockRequest('--b--', { 'content-type': 'multipart/form-data; boundary=b' });
		void rawBodyReader(req, mock<Response>(), vi.fn());

		await parseBody(req);

		expect(req.rawBody).toBeUndefined();
		expect(req.readableEnded).toBe(false);
	});

	it.each([
		['application/json', '{"name":'],
		['application/xml', '<item><name>'],
	])('answers 422 for a %s body that does not parse', async (contentType, payload) => {
		const error = await parsedRequest(payload, contentType).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UnprocessableRequestError);
		expect(error).toHaveProperty('message', 'Failed to parse request body');
		expect(error).toHaveProperty('hint', expect.any(String));
	});
});
