import { mock } from 'vitest-mock-extended';

import type { WorkflowStatisticsRollupService } from '../workflow-statistics-rollup.service';
import { WorkflowStatisticsRollupTask } from '../workflow-statistics-rollup.task';

describe('WorkflowStatisticsRollupTask', () => {
	let rollupService = mock<WorkflowStatisticsRollupService>();
	let task = new WorkflowStatisticsRollupTask(rollupService);

	beforeEach(() => {
		rollupService = mock<WorkflowStatisticsRollupService>();
		task = new WorkflowStatisticsRollupTask(rollupService);
	});

	it('should declare a fixed 5 second cadence on the leader', () => {
		expect(task.name).toBe('workflow-statistics-rollup');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 5 });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: false, runOnTakeover: true });
	});

	it('should pass the run signal to the rollup', async () => {
		const signal = new AbortController().signal;

		await task.run(signal);

		expect(rollupService.rollup).toHaveBeenCalledWith(signal);
	});
});
