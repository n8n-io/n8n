import type { Logger } from '@n8n/backend-common';

import { McpGuardService } from '../mcp-guard.service';

const getOrCreate = vi.fn();

vi.mock('../runs', () => ({
	RunRegistry: class {
		getOrCreate = getOrCreate;
	},
}));

const rpc = (method: string, params: unknown = {}) =>
	new Request('https://mcp.linear.app/mcp', {
		method: 'POST',
		headers: {
			authorization: 'Bearer real-token',
			'content-type': 'application/json',
			accept: 'application/json, text/event-stream',
		},
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
	});

describe('McpGuardService.handleMcp', () => {
	const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
	const router = {
		listTools: vi.fn(async () => [{ name: 'get_issue', inputSchema: { type: 'object' } }]),
		callTool: vi.fn(async () => ({ content: [{ type: 'text', text: 'gym answer' }] })),
	};
	let service: McpGuardService;

	beforeEach(() => {
		vi.clearAllMocks();
		getOrCreate.mockResolvedValue({ router });
		service = new McpGuardService(logger as unknown as Logger);
	});

	it('should answer 404 for a host that has no guard', async () => {
		const res = await service.handleMcp('example.com', 'run-1', rpc('tools/list'));
		expect(res.status).toBe(404);
		expect(getOrCreate).not.toHaveBeenCalled();
	});

	it('should answer 401 when the request has no bearer', async () => {
		const req = new Request('https://mcp.linear.app/mcp', { method: 'POST', body: '{}' });
		const res = await service.handleMcp('mcp.linear.app', 'run-1', req);
		expect(res.status).toBe(401);
		expect(getOrCreate).not.toHaveBeenCalled();
	});

	it('should answer 502 and log when the run setup fails', async () => {
		getOrCreate.mockRejectedValue(new Error('gym down'));
		const res = await service.handleMcp('mcp.linear.app', 'run-1', rpc('tools/list'));
		expect(res.status).toBe(502);
		expect(logger.error).toHaveBeenCalled();
	});

	it('should pass the run id, the token and the model to the registry', async () => {
		const model = { resolve: async () => ({}) as never };
		await service.handleMcp('mcp.linear.app', 'agent-1-chat-2', rpc('tools/list'), model);
		expect(getOrCreate).toHaveBeenCalledWith('agent-1-chat-2', 'real-token', model);
	});

	it('should list the tools of the router', async () => {
		const res = await service.handleMcp('mcp.linear.app', 'run-1', rpc('tools/list'));
		const body = (await res.json()) as { result: { tools: Array<{ name: string }> } };
		expect(body.result.tools.map((t) => t.name)).toEqual(['get_issue']);
	});

	it('should send a tool call to the router with its args', async () => {
		const res = await service.handleMcp(
			'mcp.linear.app',
			'run-1',
			rpc('tools/call', { name: 'get_issue', arguments: { id: 'T-1' } }),
		);
		const body = (await res.json()) as { result: { content: Array<{ text: string }> } };
		expect(router.callTool).toHaveBeenCalledWith('get_issue', { id: 'T-1' });
		expect(body.result.content[0].text).toBe('gym answer');
	});
});
