import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { effectScope, ref, type EffectScope, type Ref } from 'vue';
import type { AgentCapabilitySummary } from '@n8n/api-types';
import { agentsEventBus } from '../agents.eventBus';
import {
	useAgentCapabilitySummary,
	clearAgentCapabilitySummaryCache,
} from './useAgentCapabilitySummary';

const { getAgentCapabilitySummary } = vi.hoisted(() => ({
	getAgentCapabilitySummary: vi.fn(),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	getAgentCapabilitySummary,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

const flushPromises = async () => await new Promise(setImmediate);

function makeSummary(overrides: Partial<AgentCapabilitySummary> = {}): AgentCapabilitySummary {
	return {
		id: 'agent-1',
		name: 'Test Agent',
		model: { provider: 'anthropic', model: 'claude-opus-4-8' },
		channels: [],
		tools: [],
		skills: [],
		tasks: [],
		...overrides,
	};
}

// Instances are created inside effect scopes and stopped after each test: the
// composable's watcher also reacts to module-level cache invalidations
// (`agentUpdated` events), so a watcher leaked from an earlier test would
// re-fetch when a later test emits.
let scopes: EffectScope[] = [];

function makeInstance(projectId: Ref<string>, agentId: Ref<string>) {
	const scope = effectScope();
	scopes.push(scope);
	const instance = scope.run(() => useAgentCapabilitySummary(projectId, agentId));
	if (!instance) throw new Error('effect scope failed to run');
	return instance;
}

describe('useAgentCapabilitySummary', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearAgentCapabilitySummaryCache();
	});

	afterEach(() => {
		scopes.forEach((scope) => scope.stop());
		scopes = [];
	});

	it('fetches and exposes the summary for a resolved project + agent', async () => {
		const summaryData = makeSummary();
		getAgentCapabilitySummary.mockResolvedValue(summaryData);

		const { summary, isLoading } = makeInstance(ref('proj-1'), ref('agent-1'));
		await flushPromises();

		expect(getAgentCapabilitySummary).toHaveBeenCalledWith(expect.anything(), 'proj-1', 'agent-1');
		expect(summary.value).toEqual(summaryData);
		expect(isLoading.value).toBe(false);
	});

	it('does not fetch when the agent id is empty', async () => {
		const { summary } = makeInstance(ref('proj-1'), ref(''));
		await flushPromises();

		expect(getAgentCapabilitySummary).not.toHaveBeenCalled();
		expect(summary.value).toBeNull();
	});

	it('does not fetch when the project scope is unresolved', async () => {
		const { summary } = makeInstance(ref(''), ref('agent-1'));
		await flushPromises();

		expect(getAgentCapabilitySummary).not.toHaveBeenCalled();
		expect(summary.value).toBeNull();
	});

	it('re-fetches when the selected agent changes', async () => {
		getAgentCapabilitySummary
			.mockResolvedValueOnce(makeSummary({ id: 'agent-1', name: 'First' }))
			.mockResolvedValueOnce(makeSummary({ id: 'agent-2', name: 'Second' }));

		const agentId = ref('agent-1');
		const { summary } = makeInstance(ref('proj-1'), agentId);
		await flushPromises();
		expect(summary.value?.name).toBe('First');

		agentId.value = 'agent-2';
		await flushPromises();
		expect(summary.value?.name).toBe('Second');
		expect(getAgentCapabilitySummary).toHaveBeenCalledTimes(2);
	});

	it('a superseded request cannot clobber a newer result', async () => {
		let resolveFirst!: (value: AgentCapabilitySummary) => void;
		const firstPromise = new Promise<AgentCapabilitySummary>((resolve) => {
			resolveFirst = resolve;
		});
		getAgentCapabilitySummary
			.mockReturnValueOnce(firstPromise)
			.mockResolvedValueOnce(makeSummary({ id: 'agent-2', name: 'Second' }));

		const agentId = ref('agent-1');
		const { summary } = makeInstance(ref('proj-1'), agentId);

		// Switch agents before the first request resolves.
		agentId.value = 'agent-2';
		await flushPromises();
		expect(summary.value?.name).toBe('Second');

		// The stale first request resolves late and must be ignored.
		resolveFirst(makeSummary({ id: 'agent-1', name: 'First' }));
		await flushPromises();
		expect(summary.value?.name).toBe('Second');
	});

	it('serves a cached summary without hitting the API again', async () => {
		getAgentCapabilitySummary.mockResolvedValue(makeSummary());

		const first = makeInstance(ref('proj-1'), ref('agent-1'));
		await flushPromises();
		expect(getAgentCapabilitySummary).toHaveBeenCalledTimes(1);

		const second = makeInstance(ref('proj-1'), ref('agent-1'));
		await flushPromises();
		expect(getAgentCapabilitySummary).toHaveBeenCalledTimes(1);
		expect(second.summary.value).toEqual(first.summary.value);
		expect(second.isLoading.value).toBe(false);
	});

	it('surfaces the error and clears the summary on failure', async () => {
		const failure = new Error('boom');
		getAgentCapabilitySummary.mockRejectedValue(failure);

		const { summary, error, isLoading } = makeInstance(ref('proj-1'), ref('agent-1'));
		await flushPromises();

		expect(error.value).toBe(failure);
		expect(summary.value).toBeNull();
		expect(isLoading.value).toBe(false);
	});

	it('invalidates and re-fetches after an agentUpdated event for the same agent', async () => {
		getAgentCapabilitySummary.mockResolvedValueOnce(makeSummary({ name: 'Before' }));

		const { summary } = makeInstance(ref('proj-1'), ref('agent-1'));
		await flushPromises();
		expect(summary.value?.name).toBe('Before');

		getAgentCapabilitySummary.mockResolvedValueOnce(makeSummary({ name: 'After' }));
		agentsEventBus.emit('agentUpdated', { agentId: 'agent-1', source: 'test' });
		await flushPromises();

		expect(getAgentCapabilitySummary).toHaveBeenCalledTimes(2);
		expect(summary.value?.name).toBe('After');
	});

	it('keeps other agents cached when a targeted agentUpdated event fires', async () => {
		getAgentCapabilitySummary
			.mockResolvedValueOnce(makeSummary({ id: 'agent-1', name: 'One' }))
			.mockResolvedValueOnce(makeSummary({ id: 'agent-2', name: 'Two' }))
			.mockResolvedValueOnce(makeSummary({ id: 'agent-1', name: 'One v2' }));

		const one = makeInstance(ref('proj-1'), ref('agent-1'));
		await flushPromises();
		const two = makeInstance(ref('proj-1'), ref('agent-2'));
		await flushPromises();
		expect(getAgentCapabilitySummary).toHaveBeenCalledTimes(2);

		agentsEventBus.emit('agentUpdated', { agentId: 'agent-1', source: 'test' });
		await flushPromises();

		// agent-1 re-fetched; agent-2 served from the still-valid cache.
		expect(getAgentCapabilitySummary).toHaveBeenCalledTimes(3);
		expect(one.summary.value?.name).toBe('One v2');
		expect(two.summary.value?.name).toBe('Two');
	});

	it('clears the whole cache on an untargeted agentUpdated event', async () => {
		getAgentCapabilitySummary.mockResolvedValue(makeSummary());

		makeInstance(ref('proj-1'), ref('agent-1'));
		await flushPromises();
		makeInstance(ref('proj-1'), ref('agent-2'));
		await flushPromises();
		expect(getAgentCapabilitySummary).toHaveBeenCalledTimes(2);

		agentsEventBus.emit('agentUpdated');
		await flushPromises();

		expect(getAgentCapabilitySummary).toHaveBeenCalledTimes(4);
	});
});
