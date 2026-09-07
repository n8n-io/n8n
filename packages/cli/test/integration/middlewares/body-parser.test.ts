/* eslint-disable n8n-local-rules/no-uncaught-json-parse */
import type { Request, Response } from 'express';
import { createServer } from 'http';
import request from 'supertest';
import { gzipSync, deflateSync } from 'zlib';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { rawBodyReader, bodyParser, parseBody } from '@/middlewares/body-parser';

describe('bodyParser', () => {
	const server = createServer((req, res) => {
		const expressReq = req as unknown as Request;
		const expressRes = res as unknown as Response;
		void rawBodyReader(expressReq, expressRes, () => {
			void bodyParser(expressReq, expressRes, () => res.end(JSON.stringify(expressReq.body)));
		});
	});

	it('should handle uncompressed data', async () => {
		const response = await request(server).post('/').send({ hello: 'world' }).expect(200);
		expect(response.text).toEqual('{"hello":"world"}');
	});

	it('should handle gzip data', async () => {
		const response = await request(server)
			.post('/')
			.set('content-encoding', 'gzip')
			// @ts-expect-error serialize is typed to return string, but accepts a Buffer
			.serialize((d) => gzipSync(JSON.stringify(d)))
			.send({ hello: 'world' })
			.expect(200);
		expect(response.text).toEqual('{"hello":"world"}');
	});

	it('should handle deflate data', async () => {
		const response = await request(server)
			.post('/')
			.set('content-encoding', 'deflate')
			// @ts-expect-error serialize is typed to return string, but accepts a Buffer
			.serialize((d) => deflateSync(JSON.stringify(d)))
			.send({ hello: 'world' })
			.expect(200);
		expect(response.text).toEqual('{"hello":"world"}');
	});

	it('should sanitize XML tag names', async () => {
		const response = await request(server)
			.post('/')
			.set('content-type', 'application/xml')
			.send('<test><__proto__/></test>')
			.expect(200);
		const body = JSON.parse(response.text) as { test?: Record<string, unknown> };
		expect(body.test).toHaveProperty('sanitized___proto__');
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});

	it('should reject an unreadable request stream as a client error', async () => {
		const req = {
			headers: {},
			destroyed: false,
			readable: false,
		} as unknown as Request;

		void rawBodyReader(req, {} as Response, () => {});

		await expect(req.readRawBody()).rejects.toThrow(BadRequestError);
	});

	describe('leading byte order mark', () => {
		const utf8Bom = Buffer.from([0xef, 0xbb, 0xbf]);
		const utf16leBom = Buffer.from([0xff, 0xfe]);

		// supertest/superagent JSON-serializes any non-string `.send()` payload
		// whose content-type matches a registered serializer (application/json,
		// x-www-form-urlencoded), which would silently mangle these BOM-prefixed
		// buffers. An identity `.serialize()` override keeps the raw bytes intact
		// on the wire — necessary for a byte-for-byte BOM test.
		const identitySerializer = ((data: unknown) => data) as (obj: unknown) => string;
		const sendRaw = (body: Buffer) =>
			request(server).post('/').serialize(identitySerializer).send(body);

		it('should strip a UTF-8 BOM before parsing an application/json body', async () => {
			const body = Buffer.concat([utf8Bom, Buffer.from(JSON.stringify({ hello: 'world' }))]);
			const response = await sendRaw(body).set('content-type', 'application/json').expect(200);
			expect(response.text).toEqual('{"hello":"world"}');
		});

		it('should parse an application/json body without a BOM unchanged', async () => {
			const body = Buffer.from(JSON.stringify({ hello: 'world' }));
			const response = await sendRaw(body).set('content-type', 'application/json').expect(200);
			expect(response.text).toEqual('{"hello":"world"}');
		});

		it('should strip a UTF-16LE BOM before parsing an application/json body', async () => {
			const body = Buffer.concat([
				utf16leBom,
				Buffer.from(JSON.stringify({ hello: 'world' }), 'utf16le'),
			]);
			const response = await sendRaw(body)
				.set('content-type', 'application/json; charset=utf-16le')
				.expect(200);
			expect(response.text).toEqual('{"hello":"world"}');
		});

		it('should strip a BOM before parsing an x-www-form-urlencoded body', async () => {
			const body = Buffer.concat([utf8Bom, Buffer.from('a=1')]);
			const response = await sendRaw(body)
				.set('content-type', 'application/x-www-form-urlencoded')
				.expect(200);
			expect(JSON.parse(response.text)).toEqual({ a: '1' });
		});

		it('should not crash on a body that is only a BOM', async () => {
			// The bare http.Server test harness above has no error-handling
			// middleware to turn a thrown ResponseError into an HTTP response
			// (that's the real app's job), so this asserts against parseBody
			// directly rather than hanging the request/response round trip.
			const req = {
				contentType: 'application/json',
				encoding: 'utf8',
				rawBody: utf8Bom,
				readRawBody: async () => {},
			} as unknown as Request;

			await expect(parseBody(req)).rejects.toThrow(UnprocessableRequestError);
		});

		it('should not strip a BOM character inside a JSON string value', async () => {
			const valueWithEmbeddedBom = String.fromCharCode(0xfeff) + 'world';
			const body = Buffer.concat([
				utf8Bom,
				Buffer.from(JSON.stringify({ hello: valueWithEmbeddedBom })),
			]);
			const response = await sendRaw(body).set('content-type', 'application/json').expect(200);
			expect(JSON.parse(response.text)).toEqual({ hello: valueWithEmbeddedBom });
		});

		it('should parse an application/xml body with a leading BOM unchanged', async () => {
			const body = Buffer.concat([utf8Bom, Buffer.from('<test><a>1</a></test>')]);
			const response = await sendRaw(body).set('content-type', 'application/xml').expect(200);
			expect(JSON.parse(response.text)).toEqual({ test: { a: '1' } });
		});
	});
});
