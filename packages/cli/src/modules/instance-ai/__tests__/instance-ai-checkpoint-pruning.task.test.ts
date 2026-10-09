import type { DatabaseConfig, InstanceAiConfig } from '@n8n/config';
import { MAX_TIMER_DELAY_SECONDS } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { InstanceAiCheckpointPruningTask } from '../instance-ai-checkpoint-pruning.task';
import type { InstanceAiService } from '../instance-ai.service';

describe('InstanceAiCheckpointPruningTask', () => {
	const config = mock<InstanceAiConfig>({ pruneInterval: 60 * 60 * 1000 });
	const instanceAiService = mock<InstanceAiService>();
	const databaseConfig = mock<DatabaseConfig>({
		type: 'postgresdb',
		postgresdb: { statementTimeoutMs: 300_000 },
	});
	const task = new InstanceAiCheckpointPruningTask(config, databaseConfig, instanceAiService);

	it('should declare the configured prune cadence', () => {
		expect(task.name).toBe('instance-ai-checkpoint-pruning');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.target).toMatchObject({
			scope: 'cluster',
			scheduler: { maxAttempts: 3 },
			leaderTimer: { runOnTakeover: true },
		});
		expect(task.target.leaderTimer?.retryDelaySeconds).toBe(30);
	});

	it('should declare a fractional prune interval as is', () => {
		const task = new InstanceAiCheckpointPruningTask(
			mock<InstanceAiConfig>({ pruneInterval: 1_500 }),
			databaseConfig,
			instanceAiService,
		);

		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 1.5 });
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
				new InstanceAiCheckpointPruningTask(config, database, instanceAiService).target.scheduler
					.timeoutSeconds,
			).toBe(timeoutSeconds);
		},
	);

	it('should prune expired data on run and pass the signal through', async () => {
		const { signal } = new AbortController();

		await task.run(signal);

		expect(instanceAiService.pruneExpiredData).toHaveBeenCalledTimes(1);
		expect(instanceAiService.pruneExpiredData).toHaveBeenCalledWith(expect.any(Number), signal);
	});
});
