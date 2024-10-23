import { vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import type { ExecutionSummaryWithScopes } from '@/Interface';
import { useExecutionsStore } from '../executions.store';

vi.mock('@/utils/apiUtils', () => ({
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
				startedAt: new Date('2021-01-03T00:00:00Z'),
				workflowId: '1',
				scopes: [],
			},
			{
				id: '2',
				mode: 'manual',
				status: 'success',
				startedAt: new Date('2021-01-02T00:00:00Z'),
				workflowId: '1',
				scopes: [],
			},
			{
				id: '1',
				mode: 'manual',
				status: 'success',
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

		it('should delete executions from date (inclusive)', async () => {
			await executionsStore.deleteExecutions({ deleteBefore: mockExecutions[1].startedAt });

			expect(executionsStore.executions).toEqual([mockExecutions[0]]);
		});

		it('should delete all existing executions (we do it by getting the first execution`s "startedAt" prop)', async () => {
			await executionsStore.deleteExecutions({ deleteBefore: mockExecutions[0].startedAt });

			expect(executionsStore.executions).toEqual([]);
		});
	});
});
