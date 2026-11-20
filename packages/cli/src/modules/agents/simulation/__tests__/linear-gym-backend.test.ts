import { afterEach, describe, expect, it, vi } from 'vitest';

import { LinearGymBackend } from '../linear-gym-backend';
import { SimulationBackendRegistry } from '../simulation-backend-registry';
import type { OpenWorldInput, SimulationWorld } from '../tool-simulation.contracts';

const input: OpenWorldInput = {
	ownerId: 'owner',
	testChatId: 'chat',
	firstMessage: '',
	agent: {
		agentId: 'agent',
		projectId: 'project',
		name: 'agent',
		instructions: '',
		tools: [{ kind: 'mcp', toolName: 'linear', origin: 'https://mcp.linear.app' }],
	},
};
const backend = new LinearGymBackend();
afterEach(() => vi.unstubAllEnvs());

describe('Linear fixture selection', () => {
	it('requires the configured server and owner', async () => {
		expect(
			await backend.describeTools({
				...input.agent,
				tools: [{ kind: 'mcp', toolName: 'linear', origin: 'https://other.example' }],
			}),
		).toEqual([]);
		await expect(backend.openWorld({ ...input, ownerId: undefined })).rejects.toThrow(
			'unavailable',
		);
	});
	it('refuses non-loopback configuration', async () => {
		vi.stubEnv('GYM_BASE_URL', 'http://example.invalid');
		await expect(backend.openWorld(input)).rejects.toThrow('unavailable');
	});
});

it.skipIf(!process.env.GYM_BASE_URL)('updates only the issue in this fixture world', async () => {
	const registry = new SimulationBackendRegistry();
	vi.stubEnv('N8N_SAFE_TESTING_BACKEND', '');
	registry.register(backend);
	expect(registry.get()).toBe(backend);
	vi.stubEnv('N8N_SAFE_TESTING_BACKEND', 'linear-gym');
	const selected = registry.get();
	expect(selected).toBeInstanceOf(LinearGymBackend);
	expect(selected).not.toBe(backend);
	if (!selected) throw Error('Missing fixture backend');
	const first = await selected.openWorld(input);
	const discovery = await first.handleRequest(
		{
			protocol: 'mcp',
			server: 'linear',
			method: 'POST',
			body: { jsonrpc: '2.0', id: 2, method: 'tools/list' },
		},
		{ toolName: 'linear' },
	);
	expect(discovery).toMatchObject({
		outcome: 'served',
		body: { result: { tools: [{ name: 'get_issue' }, { name: 'save_issue' }] } },
	});
	const call = async (
		world: SimulationWorld,
		name: string,
		args: Record<string, unknown>,
		server = 'linear',
	) =>
		await world.handleRequest(
			{
				protocol: 'mcp',
				server,
				method: 'POST',
				body: { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name, arguments: args } },
			},
			{ toolName: server },
		);
	const args = { id: 'FIN-412' };
	const before = await call(first, 'get_issue', args);
	expect(before).toMatchObject({ outcome: 'served', evidence: ['fixture_seed', 'gym_read'] });
	expect(JSON.stringify(before)).toContain('33333333-3333-4333-8333-333333333333');
	expect(await call(first, 'save_issue', { ...args, title: 'Updated locally' })).toMatchObject({
		outcome: 'served',
		evidence: ['fixture_seed', 'gym_only_write'],
	});
	expect(JSON.stringify(await call(first, 'get_issue', args))).toContain('Updated locally');
	for (const overrides of [{ testChatId: 'fresh' }, { ownerId: 'other' }, {}]) {
		const next = await backend.openWorld({ ...input, ...overrides });
		expect(next.worldId).not.toEqual(first.worldId);
		const result = await call(next, 'get_issue', args);
		expect(result.outcome).toBe('served');
		expect(JSON.stringify(result)).not.toContain('Updated locally');
		expect(JSON.stringify(result)).toContain('33333333-3333-4333-8333-333333333333');
	}
	for (const reply of [
		await call(first, 'delete_issue', args),
		await call(first, 'save_issue', { ...args, team: 'other' }),
		await call(first, 'get_issue', args, 'other'),
	])
		expect(reply.outcome).toBe('unsupported');
	const fetchSpy = vi.spyOn(globalThis, 'fetch');
	try {
		for (const failure of ['TimeoutError', 'Unavailable']) {
			fetchSpy.mockRejectedValueOnce(new Error(failure));
			expect(await call(first, 'save_issue', { ...args, title: 'Not applied' })).toEqual({
				outcome: 'unavailable',
			});
		}
		expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual(
			Array(2).fill(process.env.GYM_BASE_URL + '/mcp'),
		);
	} finally {
		fetchSpy.mockRestore();
	}
});
