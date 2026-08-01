import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentEnsurePersisted } from './useAgentEnsurePersisted';
import type { AgentJsonConfig, AgentResource } from '../types';

const { createAgent } = vi.hoisted(() => ({ createAgent: vi.fn() }));

vi.mock('./useAgentApi', () => ({ createAgent }));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-ref' } }),
}));

const created = { id: 'minted-id', name: 'Triage Bot' } as AgentResource;

function setup(config: AgentJsonConfig | null = null) {
	const isPending = ref(true);
	const onCreated = vi.fn();
	const { ensurePersisted } = useAgentEnsurePersisted({
		projectId: () => 'project-1',
		agentId: () => 'minted-id',
		isPending,
		getConfig: () => config,
		getName: () => 'Triage Bot',
		onCreated,
	});
	return { ensurePersisted, isPending, onCreated };
}

describe('useAgentEnsurePersisted', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createAgent.mockResolvedValue(created);
	});

	it('creates the agent under the minted id, carrying the current config', async () => {
		const config = { name: 'Triage Bot', model: '', instructions: 'Triage tickets.' };
		const { ensurePersisted, isPending, onCreated } = setup(config as AgentJsonConfig);

		await ensurePersisted();

		expect(createAgent).toHaveBeenCalledWith(
			{ baseUrl: '/rest', pushRef: 'push-ref' },
			'project-1',
			'Triage Bot',
			{ id: 'minted-id', config },
		);
		expect(isPending.value).toBe(false);
		expect(onCreated).toHaveBeenCalledWith(created);
	});

	it('creates once for callers racing in the same tick', async () => {
		const { ensurePersisted } = setup();

		await Promise.all([ensurePersisted(), ensurePersisted(), ensurePersisted()]);

		expect(createAgent).toHaveBeenCalledTimes(1);
	});

	it('does nothing once the agent exists', async () => {
		const { ensurePersisted } = setup();

		await ensurePersisted();
		await ensurePersisted();

		expect(createAgent).toHaveBeenCalledTimes(1);
	});

	it('stays pending after a failure so the next write retries', async () => {
		createAgent.mockRejectedValue(new Error('boom'));
		const { ensurePersisted, isPending } = setup();

		await expect(ensurePersisted()).rejects.toThrow('boom');

		expect(isPending.value).toBe(true);

		createAgent.mockResolvedValue(created);
		await ensurePersisted();
		expect(isPending.value).toBe(false);
	});
});
