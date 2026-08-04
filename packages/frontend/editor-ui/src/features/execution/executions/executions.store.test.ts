import { vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import type { ExecutionSummaryWithScopes, IExecutionsListResponse } from './executions.types';
import { useExecutionsStore } from './executions.store';
import { makeRestApiRequest } from '@n8n/rest-api-client';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
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

	describe('pagination', () => {
		// count is far larger than a page so the tests fail if loading more is ever
		// driven by the total count again instead of page fullness.
		const page = (n: number): IExecutionsListResponse => ({
			count: 100_000,
			estimated: true,
			concurrentExecutionsCount: 0,
			results: Array.from(
				{ length: n },
				(_, i) => ({ id: `${i}`, scopes: [] }) as unknown as ExecutionSummaryWithScopes,
			),
		});

		const mockResponse = (n: number) =>
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(page(n));

		it('should allow loading more when the first page is full', async () => {
			mockResponse(10);
			await executionsStore.fetchExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(true);
		});

		it('should not allow loading more when the first page is partial', async () => {
			mockResponse(3);
			await executionsStore.fetchExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(false);
		});

		it('should stop allowing more once a paginated page comes back partial', async () => {
			mockResponse(10);
			await executionsStore.fetchExecutions({}, 'last-1');
			expect(executionsStore.hasMoreExecutions).toBe(true);

			mockResponse(4);
			await executionsStore.fetchExecutions({}, 'last-2');
			expect(executionsStore.hasMoreExecutions).toBe(false);
		});

		it('should not re-allow loading more when auto-refresh reloads a full first page', async () => {
			// Exhausted the list via pagination.
			mockResponse(2);
			await executionsStore.fetchExecutions({}, 'last');
			expect(executionsStore.hasMoreExecutions).toBe(false);

			// Auto-refresh re-fetches a full first page (no lastId) — must stay false.
			mockResponse(10);
			await executionsStore.fetchExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(false);
		});

		it('should allow loading more again after reset', async () => {
			mockResponse(3);
			await executionsStore.fetchExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(false);

			executionsStore.resetData();
			expect(executionsStore.hasMoreExecutions).toBe(true);
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
