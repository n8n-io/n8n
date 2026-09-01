import type { WorkflowHistoryCompactionConfig } from '@n8n/config';
import type { DbConnection } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowHistoryCompactionOptimizeTask } from '../workflow-history-compaction-optimize.task';
import type { WorkflowHistoryCompactionService } from '../workflow-history-compaction.service';

describe('WorkflowHistoryCompactionOptimizeTask', () => {
	const config = mock<WorkflowHistoryCompactionConfig>({ optimizingTimeWindowHours: 2 });
	const dbConnection = mock<DbConnection>({ connectionState: { migrated: true } });
	let compactionService = mock<WorkflowHistoryCompactionService>();
	let task = new WorkflowHistoryCompactionOptimizeTask(config, dbConnection, compactionService);

	beforeEach(() => {
		compactionService = mock<WorkflowHistoryCompactionService>();
		task = new WorkflowHistoryCompactionOptimizeTask(config, dbConnection, compactionService);
		dbConnection.connectionState.migrated = true;
	});

	it('should declare a cadence of half the optimizing window', () => {
		expect(task.name).toBe('workflow-history-compaction-optimize');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
	});

	it('should optimize histories on run', async () => {
		Object.defineProperty(compactionService, 'isEnabled', { value: true });

		await task.run();

		expect(compactionService.optimizeHistories).toHaveBeenCalledTimes(1);
	});

	it('should skip the run when compaction is disabled', async () => {
		Object.defineProperty(compactionService, 'isEnabled', { value: false });

		await task.run();

		expect(compactionService.optimizeHistories).not.toHaveBeenCalled();
	});
});
