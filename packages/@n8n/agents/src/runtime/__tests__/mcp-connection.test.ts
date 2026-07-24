import { McpClient } from '../../sdk/mcp-client';
import { McpConnection } from '../mcp/mcp-connection';
import { executeTool } from '../tools/tool-adapter';

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

describe('McpClient — connection error formatting', () => {
	beforeEach(() => {
		clientConnect.mockReset();
		clientListTools.mockReset();
		clientClose.mockReset();
	});

	it('includes nested fetch causes in the aggregated connection error', async () => {
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

		await expect(client.listTools()).rejects.toThrow(
			'MCP connection failed:\n\tcustom_mcp: fetch failed. The request was blocked because it resolves to a restricted IP address',
		);
	});
});

describe('McpClient — tool name normalization', () => {
	beforeEach(() => {
		clientConnect.mockReset().mockResolvedValue(undefined);
		clientListTools.mockReset().mockResolvedValue({
			tools: [{ name: 'read', description: '', inputSchema: { type: 'object' } }],
		});
		clientClose.mockReset().mockResolvedValue(undefined);
	});

	it('keeps model-facing names unique across normalized server prefixes', async () => {
		const client = new McpClient([
			{ name: 'foo bar', url: 'https://example.test/first' },
			{ name: 'foo_bar', url: 'https://example.test/second' },
		]);

		const tools = await client.listTools();

		expect(new Set(tools.map((tool) => tool.name)).size).toBe(2);
		await client.close();
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
		clientCallTool.mockReset().mockResolvedValue({ content: [] });
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

	it('normalizes the model-facing prefix while preserving the MCP server name', async () => {
		const conn = new McpConnection({
			name: 'Linear Prod',
			url: 'https://example.test/mcp',
			transport: 'streamableHttp',
			requireApproval: ['echo'],
		});

		await conn.connect();
		const tools = await conn.listTools();

		expect(tools.map((tool) => tool.name)).toEqual([
			'Linear_Prod_echo',
			'Linear_Prod_add',
			'Linear_Prod_subtract',
		]);
		expect(tools.every((tool) => tool.mcpServerName === 'Linear Prod')).toBe(true);
		expect(tools).toEqual([
			expect.objectContaining({ mcpToolName: 'echo' }),
			expect.objectContaining({ mcpToolName: 'add' }),
			expect.objectContaining({ mcpToolName: 'subtract' }),
		]);
		expect(tools[0]?.suspendSchema).toBeDefined();
		expect(tools[1]?.suspendSchema).toBeUndefined();
	});

	it('keeps model-facing names unique when tool names normalize identically', async () => {
		const onToolCallSettled = vi.fn();
		const rawTools = [
			{ name: 'read file', description: '', inputSchema: { type: 'object' } },
			{ name: 'read_file', description: '', inputSchema: { type: 'object' } },
		];
		clientListTools
			.mockResolvedValueOnce({ tools: rawTools })
			.mockResolvedValueOnce({ tools: [...rawTools].reverse() });

		const conn = new McpConnection({
			name: 's1',
			url: 'https://example.test/mcp',
			transport: 'streamableHttp',
			onToolCallSettled,
		});

		await conn.connect();
		const tools = await conn.listTools();
		const reversedTools = await conn.listTools();

		expect(new Set(tools.map((tool) => tool.name)).size).toBe(2);
		expect(tools.map((tool) => tool.name)).toEqual([
			reversedTools[1]?.name,
			reversedTools[0]?.name,
		]);
		await executeTool({}, tools[0]);
		await executeTool({}, tools[1]);
		expect(onToolCallSettled).toHaveBeenNthCalledWith(1, {
			toolName: 'read file',
			modelToolName: tools[0].name,
			success: true,
		});
		expect(onToolCallSettled).toHaveBeenNthCalledWith(2, {
			toolName: 'read_file',
			modelToolName: tools[1].name,
			success: true,
		});
	});

	it('keeps model-facing names unique when truncation removes the differing suffix', async () => {
		const sharedPrefix = 'a'.repeat(80);
		const rawTools = [
			{ name: `${sharedPrefix}x`, description: '', inputSchema: { type: 'object' } },
			{ name: `${sharedPrefix}y`, description: '', inputSchema: { type: 'object' } },
		];
		clientListTools
			.mockResolvedValueOnce({ tools: rawTools })
			.mockResolvedValueOnce({ tools: [...rawTools].reverse() });

		const conn = new McpConnection({
			name: 's1',
			url: 'https://example.test/mcp',
			transport: 'streamableHttp',
		});

		await conn.connect();
		const tools = await conn.listTools();
		const reversedTools = await conn.listTools();

		expect(new Set(tools.map((tool) => tool.name)).size).toBe(2);
		expect(tools.every((tool) => tool.name.length <= 64)).toBe(true);
		expect(tools.map((tool) => tool.name)).toEqual([
			reversedTools[1]?.name,
			reversedTools[0]?.name,
		]);
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
