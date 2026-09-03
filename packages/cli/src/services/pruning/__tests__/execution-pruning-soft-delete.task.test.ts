import type { ExecutionsConfig } from '@n8n/config';
import type { DbConnection } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ExecutionPruningSoftDeleteTask } from '../execution-pruning-soft-delete.task';
import type { ExecutionsPruningService } from '../executions-pruning.service';

describe('ExecutionPruningSoftDeleteTask', () => {
	const config = mock<ExecutionsConfig>({ pruneDataIntervals: { softDelete: 60 } });
	const dbConnection = mock<DbConnection>({ connectionState: { migrated: true } });
	let pruningService = mock<ExecutionsPruningService>();
	let task = new ExecutionPruningSoftDeleteTask(config, dbConnection, pruningService);

	beforeEach(() => {
		pruningService = mock<ExecutionsPruningService>();
		task = new ExecutionPruningSoftDeleteTask(config, dbConnection, pruningService);
		dbConnection.connectionState.migrated = true;
	});

	it('should declare the configured soft-delete cadence', () => {
		expect(task.name).toBe('execution-pruning-soft-delete');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
	});

	it('should soft-delete prunable executions on run', async () => {
		Object.defineProperty(pruningService, 'isEnabled', { value: true });

		await task.run();

		expect(pruningService.softDelete).toHaveBeenCalledTimes(1);
	});

	it('should skip the run when pruning is disabled', async () => {
		Object.defineProperty(pruningService, 'isEnabled', { value: false });

		await task.run();

		expect(pruningService.softDelete).not.toHaveBeenCalled();
	});

	it('should skip the run until migrations have finished', async () => {
		Object.defineProperty(pruningService, 'isEnabled', { value: true });
		dbConnection.connectionState.migrated = false;

		await task.run();

		expect(pruningService.softDelete).not.toHaveBeenCalled();
	});
});
