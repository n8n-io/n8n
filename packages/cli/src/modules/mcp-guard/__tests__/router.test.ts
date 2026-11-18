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

	it('answers from the gym for any tool error of the real service', async () => {
		const { router } = build('The query is too complex', text('gym data'));
		expect(await router.callTool('list_milestones', {})).toEqual(text('gym data'));
	});

	it('keeps a failure that the real service throws, such as an auth or limit error', async () => {
		let gymCalls = 0;
		const router = new GuardRouter({
			upstream: {
				callTool: async () => {
					throw new Error('401 Unauthorized');
				},
				listTools: async () => [],
			} as McpCaller,
			gym: {
				callTool: async () => {
					gymCalls++;
					return text('gym data');
				},
				listTools: async () => [
					{ name: 'list_milestones', inputSchema: { type: 'object' as const } },
				],
			} as McpCaller,
			hydrator: { hydrate: async () => undefined },
			readTools: new Set(['list_milestones']),
			writeTools: new Set(),
		});
		const res = await router.callTool('list_milestones', {});
		expect(res.isError).toBe(true);
		expect(JSON.stringify(res)).toContain('401 Unauthorized');
		// The gym saw only the first check of a read that the gym may refuse.
		expect(gymCalls).toBeLessThanOrEqual(1);
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

describe('GuardRouter writes', () => {
	const build = (gymFails = false) => {
		const calls = { upstream: [] as string[], gym: [] as string[], hydratedWrites: [] as string[] };
		const router = new GuardRouter({
			upstream: {
				callTool: async (name: string) => {
					calls.upstream.push(name);
					return text('real');
				},
				listTools: async () => [
					{ name: 'save_issue', inputSchema: { type: 'object' as const } },
					{ name: 'list_issues', inputSchema: { type: 'object' as const } },
					{ name: 'hidden_tool', inputSchema: { type: 'object' as const } },
				],
			} as McpCaller,
			gym: {
				callTool: async (name: string) => {
					calls.gym.push(name);
					if (gymFails) throw new Error('gym down');
					return text('gym');
				},
				listTools: async () => [],
			} as McpCaller,
			hydrator: {
				hydrate: async () => undefined,
				hydrateWrite: async (name: string) => {
					calls.hydratedWrites.push(name);
				},
			},
			readTools: new Set(['list_issues']),
			writeTools: new Set(['save_issue']),
		});
		return { router, calls };
	};

	it.each(['save_issue', 'a_tool_nobody_listed'])('sends %s to the gym only', async (name) => {
		const { router, calls } = build();
		expect(await router.callTool(name, {})).toEqual(text('gym'));
		expect(calls.upstream).toEqual([]);
		expect(calls.gym).toEqual([name]);
		expect(calls.hydratedWrites).toEqual([name]);
	});

	it('never falls back to the real service when the gym fails', async () => {
		const { router, calls } = build(true);
		const res = await router.callTool('save_issue', {});
		expect(res.isError).toBe(true);
		expect(calls.upstream).toEqual([]);
	});

	it('lists only the tools of the read and write lists', async () => {
		const { router } = build();
		expect((await router.listTools()).map((t) => t.name).sort()).toEqual([
			'list_issues',
			'save_issue',
		]);
	});
});
