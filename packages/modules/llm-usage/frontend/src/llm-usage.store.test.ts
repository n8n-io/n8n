import type { LlmUsageCallsResponse, LlmUsageSummaryResponse } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';

import { useLlmUsageStore } from './llm-usage.store';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

type ApiMock = (...args: unknown[]) => Promise<unknown>;
const fetchSummaryMock = vi.fn<ApiMock>();
const fetchCallsMock = vi.fn<ApiMock>();
vi.mock('./llm-usage.api', () => ({
	fetchLlmUsageSummary: async (...args: unknown[]) => await fetchSummaryMock(...args),
	fetchLlmUsageCalls: async (...args: unknown[]) => await fetchCallsMock(...args),
}));

const page = (count: number): LlmUsageCallsResponse => ({ count, items: [] });
const summary = { totals: { calls: 1 } } as LlmUsageSummaryResponse;

describe('useLlmUsageStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		fetchSummaryMock.mockReset();
		fetchCallsMock.mockReset();
	});

	it('keeps the range and its data when the summary of a new range fails', async () => {
		const store = useLlmUsageStore();
		fetchSummaryMock.mockRejectedValueOnce(new Error('down'));
		fetchCallsMock.mockResolvedValueOnce(page(7));

		await expect(store.fetchAll(7)).rejects.toThrow('down');

		expect(store.days).toBe(30);
		expect(store.calls).toEqual(page(0));
	});

	it('shows the summary when only the calls page fails', async () => {
		const store = useLlmUsageStore();
		fetchSummaryMock.mockResolvedValueOnce(summary);
		fetchCallsMock.mockRejectedValueOnce(new Error('down'));

		await expect(store.fetchAll(7)).rejects.toThrow('down');

		expect(store.days).toBe(7);
		expect(store.summary).toEqual(summary);
		expect(store.calls).toEqual(page(0));
	});

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
