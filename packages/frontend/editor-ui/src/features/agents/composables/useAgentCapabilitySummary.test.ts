import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import type { AgentCapabilitySummary } from '@n8n/api-types';
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

describe('useAgentCapabilitySummary', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearAgentCapabilitySummaryCache();
	});

	it('fetches and exposes the summary for a resolved project + agent', async () => {
		const summaryData = makeSummary();
		getAgentCapabilitySummary.mockResolvedValue(summaryData);

		const { summary, isLoading } = useAgentCapabilitySummary(ref('proj-1'), ref('agent-1'));
		await flushPromises();

		expect(getAgentCapabilitySummary).toHaveBeenCalledWith(expect.anything(), 'proj-1', 'agent-1');
		expect(summary.value).toEqual(summaryData);
		expect(isLoading.value).toBe(false);
	});

	it('does not fetch when the agent id is empty', async () => {
		const { summary } = useAgentCapabilitySummary(ref('proj-1'), ref(''));
		await flushPromises();

		expect(getAgentCapabilitySummary).not.toHaveBeenCalled();
		expect(summary.value).toBeNull();
	});

	it('does not fetch when the project scope is unresolved', async () => {
		const { summary } = useAgentCapabilitySummary(ref(''), ref('agent-1'));
		await flushPromises();

		expect(getAgentCapabilitySummary).not.toHaveBeenCalled();
		expect(summary.value).toBeNull();
	});

	it('re-fetches when the selected agent changes', async () => {
		getAgentCapabilitySummary
			.mockResolvedValueOnce(makeSummary({ id: 'agent-1', name: 'First' }))
			.mockResolvedValueOnce(makeSummary({ id: 'agent-2', name: 'Second' }));

		const agentId = ref('agent-1');
		const { summary } = useAgentCapabilitySummary(ref('proj-1'), agentId);
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
		const { summary } = useAgentCapabilitySummary(ref('proj-1'), agentId);

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

		const first = useAgentCapabilitySummary(ref('proj-1'), ref('agent-1'));
		await flushPromises();
		expect(getAgentCapabilitySummary).toHaveBeenCalledTimes(1);

		const second = useAgentCapabilitySummary(ref('proj-1'), ref('agent-1'));
		await flushPromises();
		expect(getAgentCapabilitySummary).toHaveBeenCalledTimes(1);
		expect(second.summary.value).toEqual(first.summary.value);
		expect(second.isLoading.value).toBe(false);
	});

	it('surfaces the error and clears the summary on failure', async () => {
		const failure = new Error('boom');
		getAgentCapabilitySummary.mockRejectedValue(failure);

		const { summary, error, isLoading } = useAgentCapabilitySummary(ref('proj-1'), ref('agent-1'));
		await flushPromises();

		expect(error.value).toBe(failure);
		expect(summary.value).toBeNull();
		expect(isLoading.value).toBe(false);
	});
});
