import { Time } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { WorkflowHistoryCompactionTrimTask } from '../workflow-history-compaction-trim.task';
import type { WorkflowHistoryCompactionService } from '../workflow-history-compaction.service';

describe('WorkflowHistoryCompactionTrimTask', () => {
	const compactionService = mock<WorkflowHistoryCompactionService>();
	const task = new WorkflowHistoryCompactionTrimTask(compactionService);

	it('should declare a daily cron in the instance timezone and run durably', () => {
		expect(task.name).toBe('workflow-history-compaction-trim');
		expect(task.schedule).toEqual({ kind: 'cron', cronExpression: '0 3 * * *', timezone: null });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: true });
	});

	it('should keep a missed occurrence claimable for an hour', () => {
		expect(task.misfireGraceSeconds).toBe(Time.hours.toSeconds);
	});

	it('should outlast the default task timeout', () => {
		expect(task.timeoutSeconds).toBe(3600);
	});

	it('should trim on run, handing the pass its abort signal', async () => {
		const { signal } = new AbortController();

		await task.run(signal);

		expect(compactionService.trimLongRunningHistories).toHaveBeenCalledExactlyOnceWith(signal);
	});
});
