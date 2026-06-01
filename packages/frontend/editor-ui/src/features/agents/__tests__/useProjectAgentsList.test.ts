/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

const listAgents = vi.fn();

vi.mock('../composables/useAgentApi', () => ({
	listAgents: (...args: unknown[]) => listAgents(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

import {
	useProjectAgentsList,
	__clearProjectAgentsListCacheForTests,
} from '../composables/useProjectAgentsList';

describe('useProjectAgentsList', () => {
	beforeEach(() => {
		__clearProjectAgentsListCacheForTests();
		listAgents.mockReset();
	});

	it('fetches on first call and caches on second', async () => {
		listAgents.mockResolvedValueOnce([{ id: 'a1', name: 'Agent One' }]);
		const { ensureLoaded } = useProjectAgentsList(ref('p1'));

		const a = await ensureLoaded();
		const b = await ensureLoaded();
		expect(a).toEqual(b);
		expect(listAgents).toHaveBeenCalledTimes(1);
	});

	it('dedupes simultaneous callers to a single Promise', async () => {
		let resolveIt!: (v: unknown) => void;
		listAgents.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveIt = resolve;
			}),
		);
		const { ensureLoaded } = useProjectAgentsList(ref('p1'));

		const p1 = ensureLoaded();
		const p2 = ensureLoaded();
		resolveIt([{ id: 'a1', name: 'Agent One' }]);
		await Promise.all([p1, p2]);
		expect(listAgents).toHaveBeenCalledTimes(1);
	});

	it('caches per project id', async () => {
		listAgents
			.mockResolvedValueOnce([{ id: 'a1', name: 'P1 agent' }])
			.mockResolvedValueOnce([{ id: 'a2', name: 'P2 agent' }]);

		const projectId = ref('p1');
		const { ensureLoaded } = useProjectAgentsList(projectId);
		await ensureLoaded();

		projectId.value = 'p2';
		await ensureLoaded();

		expect(listAgents).toHaveBeenCalledTimes(2);
		expect(listAgents.mock.calls[0][1]).toBe('p1');
		expect(listAgents.mock.calls[1][1]).toBe('p2');
	});

	it('clears in-flight promise and rethrows on error, so the next call retries', async () => {
		listAgents.mockRejectedValueOnce(new Error('boom'));
		const { ensureLoaded } = useProjectAgentsList(ref('p1'));
		await expect(ensureLoaded()).rejects.toThrow('boom');

		listAgents.mockResolvedValueOnce([{ id: 'a1', name: 'Agent One' }]);
		const next = await ensureLoaded();
		expect(next).toEqual([{ id: 'a1', name: 'Agent One' }]);
	});
});
