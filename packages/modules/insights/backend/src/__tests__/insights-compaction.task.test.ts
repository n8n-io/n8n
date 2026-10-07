import { MAX_TASK_TIMEOUT_SECONDS } from '@n8n/constants';
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
		expect(task.placement).toEqual({ scope: 'cluster', durable: true });
	});

	it.each([
		{ maxRuntimeSeconds: 300, timeoutSeconds: 600 },
		{ maxRuntimeSeconds: 1800, timeoutSeconds: 2100 },
		{ maxRuntimeSeconds: 0, timeoutSeconds: MAX_TASK_TIMEOUT_SECONDS },
	])(
		'should time out 5 minutes after a compaction budget of $maxRuntimeSeconds s',
		({ maxRuntimeSeconds, timeoutSeconds }) => {
			const config = Object.assign(new InsightsConfig(), {
				compactionMaxRuntimeSeconds: maxRuntimeSeconds,
			});

			expect(new InsightsCompactionTask(config, compactionService).timeoutSeconds).toBe(
				timeoutSeconds,
			);
		},
	);

	it('should compact insights on run, handing it the run signal', async () => {
		const { signal } = new AbortController();

		await task.run(signal);

		expect(compactionService.compactInsights).toHaveBeenCalledExactlyOnceWith(signal);
	});
});
