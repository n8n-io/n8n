import { Container } from '@n8n/di';

import { currentAgentId, currentChatId, withChatScope } from '../chat-scope';
import { McpGuardService } from '../mcp-guard.service';
import { GUARDED_CALL_TIMEOUT_MS, isGuardedUrl, withMcpGuard } from '../mcp-guard-fetch';

describe('withMcpGuard run id', () => {
	const calls: string[] = [];

	beforeEach(() => {
		calls.length = 0;
		Container.set(McpGuardService, {
			handleMcp: async (_host: string, runId: string) => {
				calls.push(runId);
				return new Response('{}');
			},
		} as unknown as McpGuardService);
	});

	const call = async (fetchFn: ReturnType<typeof withMcpGuard>) =>
		await fetchFn('https://mcp.linear.app/mcp', { method: 'POST', body: '{}' });

	it('uses one run for each chat of the agent', async () => {
		const fetchFn = withMcpGuard(async () => new Response('real'), 'agent1');
		await withChatScope('chatA', async () => await call(fetchFn));
		await withChatScope('chatB', async () => await call(fetchFn));
		await withChatScope('chatA', async () => {
			await new Promise((r) => setTimeout(r, 1));
			await call(fetchFn);
		});
		expect(calls).toEqual(['agent1-chatA', 'agent1-chatB', 'agent1-chatA']);
	});

	it('falls back to the agent run outside a chat', async () => {
		await call(withMcpGuard(async () => new Response('real'), 'agent1'));
		expect(calls).toEqual(['agent1']);
	});
});

describe('guarded call timeout', () => {
	it('applies to the guarded hosts only, and is longer than the MCP SDK default of 60 s', () => {
		expect(isGuardedUrl('https://mcp.linear.app/mcp')).toBe(true);
		expect(isGuardedUrl('https://mcp.notion.com/mcp')).toBe(true);
		expect(isGuardedUrl('https://mcp.example.com/mcp')).toBe(false);
		expect(isGuardedUrl('not a url')).toBe(false);
		expect(GUARDED_CALL_TIMEOUT_MS).toBeGreaterThan(60_000);
	});
});

describe('chat scope agent id', () => {
	it('holds the agent id of the turn for the work that the turn starts', async () => {
		const seen = await withChatScope(
			'chatA',
			async () => {
				await new Promise((r) => setTimeout(r, 1));
				return { chat: currentChatId(), agent: currentAgentId() };
			},
			'agent1',
		);

		expect(seen).toEqual({ chat: 'chatA', agent: 'agent1' });
	});

	it('has no agent id when the turn gave none, or outside a scope', async () => {
		expect(await withChatScope('chatA', async () => currentAgentId())).toBeUndefined();
		expect(currentAgentId()).toBeUndefined();
	});
});
