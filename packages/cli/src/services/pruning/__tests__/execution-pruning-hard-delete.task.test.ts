import type { ExecutionsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { ExecutionPruningHardDeleteTask } from '../execution-pruning-hard-delete.task';
import type { ExecutionsPruningService } from '../executions-pruning.service';

describe('ExecutionPruningHardDeleteTask', () => {
	const config = mock<ExecutionsConfig>({ pruneDataIntervals: { hardDelete: 15 } });
	let pruningService = mock<ExecutionsPruningService>();
	let task = new ExecutionPruningHardDeleteTask(config, pruningService);

	beforeEach(() => {
		pruningService = mock<ExecutionsPruningService>();
		task = new ExecutionPruningHardDeleteTask(config, pruningService);
	});

	it('should declare the configured hard-delete cadence', () => {
		expect(task.name).toBe('execution-pruning-hard-delete');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 900 });
		expect(task.target).toEqual({
			scope: 'cluster',
			scheduler: { retryOnFailure: true, timeoutSeconds: 900 },
			leaderTimer: { retryDelaySeconds: 1 },
		});
	});

	it('should hard-delete with the run signal', async () => {
		const { signal } = new AbortController();

		await task.run(signal);

		expect(pruningService.hardDelete).toHaveBeenCalledWith(signal);
	});
});
