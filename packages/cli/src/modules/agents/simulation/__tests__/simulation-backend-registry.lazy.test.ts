import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';

import { SimulationBackendRegistry } from '../simulation-backend-registry';
// The session service is the only reader of the registry. Its import graph is part of the proof.
import '../simulation-session.service';
import type { SimulatedAgent, SimulationBackend } from '../tool-simulation.contracts';

// Each factory runs when its module is first loaded, by a static or a dynamic import.
const loaded = vi.hoisted(() => [] as string[]);
vi.mock('../linear-gym-backend', async (importActual) => {
	loaded.push('linear-gym-backend');
	return await importActual();
});
vi.mock('../../../mcp-guard/router', async (importActual) => {
	loaded.push('mcp-guard/router');
	return await importActual();
});
vi.mock('../../../mcp-guard/plan-hydrator', async (importActual) => {
	loaded.push('mcp-guard/plan-hydrator');
	return await importActual();
});

mockInstance(Logger);

const agent: SimulatedAgent = {
	agentId: 'agent',
	projectId: 'project',
	name: 'agent',
	instructions: '',
	tools: [{ kind: 'mcp', toolName: 'linear', origin: 'https://other.example' }],
};
const world = { worldId: 'world', backend: 'llm-mock' as const, handleRequest: vi.fn() };
const registered: SimulationBackend = {
	id: 'llm-mock',
	describeTools: vi.fn(async () => []),
	openWorld: vi.fn(async () => world),
};
const input = { ownerId: 'owner', testChatId: 'chat', firstMessage: '', agent };

afterEach(() => vi.unstubAllEnvs());

// The cases share one module registry, so they run in this order.
describe('SimulationBackendRegistry lazy Linear backend', () => {
	it.each([undefined, '', 'other', 'LINEAR-GYM'])(
		'does not load the Linear backend or the MCP guard when the opt-in is %j',
		async (value) => {
			if (value !== undefined) vi.stubEnv('N8N_SAFE_TESTING_BACKEND', value);
			else delete process.env.N8N_SAFE_TESTING_BACKEND;
			const registry = new SimulationBackendRegistry();
			expect(registry.get()).toBeUndefined();
			registry.register(registered);
			const backend = registry.get();
			expect(backend).toBe(registered);
			await backend?.describeTools(agent);
			expect(await backend?.openWorld(input)).toBe(world);
			expect(loaded).toEqual([]);
		},
	);

	it('loads the Linear backend on the first call of the selected backend, not on selection', async () => {
		vi.stubEnv('N8N_SAFE_TESTING_BACKEND', 'linear-gym');
		const registry = new SimulationBackendRegistry();
		registry.register(registered);
		const backend = registry.get();
		expect(backend).not.toBe(registered);
		expect(backend?.id).toBe('shared-simulation-layer');
		expect(backend?.worldDependsOnDraftConnections).toBe(true);
		expect(loaded).toEqual([]);

		// No Gym address is set, so the loaded backend refuses without a request.
		await expect(backend?.openWorld(input)).rejects.toThrow('unavailable');
		expect(loaded).toContain('linear-gym-backend');
		expect(loaded).toContain('mcp-guard/router');
		expect(loaded).toContain('mcp-guard/plan-hydrator');
		expect(registered.openWorld).not.toHaveBeenCalled();

		const { LinearGymBackend } = await import('../linear-gym-backend.js');
		const real = new LinearGymBackend();
		expect(backend?.id).toBe(real.id);
		expect(backend?.worldDependsOnDraftConnections).toBe(real.worldDependsOnDraftConnections);
	});
});
