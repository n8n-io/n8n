import { vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import type { SerializedCursor } from '@n8n/api-types';
import type { ExecutionSummaryWithScopes, IExecutionsListResponse } from './executions.types';
import { useExecutionsStore } from './executions.store';
import { makeRestApiRequest } from '@n8n/rest-api-client';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

// Test-only cursors are plain strings; the brand is only meaningful in app code.
const cursor = (value: string) => value as SerializedCursor;

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
			nextCursor: n === 10 ? cursor('next-page') : null,
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
			await executionsStore.fetchExecutions({}, cursor('last-1'));
			expect(executionsStore.hasMoreExecutions).toBe(true);

			mockResponse(4);
			await executionsStore.fetchExecutions({}, cursor('last-2'));
			expect(executionsStore.hasMoreExecutions).toBe(false);
		});

		it('should not re-allow loading more when auto-refresh reloads a full first page', async () => {
			mockResponse(10);
			await executionsStore.fetchExecutions({});
			// Exhausted the list via pagination.
			mockResponse(2);
			await executionsStore.fetchExecutions({}, cursor('last'));
			expect(executionsStore.hasMoreExecutions).toBe(false);

			// Auto-refresh re-fetches a full first page (no lastId) — must stay false.
			mockResponse(10);
			await executionsStore.fetchExecutions({}, undefined, true);
			expect(executionsStore.hasMoreExecutions).toBe(false);
		});

		it('should allow loading more again after reset', async () => {
			mockResponse(3);
			await executionsStore.fetchExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(false);

			executionsStore.resetData();
			expect(executionsStore.hasMoreExecutions).toBe(true);
		});

		it('uses the server continuation even when current rows fill the response', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ ...page(10), nextCursor: null });
			await executionsStore.fetchExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(false);
		});

		it('preserves the oldest continuation during a poll', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				nextCursor: cursor('second'),
			});
			await executionsStore.fetchExecutions({});
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				nextCursor: cursor('third'),
			});
			await executionsStore.fetchExecutions({}, executionsStore.nextCursor!);
			expect(makeRestApiRequest).toHaveBeenLastCalledWith(
				expect.anything(),
				'GET',
				'/executions',
				expect.objectContaining({ cursor: 'second' }),
			);
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				nextCursor: cursor('new-first'),
			});
			await executionsStore.fetchExecutions({}, undefined, true);
			expect(executionsStore.nextCursor).toBe('third');
		});

		it('resets the continuation and rows when the workflow filter changes', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(2),
				nextCursor: cursor('older'),
			});
			await executionsStore.fetchExecutions({ workflowId: 'one' });
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(page(0));
			await executionsStore.fetchExecutions({ workflowId: 'two' }, cursor('older'));
			expect(executionsStore.nextCursor).toBeNull();
			expect(executionsStore.executions).toEqual([]);
			expect(makeRestApiRequest).toHaveBeenLastCalledWith(
				expect.anything(),
				'GET',
				'/executions',
				expect.not.objectContaining({ cursor: expect.anything() }),
			);
		});

		it('moves an execution from the current list to the completed list', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				results: [{ ...page(1).results[0], status: 'running' }],
			});
			await executionsStore.fetchExecutions({});
			expect(executionsStore.currentExecutions).toHaveLength(1);
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				results: [{ ...page(1).results[0], status: 'success' }],
			});
			await executionsStore.fetchExecutions({}, undefined, true);
			expect(executionsStore.currentExecutions).toHaveLength(0);
			expect(executionsStore.executions).toHaveLength(1);
		});
	});

	it('should sort executions by start time', () => {
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

		expect(executionsStore.executions.at(-1)).toEqual(expect.objectContaining({ id: '3' }));
	});
});
