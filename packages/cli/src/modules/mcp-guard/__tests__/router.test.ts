import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { McpCaller } from '../mcp-upstream';
import { GuardRouter, type Hydrator } from '../router';

const text = (t: string, isError = false): CallToolResult => ({
	content: [{ type: 'text', text: t }],
	...(isError ? { isError: true } : {}),
});

function caller(
	tools: string[],
	answer: (name: string) => CallToolResult | Promise<CallToolResult>,
) {
	return {
		listTools: vi.fn(async () =>
			tools.map((name) => ({ name, inputSchema: { type: 'object' as const } })),
		),
		callTool: vi.fn(async (name: string) => await answer(name)),
	} satisfies McpCaller;
}

function setup(overrides: { upstream?: McpCaller; gym?: McpCaller; hydrator?: Hydrator } = {}) {
	const upstream =
		overrides.upstream ?? caller(['get_issue', 'create_issue', 'other'], () => text('real'));
	const gym = overrides.gym ?? caller(['get_issue', 'create_issue'], () => text('gym'));
	const hydrator: Hydrator = overrides.hydrator ?? {
		hydrate: vi.fn(async () => {}),
		hydrateWrite: vi.fn(async () => {}),
		noteWrite: vi.fn(),
	};
	const router = new GuardRouter({
		upstream,
		gym,
		hydrator,
		readTools: new Set(['get_issue']),
		writeTools: new Set(['create_issue']),
	});
	return { router, upstream, gym, hydrator };
}

describe('GuardRouter', () => {
	beforeEach(() => {
		mockInstance(Logger);
	});

	it('lists only the tools on the read and write lists', async () => {
		const { router } = setup();
		expect((await router.listTools()).map((t) => t.name)).toEqual(['get_issue', 'create_issue']);
	});

	it('sends a write to the gym only, never to the real service', async () => {
		const { router, upstream, gym, hydrator } = setup();

		await expect(router.callTool('create_issue', { title: 'x' })).resolves.toEqual(text('gym'));

		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledWith('create_issue', { title: 'x' });
		expect(hydrator.noteWrite).toHaveBeenCalledWith('create_issue', text('gym'));
	});

	it('treats a tool that is on no list as a write', async () => {
		const { router, upstream } = setup();
		await router.callTool('other', {});
		expect(upstream.callTool).not.toHaveBeenCalled();
	});

	it('still sends the write when the parent hydration fails', async () => {
		const hydrator: Hydrator = {
			hydrate: vi.fn(),
			hydrateWrite: vi.fn(async () => await Promise.reject(new Error('down'))),
		};
		const { router, gym } = setup({ hydrator });
		await expect(router.callTool('create_issue', {})).resolves.toEqual(text('gym'));
		expect(gym.callTool).toHaveBeenCalledWith('create_issue', {});
	});

	it('reads from the real service, hydrates the gym, and answers from the gym', async () => {
		const { router, upstream, gym, hydrator } = setup();

		await expect(router.callTool('get_issue', { id: '1' })).resolves.toEqual(text('gym'));

		expect(upstream.callTool).toHaveBeenCalledWith('get_issue', { id: '1' });
		expect(hydrator.hydrate).toHaveBeenCalledWith('get_issue', { id: '1' }, text('real'));
		expect(gym.callTool).toHaveBeenLastCalledWith('get_issue', { id: '1' });
	});

	it('answers a read from the real service when the gym lacks the tool', async () => {
		const gym = caller(['create_issue'], () => text('gym'));
		const { router } = setup({ gym });
		await expect(router.callTool('get_issue', {})).resolves.toEqual(text('real'));
	});

	it('returns the gym refusal of a feature it lacks without reading the real service', async () => {
		const refusal = text('SQL mode is not available in the gym', true);
		const gym = caller(['get_issue'], () => refusal);
		const { router, upstream } = setup({ gym });
		await expect(router.callTool('get_issue', {})).resolves.toEqual(refusal);
		expect(upstream.callTool).not.toHaveBeenCalled();
	});

	it('answers from the gym when hydration fails and the gym holds the object', async () => {
		const hydrator: Hydrator = { hydrate: vi.fn(async () => await Promise.reject(new Error('x'))) };
		const { router } = setup({ hydrator });
		await expect(router.callTool('get_issue', {})).resolves.toEqual(text('gym'));
	});

	it('answers with the real read when hydration fails and the gym does not hold the object', async () => {
		const hydrator: Hydrator = { hydrate: vi.fn(async () => await Promise.reject(new Error('x'))) };
		const gym = caller(['get_issue'], () => text('not found', true));
		const { router } = setup({ hydrator, gym });
		await expect(router.callTool('get_issue', {})).resolves.toEqual(text('real'));
	});

	it('returns fixed error messages that do not carry the cause', async () => {
		const secret = 'https://user:token@api.example.com failed';
		const upstream = caller(['get_issue'], async () => await Promise.reject(new Error(secret)));
		const gym = caller(['get_issue', 'create_issue'], async (name) => {
			if (name === 'create_issue') throw new Error(secret);
			return text('gym');
		});
		const { router } = setup({ upstream, gym });

		for (const name of ['get_issue', 'create_issue']) {
			const res = await router.callTool(name, {});
			expect(res.isError).toBe(true);
			expect(JSON.stringify(res)).not.toContain('token');
		}
	});

	it('returns a fixed error when the gym tool list is unreachable', async () => {
		const gym = {
			listTools: vi.fn(async () => await Promise.reject(new Error('http://secret'))),
			callTool: vi.fn(),
		};
		const { router } = setup({ gym });
		await expect(router.callTool('get_issue', {})).resolves.toEqual({
			isError: true,
			content: [{ type: 'text', text: 'The gym is unreachable.' }],
		});
	});
});
