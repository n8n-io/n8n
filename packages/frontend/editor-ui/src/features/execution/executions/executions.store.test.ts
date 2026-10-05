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
		// Queued `mockResolvedValueOnce` responses outlive a test otherwise, and a
		// test that consumes fewer than it queued then breaks the next one.
		vi.mocked(makeRestApiRequest).mockReset();
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
			await executionsStore.fetchExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(true);

			mockResponse(10);
			await executionsStore.loadMoreExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(true);

			mockResponse(4);
			await executionsStore.loadMoreExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(false);
		});

		it('should not request a page once the list has ended', async () => {
			mockResponse(3);
			await executionsStore.fetchExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(false);

			vi.mocked(makeRestApiRequest).mockClear();
			await executionsStore.loadMoreExecutions({});

			expect(makeRestApiRequest).not.toHaveBeenCalled();
		});

		it('should not re-allow loading more when auto-refresh reloads a full first page', async () => {
			mockResponse(10);
			await executionsStore.fetchExecutions({});
			// Exhausted the list via pagination.
			mockResponse(2);
			await executionsStore.loadMoreExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(false);

			// Auto-refresh reloads a full first page — must stay false.
			mockResponse(10);
			await executionsStore.refreshExecutions({});
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

		it('pages from the continuation the server gave, and a poll keeps the deepest one', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				nextCursor: cursor('second'),
			});
			await executionsStore.fetchExecutions({});
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				nextCursor: cursor('third'),
			});
			await executionsStore.loadMoreExecutions({});
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
			await executionsStore.refreshExecutions({});
			expect(executionsStore.nextCursor).toBe('third');
		});

		it('resets the continuation and rows when the workflow filter changes', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(2),
				nextCursor: cursor('older'),
			});
			await executionsStore.fetchExecutions({ workflowId: 'one' });
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(page(0));
			await executionsStore.loadMoreExecutions({ workflowId: 'two' });
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
			await executionsStore.refreshExecutions({});
			expect(executionsStore.currentExecutions).toHaveLength(0);
			expect(executionsStore.executions).toHaveLength(1);
		});

		it('keeps the running executions when a page is appended below them', async () => {
			// The first page carries the current set; a cursor page carries completed
			// rows alone, so appending one must not empty the running list.
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				nextCursor: cursor('older'),
				results: [{ ...page(1).results[0], id: 'running-1', status: 'running' }],
			});
			await executionsStore.fetchExecutions({});
			expect(executionsStore.currentExecutions).toHaveLength(1);

			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				results: [{ ...page(1).results[0], id: 'done-1', status: 'success' }],
			});
			await executionsStore.loadMoreExecutions({});

			expect(executionsStore.currentExecutions).toHaveLength(1);
			expect(executionsStore.executions).toHaveLength(1);
		});

		it('keeps the first page count when a page is appended', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				count: 7,
				nextCursor: cursor('older'),
			});
			await executionsStore.fetchExecutions({});
			expect(executionsStore.executionsCount).toBe(7);

			// A cursor page counts every status, so its total means something else.
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({ ...page(1), count: 99 });
			await executionsStore.loadMoreExecutions({});

			expect(executionsStore.executionsCount).toBe(7);
		});

		it('leaves the loaded list alone when fetching a page on its own', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(2),
				nextCursor: cursor('older'),
			});
			await executionsStore.fetchExecutions({});

			mockResponse(5);
			const data = await executionsStore.fetchExecutionsPage({ status: ['success'] });

			expect(data.results).toHaveLength(5);
			expect(executionsStore.executions).toHaveLength(2);
			expect(executionsStore.nextCursor).toBe('older');
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
