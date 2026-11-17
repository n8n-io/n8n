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
		expect(gymArgs).toEqual([args]);
	});

	it('leaves the args alone when there is no field list', () => {
		const args = { id: 'TRUST-1209' };
		expect(LINEAR_PROFILE.upstreamReadArgs?.('get_issue', args)).toBe(args);
	});
});
