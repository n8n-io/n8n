/* eslint-disable n8n-local-rules/no-uncaught-json-parse */
import type { Request, Response } from 'express';
import { createServer } from 'http';
import request from 'supertest';
import { gzipSync, deflateSync } from 'zlib';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { rawBodyReader, bodyParser } from '@/middlewares/body-parser';

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
});
