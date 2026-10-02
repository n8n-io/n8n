import type { SchedulerConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { WorkflowStatisticsRollupService } from '../workflow-statistics-rollup.service';
import { WorkflowStatisticsRollupTask } from '../workflow-statistics-rollup.task';

describe('WorkflowStatisticsRollupTask', () => {
	const rollupService = mock<WorkflowStatisticsRollupService>();
	const makeTask = (config: Partial<SchedulerConfig> = {}) =>
		new WorkflowStatisticsRollupTask(
			rollupService,
			mock<SchedulerConfig>({ leaseDurationSeconds: 60, ...config }),
		);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should declare a fixed 5 second cadence on the leader', () => {
		const task = makeTask();

		expect(task.name).toBe('workflow-statistics-rollup');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 5 });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: true, runOnTakeover: true });
	});

	it.each([
		{ leaseDurationSeconds: 60, runBudgetMs: 4000 },
		{ leaseDurationSeconds: 5, runBudgetMs: 4000 },
		{ leaseDurationSeconds: 2, runBudgetMs: 1000 },
		{ leaseDurationSeconds: 1, runBudgetMs: 0 },
	])(
		'should pass the signal and a $runBudgetMs ms budget to a durable run with a $leaseDurationSeconds second lease',
		async ({ leaseDurationSeconds, runBudgetMs }) => {
			const task = makeTask({ leaseDurationSeconds });
			const signal = new AbortController().signal;

			await task.run(signal, { durable: true });

			expect(rollupService.rollup).toHaveBeenCalledExactlyOnceWith(signal, runBudgetMs);
		},
	);

	it('should omit the budget for an in-memory run', async () => {
		const task = makeTask();
		const signal = new AbortController().signal;

		await task.run(signal, { durable: false });

		expect(rollupService.rollup).toHaveBeenCalledExactlyOnceWith(signal, undefined);
	});
});
