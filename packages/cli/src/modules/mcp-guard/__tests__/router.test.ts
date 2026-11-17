import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { McpCaller } from '../mcp-upstream';
import { LINEAR_PROFILE } from '../services';
import { GuardRouter } from '../router';

const text = (t: string): CallToolResult => ({ content: [{ type: 'text', text: t }] });

describe('GuardRouter read args', () => {
	it('asks the real service for more than the agent asked, and answers from the gym with the agent args', async () => {
		const upstreamArgs: unknown[] = [];
		const gymArgs: unknown[] = [];
		const hydrated: unknown[] = [];
		const router = new GuardRouter({
			upstream: {
				callTool: async (_n: string, a: Record<string, unknown>) => {
					upstreamArgs.push(a);
					return text('{"uuid":"x"}');
				},
				listTools: async () => [],
			} as McpCaller,
			gym: {
				callTool: async (_n: string, a: Record<string, unknown>) => {
					gymArgs.push(a);
					return text('gym');
				},
				listTools: async () => [{ name: 'get_issue', inputSchema: { type: 'object' as const } }],
			} as McpCaller,
			hydrator: {
				hydrate: async (_n, a) => {
					hydrated.push(a);
				},
			},
			readTools: new Set(['get_issue']),
			writeTools: new Set(),
			upstreamArgs: LINEAR_PROFILE.upstreamReadArgs,
		});
		const args = { id: 'TRUST-1209', fields: ['id', 'title'] };
		await router.callTool('get_issue', args);
		expect(upstreamArgs).toEqual([{ id: 'TRUST-1209' }]);
		expect(hydrated).toEqual([args]);
		// The gym sees the read twice: before the real read, and as the answer.
		expect(gymArgs).toEqual([args, args]);
	});

	it('leaves the args alone when there is no field list', () => {
		const args = { id: 'TRUST-1209' };
		expect(LINEAR_PROFILE.upstreamReadArgs?.('get_issue', args)).toBe(args);
	});
});

describe('GuardRouter read of an object that only the gym has', () => {
	const build = (realText: string, gym: CallToolResult) => {
		let hydrated = 0;
		const router = new GuardRouter({
			upstream: {
				callTool: async () => ({ ...text(realText), isError: true }),
				listTools: async () => [],
			} as McpCaller,
			gym: {
				callTool: async () => gym,
				listTools: async () => [
					{ name: 'list_milestones', inputSchema: { type: 'object' as const } },
				],
			} as McpCaller,
			hydrator: {
				hydrate: async () => {
					hydrated++;
				},
			},
			readTools: new Set(['list_milestones']),
			writeTools: new Set(),
		});
		return { router, hydrated: () => hydrated };
	};

	it('answers from the gym when the real service finds no such object', async () => {
		const { router, hydrated } = build(
			'Error: Could not find project "P-TRUST-1"',
			text('two milestones'),
		);
		const res = await router.callTool('list_milestones', { project: 'P-TRUST-1' });
		expect(res).toEqual(text('two milestones'));
		expect(hydrated()).toBe(0);
	});

	it('returns the real error when the gym has no such object either', async () => {
		const { router } = build('Error: Could not find project "x"', {
			...text('nope'),
			isError: true,
		});
		const res = await router.callTool('list_milestones', { project: 'x' });
		expect(res.isError).toBe(true);
		expect(JSON.stringify(res)).toContain('Could not find project');
	});

	it('keeps a real error that is not a missing object', async () => {
		const { router } = build('The query is too complex', text('gym data'));
		const res = await router.callTool('list_milestones', {});
		expect(JSON.stringify(res)).toContain('too complex');
	});
});

describe('GuardRouter read of a feature that the gym lacks', () => {
	const build = (gym: CallToolResult) => {
		const calls = { upstream: 0, hydrated: 0 };
		const router = new GuardRouter({
			upstream: {
				callTool: async () => {
					calls.upstream++;
					return text('real rows');
				},
				listTools: async () => [],
			} as McpCaller,
			gym: {
				callTool: async () => gym,
				listTools: async () => [{ name: 'query', inputSchema: { type: 'object' as const } }],
			} as McpCaller,
			hydrator: {
				hydrate: async () => {
					calls.hydrated++;
				},
			},
			readTools: new Set(['query']),
			writeTools: new Set(),
		});
		return { router, calls };
	};

	it('tells the agent at once, without a real read or a hydration', async () => {
		const refusal = {
			isError: true,
			content: [
				{ type: 'text' as const, text: 'SQL mode is not available in the gym build of Notion' },
			],
		};
		const { router, calls } = build(refusal);
		const res = await router.callTool('query', { mode: 'sql' });
		expect(res).toEqual(refusal);
		expect(calls).toEqual({ upstream: 0, hydrated: 0 });
	});

	it('reads the real service when the gym error is another one', async () => {
		const { router, calls } = build({
			isError: true,
			content: [{ type: 'text', text: 'not found' }],
		});
		await router.callTool('query', {});
		expect(calls.upstream).toBe(1);
		expect(calls.hydrated).toBe(1);
	});
});
