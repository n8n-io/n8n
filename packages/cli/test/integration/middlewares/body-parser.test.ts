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
});
