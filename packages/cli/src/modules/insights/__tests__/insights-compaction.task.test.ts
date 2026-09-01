import { mock } from 'vitest-mock-extended';

import type { InsightsCompactionService } from '../insights-compaction.service';
import { InsightsCompactionTask } from '../insights-compaction.task';
import { InsightsConfig } from '../insights.config';

describe('InsightsCompactionTask', () => {
	const insightsConfig = new InsightsConfig();
	const compactionService = mock<InsightsCompactionService>();
	const task = new InsightsCompactionTask(insightsConfig, compactionService);

	it('should declare the configured compaction cadence', () => {
		expect(task.name).toBe('insights-compaction');
		expect(task.schedule).toEqual({
			kind: 'interval',
			intervalSeconds: insightsConfig.compactionIntervalMinutes * 60,
		});
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
	});

	it('should compact insights on run', async () => {
		await task.run();

		expect(compactionService.compactInsights).toHaveBeenCalledTimes(1);
	});
});
