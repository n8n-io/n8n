import { Container } from '@n8n/di';

import { McpGuardService } from '../../mcp-guard/mcp-guard.service';
import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';

const built = vi.hoisted(() => ({ options: undefined as Record<string, any> | undefined }));

vi.mock('../json-config/mcp-client-factory', () => ({
	buildMcpClientForServer: vi.fn(async (_server: unknown, options: Record<string, any>) => {
		built.options = options;
		return {};
	}),
}));
vi.mock('@/utils/ai-proxy-fetch', () => ({
	createAiProxyFetch: vi.fn(() => vi.fn()),
	createAiMcpFetch: vi.fn(() => vi.fn()),
	createWebSearchFetch: vi.fn(() => vi.fn()),
}));
vi.mock('../../mcp-guard/mcp-guard.service', () => ({ McpGuardService: class {} }));

type Factory = (server: { name: string; url: string }) => Promise<unknown>;

// The factory is private. The service is built without its dependencies, because the factory uses only these.
const makeFactory = (
	options: Record<string, unknown>,
	aiMcpFetch: (...args: unknown[]) => Promise<Response>,
): Factory => {
	const service = Object.create(AgentRuntimeReconstructionService.prototype) as Record<
		string,
		unknown
	>;
	service.outboundHttp = {};
	service.oauthService = {};
	service.mcpRegistryService = {};
	service.logger = { warn: vi.fn() };
	return (service as any).makeMcpClientFactory(options, aiMcpFetch, new Map());
};

describe('AgentRuntimeReconstructionService MCP guard wiring', () => {
	const server = { name: 'linear', url: 'https://mcp.linear.app/mcp' };
	const aiMcpFetch = vi.fn(async (..._args: unknown[]) => new Response('real'));
	const handleMcp = vi.fn(async (..._args: unknown[]) => new Response('guard'));
	const baseOptions = {
		credentialProvider: {},
		projectId: 'p1',
		memoryOwnerAgentId: 'agent-1',
		runtimeProfile: 'full',
		config: {},
	};

	const proxyFetchOf = async (options: Record<string, unknown>) => {
		await makeFactory({ ...baseOptions, ...options }, aiMcpFetch)(server);
		return built.options!.proxyFetch as (url: string, init?: RequestInit) => Promise<Response>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		built.options = undefined;
		Container.set(McpGuardService, { handleMcp } as unknown as McpGuardService);
	});

	afterEach(() => vi.unstubAllEnvs());

	describe('when the guard is on in a test chat', () => {
		beforeEach(() => vi.stubEnv('MCP_GUARD_HYDRATION', 'plan'));

		it('should keep Linear MCP calls away from the real service', async () => {
			const proxyFetch = await proxyFetchOf({ runType: 'test', previewChat: true });
			const res = await proxyFetch('https://mcp.linear.app/mcp', { method: 'POST', body: '{}' });
			expect(await res.text()).toBe('guard');
			expect(aiMcpFetch).not.toHaveBeenCalled();
		});

		it('should name the agent as the owner of the run', async () => {
			const proxyFetch = await proxyFetchOf({ runType: 'test', previewChat: true });
			await proxyFetch('https://mcp.notion.com/mcp', { method: 'POST', body: '{}' });
			expect(handleMcp).toHaveBeenCalledWith(
				'mcp.notion.com',
				'agent-1',
				expect.any(Request),
				expect.objectContaining({ resolve: expect.any(Function) }),
			);
		});

		it('should leave other hosts to the real fetch', async () => {
			const proxyFetch = await proxyFetchOf({ runType: 'test', previewChat: true });
			await proxyFetch('https://example.com/mcp', { method: 'POST', body: '{}' });
			expect(aiMcpFetch).toHaveBeenCalled();
			expect(handleMcp).not.toHaveBeenCalled();
		});

		it('should give every MCP call a long timeout', async () => {
			await proxyFetchOf({ runType: 'test', previewChat: true });
			expect(built.options!.callTimeoutMs).toBe(5 * 60 * 1000);
		});
	});

	describe('when the guard does not apply', () => {
		it('should do nothing without MCP_GUARD_HYDRATION', async () => {
			const proxyFetch = await proxyFetchOf({ runType: 'test', previewChat: true });
			expect(proxyFetch).toBe(aiMcpFetch);
			expect(built.options!.callTimeoutMs).toBeUndefined();
		});

		it.each([
			['outside a test chat', { runType: 'production', previewChat: true }],
			['for a manual or chat workflow run', { runType: 'test' }],
			[
				'for an evaluation run with its own MCP fetch',
				{ runType: 'test', previewChat: true, instrumentation: { mcpFetch: vi.fn() } },
			],
		])('should do nothing %s', async (_name, options) => {
			vi.stubEnv('MCP_GUARD_HYDRATION', 'plan');
			const proxyFetch = await proxyFetchOf(options);
			expect(proxyFetch).not.toBe(undefined);
			await proxyFetch('https://mcp.linear.app/mcp', { method: 'POST', body: '{}' });
			expect(handleMcp).not.toHaveBeenCalled();
			expect(built.options!.callTimeoutMs).toBeUndefined();
		});
	});
});
