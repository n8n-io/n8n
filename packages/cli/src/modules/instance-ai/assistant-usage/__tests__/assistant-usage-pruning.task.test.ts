import type { DatabaseConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { AssistantUsagePruningTask } from '../assistant-usage-pruning.task';
import type { AssistantUsageService } from '../assistant-usage.service';

describe('AssistantUsagePruningTask', () => {
	const usageService = mock<AssistantUsageService>();
	const databaseConfig = mock<DatabaseConfig>({
		type: 'postgresdb',
		postgresdb: { statementTimeoutMs: 300_000 },
	});
	const task = new AssistantUsagePruningTask(databaseConfig, usageService);

	it('runs once a day on one main instance', () => {
		expect(task.name).toBe('assistant-usage-pruning');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 86_400 });
		expect(task.target).toEqual(
			expect.objectContaining({
				scope: 'cluster',
				leaderTimer: { runOnTakeover: true, retryDelaySeconds: 30 },
			}),
		);
	});

	it('deletes the records past the retention period', async () => {
		await task.run();

		expect(usageService.pruneOldEvents).toHaveBeenCalledTimes(1);
	});
});
