import { Container } from '@n8n/di';

import { isGuardedUrl, isMcpGuardActive, withMcpGuard } from '../mcp-guard-fetch';
import { McpGuardService } from '../mcp-guard.service';

vi.mock('../mcp-guard.service', () => ({ McpGuardService: class {} }));

describe('withMcpGuard', () => {
	const handleMcp = vi.fn(async (..._args: unknown[]) => new Response('guard'));
	const baseFetch = vi.fn(async (..._args: unknown[]) => new Response('real'));
	const guarded = withMcpGuard(baseFetch, 'agent-1');

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(McpGuardService, { handleMcp } as unknown as McpGuardService);
	});

	const call = async (url: string) => await (await guarded(url, { method: 'POST' })).text();

	it.each([
		'https://mcp.linear.app/mcp',
		'https://mcp.linear.app/mcp/',
		'https://mcp.linear.app./mcp',
		'https://MCP.Linear.App/mcp',
		'https://mcp.notion.com/mcp',
	])('should send %s to the guard', async (url) => {
		expect(await call(url)).toBe('guard');
		expect(baseFetch).not.toHaveBeenCalled();
	});

	it('should name the canonical host for the guard', async () => {
		await call('https://MCP.Linear.App./mcp/');
		expect(handleMcp).toHaveBeenCalledWith(
			'mcp.linear.app',
			'agent-1',
			expect.any(Request),
			undefined,
		);
	});

	it.each(['/sse', '/sse/', '/sse/abc', '/messages', '/messages/'])(
		'should refuse the SSE path %s',
		async (path) => {
			const res = await guarded(`https://mcp.linear.app${path}`);
			expect(res.status).toBe(403);
			expect(baseFetch).not.toHaveBeenCalled();
		},
	);

	it('should leave OAuth requests of a guarded host to the real server', async () => {
		expect(await call('https://mcp.linear.app/token')).toBe('real');
		expect(handleMcp).not.toHaveBeenCalled();
	});

	it('should leave other hosts to the real server', async () => {
		expect(await call('https://example.com/mcp')).toBe('real');
		expect(handleMcp).not.toHaveBeenCalled();
	});
});

describe('isGuardedUrl', () => {
	it('should compare the canonical host', () => {
		expect(isGuardedUrl('https://mcp.linear.app./mcp')).toBe(true);
		expect(isGuardedUrl('https://example.com/mcp')).toBe(false);
		expect(isGuardedUrl('not a url')).toBe(false);
	});
});

describe('isMcpGuardActive', () => {
	afterEach(() => vi.unstubAllEnvs());

	it('should be off unless MCP_GUARD_HYDRATION is plan or agent', () => {
		expect(isMcpGuardActive('test', false)).toBe(false);
		vi.stubEnv('MCP_GUARD_HYDRATION', 'true');
		expect(isMcpGuardActive('test', false)).toBe(false);
		vi.stubEnv('MCP_GUARD_HYDRATION', 'plan');
		expect(isMcpGuardActive('test', false)).toBe(true);
		vi.stubEnv('MCP_GUARD_HYDRATION', 'agent');
		expect(isMcpGuardActive('test', false)).toBe(true);
	});

	it('should stay off outside a test chat and for an instrumented fetch', () => {
		vi.stubEnv('MCP_GUARD_HYDRATION', 'plan');
		expect(isMcpGuardActive('production', false)).toBe(false);
		expect(isMcpGuardActive(undefined, false)).toBe(false);
		expect(isMcpGuardActive('test', true)).toBe(false);
	});
});
