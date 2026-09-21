import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { ExecutionPruningSoftDeleteTask } from '../execution-pruning-soft-delete.task';
import type { ExecutionsPruningService } from '../executions-pruning.service';

describe('ExecutionPruningSoftDeleteTask', () => {
	const config = mock<ExecutionsConfig>({ pruneDataIntervals: { softDelete: 60 } });
	let pruningService = mock<ExecutionsPruningService>();
	let task = new ExecutionPruningSoftDeleteTask(config, pruningService);

	beforeEach(() => {
		pruningService = mock<ExecutionsPruningService>();
		task = new ExecutionPruningSoftDeleteTask(config, pruningService);
	});

	it('should declare the configured soft-delete cadence', () => {
		expect(task.name).toBe('execution-pruning-soft-delete');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
	});

	it('should soft-delete prunable executions on run', async () => {
		await task.run();

		expect(pruningService.softDelete).toHaveBeenCalledTimes(1);
	});
});
