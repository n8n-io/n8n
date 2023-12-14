import { createServer } from 'http';
import { gzipSync, deflateSync } from 'zlib';
import type { Request, Response } from 'express';
import request from 'supertest';
import { rawBodyReader, bodyParser } from '@/middlewares/bodyParser';

describe('bodyParser', () => {
	const server = createServer((req: Request, res: Response) => {
		rawBodyReader(req, res, async () => {
			try {
				// eslint-disable-next-line @typescript-eslint/return-await
				return await bodyParser(req, res, () => res.end(JSON.stringify(req.body)));
			} catch (error) {
				res.statusCode = error.httpStatusCode || 500;
				res.end(JSON.stringify({ message: error.message, hint: error.hint }));
			}
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

	it('should respect the content-type for application/json', async () => {
		const response = await request(server)
			.post('/')
			.set('Content-Type', 'application/json')
			.send({ hello: 'world' })
			.expect(200);
		expect(response.text).toEqual('{"hello":"world"}');
	});

	it('should throw on unsupported content-type', async () => {
		const response = await request(server)
			.post('/')
			.set('Content-Type', 'application/foobar')
			.send('{"hello":"world"}')
			.expect(422);
		expect(response.text).toEqual(
			'{"message":"Failed to parse request body","hint":"unknown content-type application/foobar"}',
		);
	});

	it('should not care about unsupported content-type if no content', async () => {
		const response = await request(server)
			.post('/')
			.set('Content-Type', 'application/foobar')
			.send()
			.expect(200);
		expect(response.text).toEqual('{}');
	});
});
