import type { DbConnection } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowHistoryCompactionTrimTask } from '../workflow-history-compaction-trim.task';
import type { WorkflowHistoryCompactionService } from '../workflow-history-compaction.service';

describe('WorkflowHistoryCompactionTrimTask', () => {
	const dbConnection = mock<DbConnection>({ connectionState: { migrated: true } });
	let compactionService = mock<WorkflowHistoryCompactionService>();
	let task = new WorkflowHistoryCompactionTrimTask(dbConnection, compactionService);

	const setService = ({ enabled = true, trimmingEnabled = true } = {}) => {
		Object.defineProperty(compactionService, 'isEnabled', { value: enabled });
		Object.defineProperty(compactionService, 'isTrimmingEnabled', { value: trimmingEnabled });
	};

	beforeEach(() => {
		compactionService = mock<WorkflowHistoryCompactionService>();
		task = new WorkflowHistoryCompactionTrimTask(dbConnection, compactionService);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should declare an hourly tick', () => {
		expect(task.name).toBe('workflow-history-compaction-trim');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
	});

	it('should trim at 3am server time', async () => {
		vi.setSystemTime(new Date(2026, 10, 10, 3, 0, 0));
		setService();

		await task.run();

		expect(compactionService.trimLongRunningHistories).toHaveBeenCalledTimes(1);
	});

	it('should not trim outside of 3am server time', async () => {
		vi.setSystemTime(new Date(2026, 10, 10, 5, 0, 0));
		setService();

		await task.run();

		expect(compactionService.trimLongRunningHistories).not.toHaveBeenCalled();
	});

	it('should not trim when the prune horizon is shorter than the trim window', async () => {
		vi.setSystemTime(new Date(2026, 10, 10, 3, 0, 0));
		setService({ trimmingEnabled: false });

		await task.run();

		expect(compactionService.trimLongRunningHistories).not.toHaveBeenCalled();
	});
});
