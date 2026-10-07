import type { DatabaseConfig } from '@n8n/config';
import { MAX_TASK_TIMEOUT_SECONDS } from '@n8n/constants';
import { resolveSystemTaskSchedule } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import type { InsightsPruningService } from '../insights-pruning.service';
import { InsightsPruningTask } from '../insights-pruning.task';
import { InsightsConfig } from '../insights.config';

describe('InsightsPruningTask', () => {
	const insightsConfig = new InsightsConfig();
	const pruningService = mock<InsightsPruningService>();
	const databaseConfig = mock<DatabaseConfig>({
		type: 'postgresdb',
		postgresdb: { statementTimeoutMs: 300_000 },
	});
	const task = new InsightsPruningTask(insightsConfig, databaseConfig, pruningService);

	it('should declare the configured prune-check cadence', () => {
		expect(task.name).toBe('insights-pruning');
		expect(task.schedule).toEqual({
			kind: 'interval',
			intervalSeconds: insightsConfig.pruneCheckIntervalHours * 3600,
		});
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: true });
		expect(task.retryDelaySeconds).toBe(1);
	});

	it('should keep the whole-second rounding of a half-second prune-check cadence', () => {
		const config = new InsightsConfig();
		config.pruneCheckIntervalHours = 0.03625;

		const schedule = resolveSystemTaskSchedule(
			new InsightsPruningTask(config, databaseConfig, pruningService),
		);

		expect(schedule).toEqual({ kind: 'interval', intervalSeconds: 131 });
	});

	it.each([
		{ type: 'postgresdb', statementTimeoutMs: 300_000, timeoutSeconds: 600 },
		{ type: 'postgresdb', statementTimeoutMs: 1_200_000, timeoutSeconds: 1500 },
		{ type: 'postgresdb', statementTimeoutMs: 0, timeoutSeconds: MAX_TASK_TIMEOUT_SECONDS },
		{ type: 'sqlite', statementTimeoutMs: 300_000, timeoutSeconds: MAX_TASK_TIMEOUT_SECONDS },
	] as const)(
		'should time out 5 minutes after the statement timeout ($type, $statementTimeoutMs ms)',
		({ type, statementTimeoutMs, timeoutSeconds }) => {
			const database = mock<DatabaseConfig>({ type, postgresdb: { statementTimeoutMs } });

			expect(new InsightsPruningTask(insightsConfig, database, pruningService).timeoutSeconds).toBe(
				timeoutSeconds,
			);
		},
	);

	it('should prune insights on run', async () => {
		await task.run();

		expect(pruningService.pruneInsights).toHaveBeenCalledTimes(1);
	});
});
