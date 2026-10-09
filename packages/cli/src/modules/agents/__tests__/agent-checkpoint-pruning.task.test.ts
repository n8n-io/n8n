import type { DatabaseConfig } from '@n8n/config';
import { MAX_TIMER_DELAY_SECONDS } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { AgentCheckpointPruningTask } from '../agent-checkpoint-pruning.task';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';

describe('AgentCheckpointPruningTask', () => {
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const backgroundJobs = mock<AgentBackgroundJobService>();
	const databaseConfig = mock<DatabaseConfig>({
		type: 'postgresdb',
		postgresdb: { statementTimeoutMs: 300_000 },
	});
	const task = new AgentCheckpointPruningTask(databaseConfig, checkpointStorage, backgroundJobs);

	it('should declare an hourly prune cadence', () => {
		expect(task.name).toBe('agent-checkpoint-pruning');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.target).toMatchObject({
			scope: 'cluster',
			scheduler: { maxAttempts: 3 },
			leaderTimer: { runOnTakeover: true },
		});
		expect(task.target.leaderTimer?.retryDelaySeconds).toBe(30);
	});

	it.each([
		{ type: 'postgresdb', statementTimeoutMs: 300_000, timeoutSeconds: 600 },
		{ type: 'postgresdb', statementTimeoutMs: 1_200_000, timeoutSeconds: 1500 },
		{ type: 'postgresdb', statementTimeoutMs: 0, timeoutSeconds: MAX_TIMER_DELAY_SECONDS },
		{ type: 'sqlite', statementTimeoutMs: 0, timeoutSeconds: 600 },
	] as const)(
		'should time out 5 minutes after the statement timeout ($type, $statementTimeoutMs ms)',
		({ type, statementTimeoutMs, timeoutSeconds }) => {
			const database = mock<DatabaseConfig>({ type, postgresdb: { statementTimeoutMs } });

			expect(
				new AgentCheckpointPruningTask(database, checkpointStorage, backgroundJobs).target.scheduler
					.timeoutSeconds,
			).toBe(timeoutSeconds);
		},
	);

	it('should prune stale suspensions on run', async () => {
		await task.run();

		expect(checkpointStorage.pruneStaleSuspensions).toHaveBeenCalledTimes(1);
	});
});
