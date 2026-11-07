import { createPinia, setActivePinia } from 'pinia';

import { useAgentListStore } from '../agentList.store';
import { listAgentsPageGlobal } from '../composables/useAgentApi';

vi.mock('../composables/useAgentApi', () => ({ listAgentsPageGlobal: vi.fn() }));

describe('agentList.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(listAgentsPageGlobal).mockReset();
	});

	it('keeps the count unknown until the request completes', async () => {
		const store = useAgentListStore();
		expect(store.totalCount).toBeUndefined();
		vi.mocked(listAgentsPageGlobal).mockResolvedValueOnce({ count: 2, data: [] });

		await store.fetchTotalCount();

		expect(store.totalCount).toBe(2);
		expect(listAgentsPageGlobal).toHaveBeenCalledWith(expect.anything(), { take: 1 });
	});

	it('refreshes the count when the last agent is removed', async () => {
		const store = useAgentListStore();
		store.totalCount = 1;
		vi.mocked(listAgentsPageGlobal).mockResolvedValueOnce({ count: 0, data: [] });

		await store.fetchTotalCount();

		expect(store.totalCount).toBe(0);
	});

	it('keeps the count unknown when the request fails', async () => {
		const store = useAgentListStore();
		const error = new Error('Request failed');
		vi.mocked(listAgentsPageGlobal).mockRejectedValueOnce(error);

		await expect(store.fetchTotalCount()).rejects.toThrow(error);
		expect(store.totalCount).toBeUndefined();
	});
});
