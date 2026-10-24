import type { Request, Response } from 'express';
import { createServer } from 'http';
import request from 'supertest';
import { gzipSync, deflateSync } from 'zlib';

import { rawBodyReader, bodyParser } from '@/middlewares/body-parser';

describe('bodyParser', () => {
	const server = createServer((req: Request, res: Response) => {
		void rawBodyReader(req, res, async () => {
			void bodyParser(req, res, () => res.end(JSON.stringify(req.body)));
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
			// @ts-ignore
			.serialize((d) => gzipSync(JSON.stringify(d)))
			.send({ hello: 'world' })
			.expect(200);
		expect(response.text).toEqual('{"hello":"world"}');
	});

	it('should handle deflate data', async () => {
		const response = await request(server)
			.post('/')
			.set('content-encoding', 'deflate')
			// @ts-ignore
			.serialize((d) => deflateSync(JSON.stringify(d)))
			.send({ hello: 'world' })
			.expect(200);
		expect(response.text).toEqual('{"hello":"world"}');
	});

	it('should decode application/x-www-form-urlencoded with charset=ISO-8859-1', async () => {
		const iso88591Buffer = Buffer.from([116, 101, 120, 116, 61, 71, 114, 0xfc, 0xdf, 101]); // text=Grüße
		const response = await request(server)
			.post('/')
			.set('content-type', 'application/x-www-form-urlencoded; charset=ISO-8859-1')
			.send(iso88591Buffer)
			.expect(200);
		expect(JSON.parse(response.text)).toEqual({ text: 'Grüße' });
	});

	it('should decode application/json with charset=ISO-8859-1', async () => {
		const iso88591Buffer = Buffer.from('{"text":"Gr\xfc\xdfe"}', 'latin1');
		const response = await request(server)
			.post('/')
			.set('content-type', 'application/json; charset=ISO-8859-1')
			.send(iso88591Buffer)
			.expect(200);
		expect(JSON.parse(response.text)).toEqual({ text: 'Grüße' });
	});

	it('should decode text/plain with charset=ISO-8859-1', async () => {
		const iso88591Buffer = Buffer.from('Gr\xfc\xdfe', 'latin1');
		const response = await request(server)
			.post('/')
			.set('content-type', 'text/plain; charset=ISO-8859-1')
			.send(iso88591Buffer)
			.expect(200);
		expect(JSON.parse(response.text)).toEqual('Grüße');
	});

	it('should decode XML with charset=ISO-8859-1', async () => {
		const iso88591Buffer = Buffer.from('<greeting>Gr\xfc\xdfe</greeting>', 'latin1');
		const response = await request(server)
			.post('/')
			.set('content-type', 'application/xml; charset=ISO-8859-1')
			.send(iso88591Buffer)
			.expect(200);
		expect(JSON.parse(response.text)).toEqual({ greeting: 'Grüße' });
	});

	it('should fail with 422 if an unknown charset is supplied', async () => {
		const response = await request(server)
			.post('/')
			.set('content-type', 'text/plain; charset=invalid-charset')
			.send('hello world')
			.expect(422);
		expect(response.body).toEqual({
			code: 422,
			message: 'Failed to parse request body',
			hint: 'Unknown encoding: invalid-charset',
		});
	});
});

