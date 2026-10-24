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

	describe('charsets', () => {
		const parse = async (contentType: string, encoding: string, rawBody: Buffer | string) => {
			const req = {
				contentType,
				encoding,
				rawBody: Buffer.from(rawBody),
				readRawBody: async () => {},
			} as unknown as Request;
			await parseBody(req);
			return req.body;
		};

		const form = 'application/x-www-form-urlencoded';
		const latin1 = (text: string) => Buffer.from(text, 'latin1');

		it.each([
			['iso-8859-1', 'text=Gr%FC%DFe', { text: 'Grüße' }],
			['latin1', 'text=Gr%fc%dfe', { text: 'Grüße' }],
			['windows-1252', 'price=5%80&k%E9y=a+%26+b', { price: '5€', kéy: 'a & b' }],
			['shift_jis', 'a=%82%B1%82%F1%82%C9%82%BF%82%CD', { a: 'こんにちは' }],
			['utf-7', 'text=%2BAOk-', { text: 'é' }],
			['iso-8859-1', 'pct=100%&bad=%zz&end=%F', { pct: '100%', bad: '%zz', end: '%F' }],
		])('percent-decodes a %s form body in that charset', async (charset, body, expected) => {
			expect(await parse(form, charset, body)).toEqual(expected);
		});

		it('decodes raw bytes in a legacy charset form body', async () => {
			expect(await parse(form, 'iso-8859-1', latin1('text=Grüße+%FC'))).toEqual({
				text: 'Grüße ü',
			});
		});

		it('decodes a character split across a raw byte and an escape', async () => {
			const body = Buffer.concat([Buffer.from('a='), Buffer.from([0x82]), Buffer.from('%B1')]);

			expect(await parse(form, 'shift_jis', body)).toEqual({ a: 'こ' });
		});

		it('percent-decodes a utf-8 form body as before', async () => {
			expect(await parse(form, 'utf-8', 'text=Gr%C3%BC%C3%9Fe&bad=%FC')).toEqual({
				text: 'Grüße',
				bad: '\ufffd',
			});
		});

		it('percent-decodes a utf-16 form body as utf-8', async () => {
			expect(await parse(form, 'utf-16le', Buffer.from('text=%C3%BC', 'utf16le'))).toEqual({
				text: 'ü',
			});
		});

		it('decodes json, xml and text bodies in a legacy charset', async () => {
			expect(await parse('application/json', 'iso-8859-1', latin1('{"text":"Grüße"}'))).toEqual({
				text: 'Grüße',
			});
			expect(await parse('application/xml', 'windows-1252', latin1('<a>Grüße</a>'))).toEqual({
				a: 'Grüße',
			});
			expect(await parse('text/plain', 'iso-8859-15', Buffer.from([0x47, 0xfc, 0xa4]))).toBe('Gü€');
		});

		it('rejects a body in an unknown charset', async () => {
			await expect(parse(form, 'not-a-charset', 'a=1')).rejects.toThrow(UnprocessableRequestError);
		});
	});
});
