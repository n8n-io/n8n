import type { CredentialProvider, McpClient } from '@n8n/agents';
import type { CustomFetch } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import type { OauthService } from '@/oauth/oauth.service';

import { buildVerifyMcpServerTool } from '../verify-mcp-server.tool';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const buildMcpClientForServerMock = vi.fn<(...args: [unknown, unknown]) => Promise<McpClient>>();

vi.mock('../../json-config/mcp-client-factory', () => ({
	// eslint-disable-next-line @typescript-eslint/promise-function-async
	buildMcpClientForServer: (arg0: unknown, arg1: unknown) =>
		buildMcpClientForServerMock(arg0, arg1),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps() {
	return {
		credentialProvider: mock<CredentialProvider>(),
		oauthService: mock<OauthService>(),
		projectId: 'proj-1',
		proxyFetch: vi.fn() as unknown as CustomFetch,
	};
}

function makeMcpClient(overrides: Partial<McpClient> = {}): McpClient {
	return {
		listTools: vi.fn().mockResolvedValue([]),
		close: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as McpClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildVerifyMcpServerTool', () => {
	beforeEach(() => {
		buildMcpClientForServerMock.mockReset();
	});

	it('returns { ok: true, tools } with name and description on success', async () => {
		const mcpClient = makeMcpClient({
			listTools: vi.fn().mockResolvedValue([
				{ name: 'echo', description: 'Echo the input' },
				{ name: 'add', description: 'Add two numbers' },
			]),
		});
		buildMcpClientForServerMock.mockResolvedValue(mcpClient);

		const tool = buildVerifyMcpServerTool(makeDeps());
		const result = await tool.handler!(
			{ name: 'my-server', url: 'https://example.test/mcp' },
			{} as never,
		);

		expect(result).toEqual({
			ok: true,
			tools: [
				{ name: 'echo', description: 'Echo the input' },
				{ name: 'add', description: 'Add two numbers' },
			],
		});
	});

	it('uses an empty string when a tool has no description', async () => {
		const mcpClient = makeMcpClient({
			listTools: vi.fn().mockResolvedValue([{ name: 'silent-tool', description: undefined }]),
		});
		buildMcpClientForServerMock.mockResolvedValue(mcpClient);

		const tool = buildVerifyMcpServerTool(makeDeps());
		const result = await tool.handler!(
			{ name: 'my-server', url: 'https://example.test/mcp' },
			{} as never,
		);

		expect(result).toEqual({
			ok: true,
			tools: [{ name: 'silent-tool', description: '' }],
		});
	});

	it('returns { ok: false, error } when listTools throws', async () => {
		const mcpClient = makeMcpClient({
			listTools: vi.fn().mockRejectedValue(new Error('connection timeout')),
		});
		buildMcpClientForServerMock.mockResolvedValue(mcpClient);

		const tool = buildVerifyMcpServerTool(makeDeps());
		const result = await tool.handler!(
			{ name: 'my-server', url: 'https://example.test/mcp' },
			{} as never,
		);

		expect(result).toEqual({ ok: false, error: 'connection timeout' });
	});

	it('returns { ok: false, error } with stringified non-Error rejections', async () => {
		const mcpClient = makeMcpClient({
			listTools: vi.fn().mockRejectedValue('plain string error'),
		});
		buildMcpClientForServerMock.mockResolvedValue(mcpClient);

		const tool = buildVerifyMcpServerTool(makeDeps());
		const result = await tool.handler!(
			{ name: 'my-server', url: 'https://example.test/mcp' },
			{} as never,
		);

		expect(result).toEqual({ ok: false, error: 'plain string error' });
	});

	it('always closes the client — even when listTools fails', async () => {
		const closeMock = vi.fn().mockResolvedValue(undefined);
		const mcpClient = makeMcpClient({
			listTools: vi.fn().mockRejectedValue(new Error('boom')),
			close: closeMock,
		});
		buildMcpClientForServerMock.mockResolvedValue(mcpClient);

		const tool = buildVerifyMcpServerTool(makeDeps());
		await tool.handler!({ name: 'my-server', url: 'https://example.test/mcp' }, {} as never);

		expect(closeMock).toHaveBeenCalledTimes(1);
	});

	it('closes the client even when close() itself rejects', async () => {
		const mcpClient = makeMcpClient({
			listTools: vi.fn().mockResolvedValue([]),
			close: vi.fn().mockRejectedValue(new Error('close error')),
		});
		buildMcpClientForServerMock.mockResolvedValue(mcpClient);

		const tool = buildVerifyMcpServerTool(makeDeps());
		// Should not throw even if close() rejects
		await expect(
			tool.handler!({ name: 'my-server', url: 'https://example.test/mcp' }, {} as never),
		).resolves.toEqual({ ok: true, tools: [] });
	});

	it('forwards name, url, transport, authentication, credential, and connectionTimeoutMs to the factory', async () => {
		const mcpClient = makeMcpClient();
		buildMcpClientForServerMock.mockResolvedValue(mcpClient);

		const deps = makeDeps();
		const tool = buildVerifyMcpServerTool(deps);
		await tool.handler!(
			{
				name: 'my-server',
				url: 'https://example.test/mcp',
				transport: 'sse',
				authentication: 'bearerAuth',
				credential: 'cred-42',
				connectionTimeoutMs: 10_000,
			},
			{} as never,
		);

		expect(buildMcpClientForServerMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'my-server',
				url: 'https://example.test/mcp',
				transport: 'sse',
				authentication: 'bearerAuth',
				credential: 'cred-42',
				connectionTimeoutMs: 10_000,
			}),
			expect.objectContaining({
				credentialProvider: deps.credentialProvider,
				oauthService: deps.oauthService,
				projectId: deps.projectId,
			}),
		);
	});

	it('omits connectionTimeoutMs from the factory call when not provided', async () => {
		const mcpClient = makeMcpClient();
		buildMcpClientForServerMock.mockResolvedValue(mcpClient);

		const tool = buildVerifyMcpServerTool(makeDeps());
		await tool.handler!({ name: 'my-server', url: 'https://example.test/mcp' }, {} as never);

		const [serverArg] = buildMcpClientForServerMock.mock.calls[0] as unknown as [
			Record<string, unknown>,
		];
		expect(serverArg).not.toHaveProperty('connectionTimeoutMs');
	});
});
