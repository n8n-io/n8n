import type { LlmUsageCallsResponse } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';

import { useLlmUsageStore } from './llm-usage.store';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

type ApiMock = (...args: unknown[]) => Promise<unknown>;
const fetchCallsMock = vi.fn<ApiMock>();
vi.mock('./llm-usage.api', () => ({
	fetchLlmUsageSummary: vi.fn(),
	fetchLlmUsageCalls: async (...args: unknown[]) => await fetchCallsMock(...args),
}));

const page = (count: number): LlmUsageCallsResponse => ({ count, items: [] });

describe('useLlmUsageStore', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('keeps the latest page when an older response arrives last', async () => {
		const store = useLlmUsageStore();
		let resolveOlder = (_value: LlmUsageCallsResponse) => {};
		fetchCallsMock
			.mockReturnValueOnce(new Promise((resolve) => (resolveOlder = resolve)))
			.mockResolvedValueOnce(page(2));

		const older = store.fetchCalls({ skip: 25 });
		await store.fetchCalls({ skip: 50 });
		resolveOlder(page(1));
		await older;

		expect(store.calls).toEqual(page(2));
		expect(store.callsLoading).toBe(false);
	});
});
