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
	const makeRestApiRequestMock = vi.mocked(makeRestApiRequest);

	beforeEach(() => {
		setActivePinia(createPinia());
		executionsStore = useExecutionsStore();
		makeRestApiRequestMock.mockReset();
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

	describe('execution metadata updates', () => {
		const execution = {
			id: 'note-test',
			mode: 'manual',
			status: 'success',
			createdAt: new Date(),
			startedAt: new Date(),
			workflowId: 'wf',
			scopes: [],
		} as ExecutionSummaryWithScopes;

		beforeEach(() => {
			executionsStore.addExecution(execution);
			executionsStore.activeExecution = execution;
		});

		it('updates note metadata', async () => {
			makeRestApiRequestMock.mockResolvedValueOnce({
				note: 'Investigate payload',
				noteUpdatedAt: '2025-01-01T00:00:00.000Z',
				noteUpdatedBy: 'user-1',
			});

			await executionsStore.updateExecutionNote(execution.id, 'Investigate payload');

			expect(makeRestApiRequestMock).toHaveBeenCalledWith(
				expect.anything(),
				'PATCH',
				`/executions/${execution.id}/note`,
				{ note: 'Investigate payload' },
			);
			expect(executionsStore.executionsById[execution.id].note).toBe('Investigate payload');
			expect(executionsStore.activeExecution?.note).toBe('Investigate payload');
		});

		it('updates pin metadata', async () => {
			makeRestApiRequestMock.mockResolvedValueOnce({
				pinned: true,
				pinnedAt: '2025-01-02T00:00:00.000Z',
				pinnedBy: 'user-1',
			});

			await executionsStore.updateExecutionPin(execution.id, true);

			expect(makeRestApiRequestMock).toHaveBeenCalledWith(
				expect.anything(),
				'PATCH',
				`/executions/${execution.id}/pin`,
				{ pinned: true },
			);
			expect(executionsStore.executionsById[execution.id].pinned).toBe(true);
			expect(executionsStore.activeExecution?.pinned).toBe(true);
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
