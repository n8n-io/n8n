import { McpClient } from '../../sdk/mcp-client';
import { McpConnection } from '../mcp/mcp-connection';

const sseCtor = vi.fn();
const streamableHttpCtor = vi.fn();
const stdioCtor = vi.fn();

const clientConnect = vi.fn().mockResolvedValue(undefined);
const clientListTools = vi.fn().mockResolvedValue({
	tools: [
		{ name: 'echo', description: '', inputSchema: { type: 'object' } },
		{ name: 'add', description: '', inputSchema: { type: 'object' } },
		{ name: 'subtract', description: '', inputSchema: { type: 'object' } },
	],
});
const clientCallTool = vi.fn().mockResolvedValue({ content: [] });
const clientClose = vi.fn().mockResolvedValue(undefined);

class FakeClient {
	connect = clientConnect;
	listTools = clientListTools;
	callTool = clientCallTool;
	close = clientClose;
}

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
	Client: vi.fn(function () {
		return new FakeClient();
	}),
}));

vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
	SSEClientTransport: vi.fn(function (url: URL, options: unknown) {
		sseCtor(url, options);
		return { type: 'sse', url, options };
	}),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
	StdioClientTransport: vi.fn(function (options: unknown) {
		stdioCtor(options);
		return { type: 'stdio', options };
	}),
}));

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
	StreamableHTTPClientTransport: vi.fn(function (url: URL, options: unknown) {
		streamableHttpCtor(url, options);
		return { type: 'streamableHttp', url, options };
	}),
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
	CallToolResultSchema: {},
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('McpConnection — custom fetch forwarding', () => {
	beforeEach(() => {
		sseCtor.mockClear();
		streamableHttpCtor.mockClear();
		stdioCtor.mockClear();
		clientConnect.mockClear();
		clientListTools.mockClear();
	});

	it('forwards `fetch` to StreamableHTTPClientTransport when provided', async () => {
		const customFetch = vi.fn();
		const conn = new McpConnection({
			name: 's1',
			url: 'https://example.test/mcp',
			transport: 'streamableHttp',
			fetch: customFetch as unknown as typeof fetch,
		});

		await conn.connect();

		expect(streamableHttpCtor).toHaveBeenCalledTimes(1);
		const [, options] = streamableHttpCtor.mock.calls[0] as [URL, { fetch?: typeof fetch }];
		expect(options.fetch).toBe(customFetch);
	});

	it('forwards `fetch` to SSEClientTransport and to its eventSourceInit when provided', async () => {
		const customFetch = vi.fn();
		const conn = new McpConnection({
			name: 's2',
			url: 'https://example.test/mcp',
			transport: 'sse',
			fetch: customFetch as unknown as typeof fetch,
		});

		await conn.connect();

		expect(sseCtor).toHaveBeenCalledTimes(1);
		const [, options] = sseCtor.mock.calls[0] as [
			URL,
			{ fetch?: typeof fetch; eventSourceInit?: { fetch?: typeof fetch } },
		];
		expect(options.fetch).toBe(customFetch);
		expect(options.eventSourceInit?.fetch).toBe(customFetch);
	});

	it('omits `fetch` and `eventSourceInit` when no custom fetch is provided', async () => {
		const conn = new McpConnection({
			name: 's3',
			url: 'https://example.test/mcp',
			transport: 'sse',
		});

		await conn.connect();

		expect(sseCtor).toHaveBeenCalledTimes(1);
		const [, options] = sseCtor.mock.calls[0] as [
			URL,
			{ fetch?: typeof fetch; eventSourceInit?: { fetch?: typeof fetch } },
		];
		expect(options.fetch).toBeUndefined();
		expect(options.eventSourceInit).toBeUndefined();
	});
});

describe('McpClient — connection failure handling', () => {
	beforeEach(() => {
		clientConnect.mockReset();
		clientListTools.mockReset();
		clientClose.mockReset();
	});

	it('skips a failing server, records the failure, and keeps the run going', async () => {
		clientConnect.mockRejectedValueOnce(
			new TypeError('fetch failed', {
				cause: new Error('The request was blocked because it resolves to a restricted IP address'),
			}),
		);

		const client = new McpClient([
			{
				name: 'custom_mcp',
				url: 'http://localhost:5678/mcp/my-mcp-server',
				transport: 'streamableHttp',
			},
		]);

		// The run is NOT aborted — listTools resolves with an empty tool list
		// (the failing server contributed nothing).
		const tools = await client.listTools();
		expect(tools).toEqual([]);

		// The failure is recorded with the nested cause flattened in.
		expect(client.getConnectionFailures()).toEqual([
			{
				server: 'custom_mcp',
				error:
					'fetch failed. The request was blocked because it resolves to a restricted IP address',
			},
		]);
	});

	it('invokes onConnectionFailed for each failing server', async () => {
		clientConnect.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('boom'));

		clientListTools.mockResolvedValueOnce({
			tools: [{ name: 'echo', description: '', inputSchema: { type: 'object' } }],
		});

		const onConnectionFailed = vi.fn();
		const client = new McpClient([
			{
				name: 'ok_server',
				url: 'https://example.test/mcp',
				transport: 'streamableHttp',
				onConnectionFailed,
			},
			{
				name: 'bad_server',
				url: 'https://example.test/mcp',
				transport: 'streamableHttp',
				onConnectionFailed,
			},
		]);

		const tools = await client.listTools();

		// Tools from the healthy server survive.
		expect(tools.map((t) => t.name)).toEqual(['ok_server_echo']);
		expect(onConnectionFailed).toHaveBeenCalledTimes(1);
		expect(onConnectionFailed).toHaveBeenCalledWith({
			server: 'bad_server',
			error: 'boom',
		});
		expect(client.getConnectionFailures()).toEqual([{ server: 'bad_server', error: 'boom' }]);
	});

	it('swallows a throwing onConnectionFailed observer', async () => {
		clientConnect.mockRejectedValueOnce(new Error('boom'));
		const onConnectionFailed = vi.fn().mockImplementation(() => {
			throw new Error('observer blew up');
		});

		const client = new McpClient([
			{
				name: 'custom_mcp',
				url: 'http://localhost:5678/mcp/my-mcp-server',
				transport: 'streamableHttp',
				onConnectionFailed,
			},
		]);

		// A faulty observer must not break the run.
		const tools = await client.listTools();
		expect(tools).toEqual([]);
		expect(client.getConnectionFailures()).toHaveLength(1);
	});

	it('disconnects a connection that connects but fails to list tools', async () => {
		// connect() succeeds, but listTools() throws. The connection opened a
		// transport, so it must be torn down rather than leaked for the run.
		clientConnect.mockResolvedValueOnce(undefined);
		clientListTools.mockRejectedValueOnce(new Error('listTools blew up'));

		const client = new McpClient([
			{ name: 'flaky', url: 'https://example.test/mcp', transport: 'streamableHttp' },
		]);

		const tools = await client.listTools();
		expect(tools).toEqual([]);
		expect(client.getConnectionFailures()).toEqual([
			{ server: 'flaky', error: 'listTools blew up' },
		]);
		// The transport that opened before listTools threw was closed.
		expect(clientClose).toHaveBeenCalledTimes(1);
	});
});

describe('McpConnection - tool call settled callback', () => {
	beforeEach(() => {
		clientConnect.mockReset().mockResolvedValue(undefined);
		clientCallTool.mockReset();
	});

	it('reports completed MCP tool calls', async () => {
		const onToolCallSettled = vi.fn();
		const conn = new McpConnection({
			name: 's1',
			url: 'https://example.test/mcp',
			transport: 'streamableHttp',
			onToolCallSettled,
		});
		await conn.connect();

		clientCallTool
			.mockResolvedValueOnce({ content: [] })
			.mockResolvedValueOnce({ content: [], isError: true });

		await conn.callTool('echo', { message: 'ok' });
		await conn.callTool('echo', { message: 'bad' });

		expect(onToolCallSettled).toHaveBeenNthCalledWith(1, { toolName: 'echo', success: true });
		expect(onToolCallSettled).toHaveBeenNthCalledWith(2, { toolName: 'echo', success: false });
	});

	it('reports failed MCP tool calls', async () => {
		const onToolCallSettled = vi.fn();
		const conn = new McpConnection({
			name: 's1',
			url: 'https://example.test/mcp',
			transport: 'streamableHttp',
			onToolCallSettled,
		});
		await conn.connect();
		clientCallTool.mockRejectedValueOnce(new Error('boom'));

		await expect(conn.callTool('echo', { message: 'bad' })).rejects.toThrow('boom');

		expect(onToolCallSettled).toHaveBeenCalledWith({ toolName: 'echo', success: false });
	});
});

describe('McpConnection — tool filtering', () => {
	beforeEach(() => {
		clientConnect.mockClear();
		clientListTools.mockClear();
		clientListTools.mockResolvedValue({
			tools: [
				{ name: 'echo', description: '', inputSchema: { type: 'object' } },
				{ name: 'add', description: '', inputSchema: { type: 'object' } },
				{ name: 'subtract', description: '', inputSchema: { type: 'object' } },
			],
		});
	});

	it('returns all tools when no filter is configured', async () => {
		const conn = new McpConnection({
			name: 's1',
			url: 'https://example.test/mcp',
			transport: 'streamableHttp',
		});

		await conn.connect();
		const tools = await conn.listTools();

		expect(tools.map((tool) => tool.name)).toEqual(['s1_echo', 's1_add', 's1_subtract']);
	});

	it('keeps only allowed tools when allow filter is configured', async () => {
		const conn = new McpConnection({
			name: 's1',
			url: 'https://example.test/mcp',
			transport: 'streamableHttp',
			toolFilter: { mode: 'allow', tools: ['echo', 'subtract'] },
		});

		await conn.connect();
		const tools = await conn.listTools();

		expect(tools.map((tool) => tool.name)).toEqual(['s1_echo', 's1_subtract']);
	});

	it('removes excluded tools when exclude filter is configured', async () => {
		const conn = new McpConnection({
			name: 's1',
			url: 'https://example.test/mcp',
			transport: 'streamableHttp',
			toolFilter: { mode: 'exclude', tools: ['add'] },
		});

		await conn.connect();
		const tools = await conn.listTools();

		expect(tools.map((tool) => tool.name)).toEqual(['s1_echo', 's1_subtract']);
	});

	it('returns no tools for allow mode with an empty list', async () => {
		const allowConn = new McpConnection({
			name: 's1',
			url: 'https://example.test/mcp',
			transport: 'streamableHttp',
			toolFilter: { mode: 'allow', tools: [] },
		});
		await allowConn.connect();
		const allowTools = await allowConn.listTools();

		expect(allowTools).toHaveLength(0);
	});

	it('keeps all tools for exclude mode with an empty list', async () => {
		const excludeConn = new McpConnection({
			name: 's2',
			url: 'https://example.test/mcp',
			transport: 'streamableHttp',
			toolFilter: { mode: 'exclude', tools: [] },
		});
		await excludeConn.connect();
		const excludeTools = await excludeConn.listTools();

		expect(excludeTools.map((tool) => tool.name)).toEqual(['s2_echo', 's2_add', 's2_subtract']);
	});
});
