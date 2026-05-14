import { vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import type { ExecutionSummaryWithScopes } from './executions.types';
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

	describe('fetchSessionExecutions', () => {
		it('queries /executions with caller.sessionId metadata and sorts ascending by startedAt', async () => {
			const mockMakeRestApiRequest = vi.mocked(makeRestApiRequest);
			mockMakeRestApiRequest.mockResolvedValue({
				count: 4,
				estimated: false,
				results: [
					{
						id: '228',
						startedAt: new Date('2026-05-13T12:27:37Z'),
						createdAt: new Date('2026-05-13T12:27:37Z'),
						mode: 'single-node',
						status: 'success',
						workflowId: 'wf-228',
						scopes: [],
					},
					{
						id: '225',
						startedAt: new Date('2026-05-13T12:27:32Z'),
						createdAt: new Date('2026-05-13T12:27:32Z'),
						mode: 'single-node',
						status: 'success',
						workflowId: 'wf-225',
						scopes: [],
					},
					{
						id: '226',
						startedAt: new Date('2026-05-13T12:27:34Z'),
						createdAt: new Date('2026-05-13T12:27:34Z'),
						mode: 'single-node',
						status: 'success',
						workflowId: 'wf-226',
						scopes: [],
					},
					{
						id: '227',
						startedAt: new Date('2026-05-13T12:27:36Z'),
						createdAt: new Date('2026-05-13T12:27:36Z'),
						mode: 'single-node',
						status: 'success',
						workflowId: 'wf-227',
						scopes: [],
					},
				],
				concurrentExecutionsCount: 0,
			});

			const result = await executionsStore.fetchSessionExecutions('romeo-mcp-20260513-132732');

			expect(mockMakeRestApiRequest).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				'/executions',
				expect.objectContaining({
					filter: {
						metadata: [
							{
								key: 'caller.sessionId',
								value: 'romeo-mcp-20260513-132732',
								exactMatch: true,
							},
						],
					},
					limit: 100,
				}),
			);
			expect(result.map((r) => r.id)).toEqual(['225', '226', '227', '228']);
		});

		it('does not pollute the store with results', async () => {
			const mockMakeRestApiRequest = vi.mocked(makeRestApiRequest);
			mockMakeRestApiRequest.mockResolvedValue({
				count: 1,
				estimated: false,
				results: [
					{
						id: 'session-only',
						startedAt: new Date(),
						createdAt: new Date(),
						mode: 'single-node',
						status: 'success',
						workflowId: 'wf-session',
						scopes: [],
					},
				],
				concurrentExecutionsCount: 0,
			});

			await executionsStore.fetchSessionExecutions('session-xyz');

			expect(executionsStore.executions).toEqual([]);
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
