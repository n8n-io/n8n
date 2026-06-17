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
