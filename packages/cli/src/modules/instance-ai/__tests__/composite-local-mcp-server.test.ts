import type { McpTool, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';
import type { LocalMcpServer } from '@n8n/instance-ai';

import {
	CompositeLocalMcpServer,
	composeLocalMcpServers,
} from '../browser/composite-local-mcp-server';

function tool(name: string, category = 'browser'): McpTool {
	return {
		name,
		description: name,
		inputSchema: { type: 'object', properties: {} },
		annotations: { category },
	} as McpTool;
}

function ok(text: string): McpToolCallResult {
	return { content: [{ type: 'text', text }] };
}

function fakeServer(tools: McpTool[], result: McpToolCallResult) {
	const callTool = vi.fn(async (_req: McpToolCallRequest) => result);
	const getToolsByCategory = vi.fn((category: string) =>
		tools.filter((t) => t.annotations?.category === category),
	);
	const server: LocalMcpServer = {
		getAvailableTools: () => tools,
		getToolsByCategory,
		callTool,
	};
	return { server, callTool, getToolsByCategory };
}

describe('composeLocalMcpServers', () => {
	it('returns undefined when no servers are present', () => {
		expect(composeLocalMcpServers()).toBeUndefined();
		expect(composeLocalMcpServers(undefined, undefined)).toBeUndefined();
	});

	it('returns the single present server unwrapped (not a composite)', () => {
		const { server } = fakeServer([tool('a')], ok('a'));
		expect(composeLocalMcpServers(undefined, server)).toBe(server);
	});

	it('returns a composite when two or more servers are present', () => {
		const a = fakeServer([tool('a')], ok('a'));
		const b = fakeServer([tool('b')], ok('b'));
		expect(composeLocalMcpServers(a.server, b.server)).toBeInstanceOf(CompositeLocalMcpServer);
	});
});

describe('CompositeLocalMcpServer', () => {
	it('merges tools across servers and de-duplicates by name (last wins)', () => {
		const a = fakeServer([tool('x'), tool('y')], ok('a'));
		const b = fakeServer([tool('y'), tool('z')], ok('b'));
		const composite = new CompositeLocalMcpServer([a.server, b.server]);

		expect(composite.getAvailableTools().map((t) => t.name)).toEqual(['x', 'y', 'z']);
	});

	it('routes callTool to the server that owns the tool', async () => {
		const a = fakeServer([tool('x')], ok('from-a'));
		const b = fakeServer([tool('z')], ok('from-b'));
		const composite = new CompositeLocalMcpServer([a.server, b.server]);

		const result = await composite.callTool({ name: 'z', arguments: {} });

		expect(result).toEqual(ok('from-b'));
		expect(b.callTool).toHaveBeenCalledTimes(1);
		expect(a.callTool).not.toHaveBeenCalled();
	});

	it('routes a duplicated tool name to the last server that declared it', async () => {
		const a = fakeServer([tool('y')], ok('from-a'));
		const b = fakeServer([tool('y')], ok('from-b'));
		const composite = new CompositeLocalMcpServer([a.server, b.server]);

		const result = await composite.callTool({ name: 'y', arguments: {} });

		expect(result).toEqual(ok('from-b'));
		expect(b.callTool).toHaveBeenCalledTimes(1);
		expect(a.callTool).not.toHaveBeenCalled();
	});

	it('returns an error result for an unknown tool', async () => {
		const a = fakeServer([tool('x')], ok('a'));
		const composite = new CompositeLocalMcpServer([a.server]);

		const result = await composite.callTool({ name: 'nope', arguments: {} });

		expect(result.isError).toBe(true);
		expect(result.content[0]).toMatchObject({ type: 'text', text: 'Unknown tool: nope' });
	});

	it('caches getToolsByCategory results per category', () => {
		const a = fakeServer([tool('x', 'browser')], ok('a'));
		const composite = new CompositeLocalMcpServer([a.server]);

		composite.getToolsByCategory('browser');
		composite.getToolsByCategory('browser');

		expect(a.getToolsByCategory).toHaveBeenCalledTimes(1);
	});
});
