import { mock } from 'vitest-mock-extended';
import type { Request, Response } from 'express';

import { NodeMcpPocController } from '../node-mcp-poc.controller';
import type { NodeMcpPocService } from '../node-mcp-poc.service';

function request(remoteAddress: string) {
	return mock<Request>({
		socket: { remoteAddress },
		params: { endpoint: 'a' },
		headers: { authorization: 'Bearer test-token' },
	});
}

describe('NodeMcpPocController', () => {
	const service = mock<NodeMcpPocService>();
	const controller = new NodeMcpPocController(service);
	let originalNodeEnv: string | undefined;

	beforeEach(() => {
		originalNodeEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';
		process.env.N8N_NODE_MCP_POC_ENABLED = 'true';
		process.env.N8N_NODE_MCP_POC_TOKEN = 'test-token';
	});

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
		delete process.env.N8N_NODE_MCP_POC_ENABLED;
		delete process.env.N8N_NODE_MCP_POC_TOKEN;
	});

	it('allows loopback clients in development', async () => {
		const res = mock<Response>();
		res.status.mockReturnValue(res);

		await controller.head(request('127.0.0.1'), res);

		expect(res.status).toHaveBeenCalledWith(204);
		expect(res.end).toHaveBeenCalled();
	});

	it('rejects non-loopback clients', async () => {
		const res = mock<Response>();
		res.status.mockReturnValue(res);

		await controller.head(request('192.0.2.1'), res);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({
			message: 'Node MCP POC endpoints are restricted to loopback clients',
		});
	});

	it('is unavailable in production', async () => {
		process.env.NODE_ENV = 'production';
		const res = mock<Response>();
		res.status.mockReturnValue(res);

		await controller.head(request('127.0.0.1'), res);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.end).toHaveBeenCalled();
	});

	it('requires the configured bearer token', async () => {
		const req = request('127.0.0.1');
		req.headers.authorization = 'Bearer wrong-token';
		const res = mock<Response>();
		res.status.mockReturnValue(res);
		res.header.mockReturnValue(res);

		await controller.head(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.header).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer realm="n8n Node MCP POC"');
	});
});
