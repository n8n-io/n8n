import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';
import { Readable } from 'stream';

import { BadRequestError, UnprocessableRequestError } from '@n8n/errors';

import { parseBody, rawBodyReader } from '../body-parser';

/** Build a request backed by a real readable stream carrying `payload`. */
const mockRequest = (payload = '', headers: Record<string, string> = {}) => {
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
});

describe('parseBody', () => {
	const xmlRequest = (body: string) =>
		({
			contentType: 'text/xml',
			encoding: 'utf-8',
			rawBody: Buffer.from(body),
			readRawBody: async () => {},
		}) as unknown as Request;

	// Bodies over 10,000 chars make xml2js parse in chunks across ticks.
	const largeXml = (id: string) =>
		`<?xml version="1.0"?><Envelope><Body>${'<Item><Name>x</Name></Item>'.repeat(1000)}<Id>${id}</Id></Body></Envelope>`;

	it('parses concurrent large XML bodies independently', async () => {
		const requests = ['a', 'b', 'c'].map((id) => xmlRequest(largeXml(id)));

		await Promise.all(requests.map(parseBody));

		expect(requests.map((req) => req.body.envelope.body.id)).toEqual(['a', 'b', 'c']);

		const after = xmlRequest('<root><id>after</id></root>');
		await parseBody(after);
		expect(after.body).toEqual({ root: { id: 'after' } });
	});

	it('rejects an XML body that fails inside an element handler', async () => {
		// An element named `_` collides with the text key and throws while closing the tag.
		await expect(parseBody(xmlRequest('<a><_>x</_></a>'))).rejects.toThrow(
			UnprocessableRequestError,
		);
	});
});
