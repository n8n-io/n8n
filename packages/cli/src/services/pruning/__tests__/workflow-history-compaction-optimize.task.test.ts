import type { WorkflowHistoryCompactionConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { WorkflowHistoryCompactionOptimizeTask } from '../workflow-history-compaction-optimize.task';
import type { WorkflowHistoryCompactionService } from '../workflow-history-compaction.service';

describe('WorkflowHistoryCompactionOptimizeTask', () => {
	const config = mock<WorkflowHistoryCompactionConfig>({ optimizingTimeWindowHours: 2 });
	let compactionService = mock<WorkflowHistoryCompactionService>();
	let task = new WorkflowHistoryCompactionOptimizeTask(config, compactionService);

	beforeEach(() => {
		compactionService = mock<WorkflowHistoryCompactionService>();
		task = new WorkflowHistoryCompactionOptimizeTask(config, compactionService);
	});

	it('should declare a cadence of half the optimizing window', () => {
		expect(task.name).toBe('workflow-history-compaction-optimize');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
	});

	it('should optimize histories on run, handing the pass its abort signal', async () => {
		const { signal } = new AbortController();

		await task.run(signal);

		expect(compactionService.optimizeHistories).toHaveBeenCalledExactlyOnceWith(signal);
	});
});
