import { mock } from 'vitest-mock-extended';

import type { WorkflowHistoryManager } from '@/workflows/workflow-history/workflow-history-manager';

import { WorkflowHistoryPruningTask } from '../workflow-history-pruning.task';

describe('WorkflowHistoryPruningTask', () => {
	const workflowHistoryManager = mock<WorkflowHistoryManager>();
	const task = new WorkflowHistoryPruningTask(workflowHistoryManager);

	it('should declare an hourly idempotent durable cluster task that runs on takeover', () => {
		expect(task.name).toBe('workflow-history-pruning');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: true, runOnTakeover: true });
	});

	it('should prune on run', async () => {
		await task.run();

		expect(workflowHistoryManager.prune).toHaveBeenCalledOnce();
	});
});
