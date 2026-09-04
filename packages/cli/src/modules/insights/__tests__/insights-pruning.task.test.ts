import { mock } from 'vitest-mock-extended';

import type { InsightsPruningService } from '../insights-pruning.service';
import { InsightsPruningTask } from '../insights-pruning.task';
import { InsightsConfig } from '../insights.config';

describe('InsightsPruningTask', () => {
	const insightsConfig = new InsightsConfig();
	const pruningService = mock<InsightsPruningService>();
	const task = new InsightsPruningTask(insightsConfig, pruningService);

	it('should declare the configured prune-check cadence', () => {
		expect(task.name).toBe('insights-pruning');
		expect(task.schedule).toEqual({
			kind: 'interval',
			intervalSeconds: insightsConfig.pruneCheckIntervalHours * 3600,
		});
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
		expect(task.retryDelaySeconds).toBe(1);
	});

	it('should prune insights on run', async () => {
		await task.run();

		expect(pruningService.pruneInsights).toHaveBeenCalledTimes(1);
	});
});
