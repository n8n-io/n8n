import { Container } from '@n8n/di';

import { isMcpGuardActive, withMcpGuard } from '../mcp-guard-fetch';
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

	it.each(['/sse', '/sse/', '/sse/abc', '/messages', '/messages/', '//mcp', '/v1/mcp', '/message'])(
		'should refuse the path %s',
		async (path) => {
			const res = await guarded(`https://mcp.linear.app${path}`);
			expect(res.status).toBe(403);
			expect(baseFetch).not.toHaveBeenCalled();
			expect(handleMcp).not.toHaveBeenCalled();
		},
	);

	it.each([
		'/token',
		'/authorize',
		'/register',
		'/.well-known/oauth-authorization-server',
		'/.well-known/oauth-protected-resource/mcp',
	])('should leave the OAuth path %s of a guarded host to the real server', async (path) => {
		expect(await call(`https://mcp.linear.app${path}`)).toBe('real');
		expect(handleMcp).not.toHaveBeenCalled();
	});

	it('should not consume the body of a request for another host', async () => {
		const req = new Request('https://example.com/api', { method: 'POST', body: 'payload' });
		await guarded(req);
		expect(req.bodyUsed).toBe(false);
		expect(baseFetch).toHaveBeenCalledWith(req, undefined);
	});

	it('should leave other hosts to the real server', async () => {
		expect(await call('https://example.com/mcp')).toBe('real');
		expect(handleMcp).not.toHaveBeenCalled();
	});
});

describe('isMcpGuardActive', () => {
	afterEach(() => vi.unstubAllEnvs());

	it('should be off unless MCP_GUARD_HYDRATION is plan', () => {
		expect(isMcpGuardActive('test', false, true)).toBe(false);
		vi.stubEnv('MCP_GUARD_HYDRATION', 'true');
		expect(isMcpGuardActive('test', false, true)).toBe(false);
		vi.stubEnv('MCP_GUARD_HYDRATION', 'agent');
		expect(isMcpGuardActive('test', false, true)).toBe(false);
		vi.stubEnv('MCP_GUARD_HYDRATION', 'plan');
		expect(isMcpGuardActive('test', false, true)).toBe(true);
	});

	it('should stay off outside the preview chat and for an instrumented fetch', () => {
		vi.stubEnv('MCP_GUARD_HYDRATION', 'plan');
		expect(isMcpGuardActive('production', false, true)).toBe(false);
		expect(isMcpGuardActive(undefined, false, true)).toBe(false);
		expect(isMcpGuardActive('test', true, true)).toBe(false);
		expect(isMcpGuardActive('test', false, false)).toBe(false);
		expect(isMcpGuardActive('test', false, undefined)).toBe(false);
	});
});
