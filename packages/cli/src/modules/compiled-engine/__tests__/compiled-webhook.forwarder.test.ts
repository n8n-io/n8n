import type { Logger } from '@n8n/backend-common';
import type { Request, Response } from 'express';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mock } from 'vitest-mock-extended';

import { CompiledWebhookForwarder, forwardedHeaders } from '../compiled-webhook.forwarder';
import type { WfrtAdminClient } from '../wfrt-admin.client';

describe('forwardedHeaders', () => {
	it('keeps the host of the caller, as the trigger item of v1 has it', () => {
		expect(forwardedHeaders({ host: 'n8n.example.com', accept: '*/*' })).toEqual({
			host: 'n8n.example.com',
			accept: '*/*',
		});
	});

	it('leaves out the headers of the body transfer and joins repeated headers', () => {
		const headers = forwardedHeaders({
			host: 'n8n.example.com',
			connection: 'keep-alive',
			'content-length': '12',
			'transfer-encoding': 'chunked',
			'x-tag': ['a', 'b'],
			'x-empty': undefined,
		});
		expect(headers).toEqual({ host: 'n8n.example.com', connection: 'keep-alive', 'x-tag': 'a, b' });
		// The order of the caller stays: the trigger item has the headers in this order.
		expect(Object.keys(headers)).toEqual(['host', 'connection', 'x-tag']);
	});
});

describe('CompiledWebhookForwarder', () => {
	let upstream: Server;
	let seen: { headers: IncomingHttpHeaders; url?: string; body: string } | undefined;
	let client: WfrtAdminClient;
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	beforeAll(async () => {
		upstream = createServer((request, response) => {
			const chunks: Buffer[] = [];
			request.on('data', (chunk: Buffer) => chunks.push(chunk));
			request.on('end', () => {
				seen = {
					headers: request.headers,
					url: request.url,
					body: Buffer.concat(chunks).toString('utf8'),
				};
				response.writeHead(201, { 'content-type': 'application/json', 'x-answer': 'yes' });
				response.end('{"ok":true}');
			});
		});
		await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
		const { port } = upstream.address() as AddressInfo;
		client = mock<WfrtAdminClient>({ publicUrl: `http://127.0.0.1:${port}` });
	});

	afterAll(async () => {
		await new Promise((resolve) => upstream.close(resolve));
	});

	it('sends the request with the host of the caller and writes the answer of wfrt', async () => {
		const body = Buffer.from('{"name":"Ada"}');
		// A plain object: a mock of the request would wrap the body buffer.
		const request = {
			method: 'POST',
			headers: { host: 'n8n.example.com', 'content-type': 'application/json' },
			originalUrl: '/webhook/orders?a=1',
			url: '/webhook/orders?a=1',
			rawBody: body,
			readRawBody: async () => {},
		} as unknown as Request;
		const response = mock<Response>();
		response.status.mockReturnValue(response);

		await new CompiledWebhookForwarder(client, logger).forward(request, response, 'orders');

		expect(logger.warn.mock.calls).toEqual([]);
		expect(seen?.headers.host).toBe('n8n.example.com');
		expect(seen?.headers['content-length']).toBe(String(body.length));
		expect(seen?.url).toContain('/orders?a=1');
		expect(seen?.body).toBe('{"name":"Ada"}');
		expect(response.status).toHaveBeenCalledWith(201);
		expect(response.setHeader).toHaveBeenCalledWith('x-answer', 'yes');
		expect(response.end).toHaveBeenCalledWith(Buffer.from('{"ok":true}'));
	});
});
