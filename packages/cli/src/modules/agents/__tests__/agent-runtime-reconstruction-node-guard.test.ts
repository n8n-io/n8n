import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';

const mocks = vi.hoisted(() => ({
	resolveNodeTool: vi.fn(async (..._args: unknown[]) => ({ name: 'tool' })),
	installNodeGuard: vi.fn(() => () => {}),
}));

vi.mock('../tools/node-tool-factory', () => ({ resolveNodeTool: mocks.resolveNodeTool }));
vi.mock('../../mcp-guard/node-guard', () => ({ installNodeGuard: mocks.installNodeGuard }));
vi.mock('@/utils/ai-proxy-fetch', () => ({
	createAiProxyFetch: vi.fn(() => vi.fn()),
	createAiMcpFetch: vi.fn(() => vi.fn()),
	createWebSearchFetch: vi.fn(() => vi.fn()),
}));

type Resolver = (ref: unknown) => Promise<unknown>;

const makeResolver = (options: Record<string, unknown>): Resolver => {
	const service = Object.create(AgentRuntimeReconstructionService.prototype) as Record<
		string,
		unknown
	>;
	service.ephemeralNodeExecutor = {};
	service.outboundHttp = {};
	return (service as any).createRuntimeToolResolver(
		{
			credentialProvider: {},
			projectId: 'p1',
			memoryOwnerAgentId: 'agent-1',
			runtimeProfile: 'full',
			config: {},
			...options,
		},
		false,
		[],
	);
};

const nodeRef = { type: 'node', name: 'gmail', node: { nodeType: 'n8n-nodes-base.gmail' } };

const guardModelOf = async (options: Record<string, unknown>) => {
	await makeResolver(options)(nodeRef);
	return (mocks.resolveNodeTool.mock.calls[0][1] as { guardModel?: unknown }).guardModel;
};

describe('AgentRuntimeReconstructionService node guard wiring', () => {
	beforeEach(() => vi.clearAllMocks());

	afterEach(() => vi.unstubAllEnvs());

	describe('when the guard is on in a test chat', () => {
		beforeEach(() => vi.stubEnv('MCP_GUARD_HYDRATION', 'plan'));

		it('should install the node guard and give node tools the model of the agent', async () => {
			const guardModel = await guardModelOf({ runType: 'test' });

			expect(mocks.installNodeGuard).toHaveBeenCalledTimes(1);
			expect(guardModel).toEqual({ resolve: expect.any(Function), fetch: expect.any(Function) });
		});
	});

	describe('when the guard is off', () => {
		it('should not guard node tools when MCP_GUARD_HYDRATION is not set', async () => {
			expect(await guardModelOf({ runType: 'test' })).toBeUndefined();
			expect(mocks.installNodeGuard).not.toHaveBeenCalled();
		});

		it('should not guard node tools of a production run', async () => {
			vi.stubEnv('MCP_GUARD_HYDRATION', 'plan');

			expect(await guardModelOf({ runType: 'production' })).toBeUndefined();
			expect(mocks.installNodeGuard).not.toHaveBeenCalled();
		});

		it('should not guard node tools of an evaluation run with its own MCP fetch', async () => {
			vi.stubEnv('MCP_GUARD_HYDRATION', 'plan');

			expect(
				await guardModelOf({ runType: 'test', instrumentation: { mcpFetch: vi.fn() } }),
			).toBeUndefined();
			expect(mocks.installNodeGuard).not.toHaveBeenCalled();
		});
	});
});
