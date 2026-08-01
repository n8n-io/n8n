import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResponseError } from '@n8n/rest-api-client';

import { useAgentEnsurePersisted } from './useAgentEnsurePersisted';
import type { AgentJsonConfig, AgentResource } from '../types';

const { createAgent } = vi.hoisted(() => ({ createAgent: vi.fn() }));

vi.mock('./useAgentApi', () => ({ createAgent }));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-ref' } }),
}));

const created = { id: 'minted-id', name: 'Triage Bot' } as AgentResource;

function setup(
	config: AgentJsonConfig | null = null,
	options: {
		onConflict?: () => void | Promise<void>;
		isStale?: (projectId: string, agentId: string) => boolean;
	} = {},
) {
	const isPending = ref(true);
	const onCreated = vi.fn();
	const onConflict = options.onConflict ?? vi.fn();
	const isStale = options.isStale ?? (() => false);
	const { ensurePersisted } = useAgentEnsurePersisted({
		projectId: () => 'project-1',
		agentId: () => 'minted-id',
		isPending,
		getConfig: () => config,
		getName: () => 'Triage Bot',
		onCreated,
		onConflict,
		isStale,
	});
	return { ensurePersisted, isPending, onCreated, onConflict };
}

describe('useAgentEnsurePersisted', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createAgent.mockResolvedValue(created);
	});

	it('creates the agent under the minted id, carrying the current config', async () => {
		const config = { name: 'Triage Bot', model: '', instructions: 'Triage tickets.' };
		const { ensurePersisted, isPending, onCreated } = setup(config as AgentJsonConfig);

		await expect(ensurePersisted()).resolves.toBe('created');

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

	it('returns created only for the caller that performed the create', async () => {
		const { ensurePersisted } = setup();

		const results = await Promise.all([ensurePersisted(), ensurePersisted(), ensurePersisted()]);

		expect(results.filter((r) => r === 'created')).toHaveLength(1);
		expect(results.filter((r) => r === 'already-persisted')).toHaveLength(2);

		// Already persisted after the race above — subsequent calls must report that.
		expect(await ensurePersisted()).toBe('already-persisted');
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
		await expect(ensurePersisted()).resolves.toBe('created');
		expect(isPending.value).toBe(false);
	});

	it('treats a 409 as a conflict so later writes discard the stale draft snapshot', async () => {
		createAgent.mockRejectedValue(new ResponseError('exists', { httpStatusCode: 409 }));
		const { ensurePersisted, isPending, onCreated, onConflict } = setup();

		await expect(ensurePersisted()).resolves.toBe('conflict');

		expect(isPending.value).toBe(false);
		expect(onCreated).not.toHaveBeenCalled();
		expect(onConflict).toHaveBeenCalledTimes(1);
	});

	it('propagates conflict to waiters sharing the in-flight create', async () => {
		createAgent.mockRejectedValue(new ResponseError('exists', { httpStatusCode: 409 }));
		const { ensurePersisted, onConflict } = setup();

		const results = await Promise.all([ensurePersisted(), ensurePersisted(), ensurePersisted()]);

		expect(results.every((r) => r === 'conflict')).toBe(true);
		expect(onConflict).toHaveBeenCalledTimes(1);
	});

	it('does not apply create results when the target became stale while in flight', async () => {
		let resolveCreate!: (value: AgentResource) => void;
		createAgent.mockReturnValue(
			new Promise<AgentResource>((resolve) => {
				resolveCreate = resolve;
			}),
		);
		const { ensurePersisted, isPending, onCreated } = setup(null, {
			isStale: () => true,
		});

		const pending = ensurePersisted();
		resolveCreate(created);
		await expect(pending).resolves.toBe('created');

		expect(isPending.value).toBe(true);
		expect(onCreated).not.toHaveBeenCalled();
	});
});
