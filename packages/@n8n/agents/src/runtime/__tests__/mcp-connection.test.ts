import { McpClient } from '../../sdk/mcp-client';
import { McpConnection } from '../mcp-connection';

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
const clientClose = vi.fn().mockResolvedValue(undefined);

class FakeClient {
	connect = clientConnect;
	listTools = clientListTools;
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
