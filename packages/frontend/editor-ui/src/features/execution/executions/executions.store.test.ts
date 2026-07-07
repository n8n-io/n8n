import { vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import type { ExecutionSummaryWithScopes } from './executions.types';
import { useExecutionsStore } from './executions.store';
import { makeRestApiRequest } from '@n8n/rest-api-client';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

// The projects store (used by executionsFilters) reads the current route.
vi.mock('vue-router', () => ({
	useRoute: vi.fn().mockReturnValue({ params: {}, query: {} }),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

describe('executions.store', () => {
	let executionsStore: ReturnType<typeof useExecutionsStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		executionsStore = useExecutionsStore();
	});

	describe('deleteExecutions', () => {
		const mockExecutions: ExecutionSummaryWithScopes[] = [
			{
				id: '3',
				mode: 'manual',
				status: 'success',
				createdAt: new Date('2021-01-01T00:00:00Z'),
				startedAt: new Date('2021-01-03T00:00:00Z'),
				workflowId: '1',
				scopes: [],
			},
			{
				id: '2',
				mode: 'manual',
				status: 'success',
				createdAt: new Date('2021-01-02T00:00:00Z'),
				startedAt: new Date('2021-01-02T00:00:00Z'),
				workflowId: '1',
				scopes: [],
			},
			{
				id: '1',
				mode: 'manual',
				status: 'success',
				createdAt: new Date('2021-01-03T00:00:00Z'),
				startedAt: new Date('2021-01-01T00:00:00Z'),
				workflowId: '1',
				scopes: [],
			},
		];

		beforeEach(() => {
			mockExecutions.forEach(executionsStore.addExecution);
		});

		it('should delete executions by ID', async () => {
			await executionsStore.deleteExecutions({ ids: ['1', '3'] });

			expect(executionsStore.executions).toEqual([mockExecutions[1]]);
		});

		it('should delete executions started before given date', async () => {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const deleteBefore = mockExecutions[1].startedAt!;
			await executionsStore.deleteExecutions({ deleteBefore });

			expect(executionsStore.executions.length).toBe(2);
			executionsStore.executions.forEach(({ startedAt }) =>
				expect(startedAt?.getTime()).toBeGreaterThanOrEqual(deleteBefore.getTime()),
			);
		});

		it('should delete all executions if given date is now', async () => {
			await executionsStore.deleteExecutions({ deleteBefore: new Date() });

			expect(executionsStore.executions).toEqual([]);
		});
	});

	describe('refreshExecutionsListNow', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.mocked(makeRestApiRequest).mockClear();
			vi.mocked(makeRestApiRequest).mockResolvedValue({
				count: 0,
				results: [],
				estimated: false,
				concurrentExecutionsCount: 0,
			});
		});

		afterEach(() => {
			executionsStore.stopAutoRefreshInterval();
			vi.useRealTimers();
			vi.mocked(makeRestApiRequest).mockReset();
		});

		it('is a no-op when no poller is armed', async () => {
			await executionsStore.refreshExecutionsListNow('wf-1');

			expect(makeRestApiRequest).not.toHaveBeenCalled();
		});

		it('is a no-op when auto-refresh is disabled', async () => {
			await executionsStore.startAutoRefreshInterval();
			executionsStore.autoRefresh = false;

			await executionsStore.refreshExecutionsListNow('wf-1');

			expect(makeRestApiRequest).not.toHaveBeenCalled();
		});

		it('fetches immediately when a global poller is armed, without the trigger workflow filter', async () => {
			await executionsStore.startAutoRefreshInterval();

			await executionsStore.refreshExecutionsListNow('wf-1');

			expect(makeRestApiRequest).toHaveBeenCalledTimes(1);
			const params = vi.mocked(makeRestApiRequest).mock.calls[0][3] as {
				filter?: { workflowId?: string };
			};
			expect(params.filter?.workflowId).toBeUndefined();
		});

		it('uses the poller workflow scope and ignores events for other workflows', async () => {
			await executionsStore.startAutoRefreshInterval('wf-1');

			await executionsStore.refreshExecutionsListNow('wf-2');
			expect(makeRestApiRequest).not.toHaveBeenCalled();

			await executionsStore.refreshExecutionsListNow('wf-1');
			expect(makeRestApiRequest).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				'/executions',
				expect.objectContaining({ filter: expect.objectContaining({ workflowId: 'wf-1' }) }),
			);
		});
	});

	it('should sort execution by createdAt', () => {
		const mockExecutions: ExecutionSummaryWithScopes[] = [
			{
				id: '1',
				mode: 'manual',
				status: 'success',
				createdAt: new Date('2021-01-01T00:00:00Z'),
				startedAt: new Date('2021-02-03T00:00:00Z'),
				workflowId: '1',
				scopes: [],
			},
			{
				id: '2',
				mode: 'manual',
				status: 'success',
				createdAt: new Date('2021-01-02T00:00:00Z'),
				startedAt: new Date('2021-02-02T00:00:00Z'),
				workflowId: '1',
				scopes: [],
			},
			{
				id: '3',
				mode: 'manual',
				status: 'success',
				createdAt: new Date('2021-01-03T00:00:00Z'),
				startedAt: new Date('2021-02-01T00:00:00Z'),
				workflowId: '1',
				scopes: [],
			},
		];

		mockExecutions.forEach(executionsStore.addExecution);

		expect(executionsStore.executions.at(-1)).toEqual(expect.objectContaining({ id: '1' }));
	});
});
