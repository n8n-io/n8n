import type { DatabaseConfig, ExecutionsConfig } from '@n8n/config';
import { MAX_TASK_TIMEOUT_SECONDS } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { ExecutionPruningSoftDeleteTask } from '../execution-pruning-soft-delete.task';
import type { ExecutionsPruningService } from '../executions-pruning.service';

describe('ExecutionPruningSoftDeleteTask', () => {
	const config = mock<ExecutionsConfig>({ pruneDataIntervals: { softDelete: 60 } });
	let pruningService = mock<ExecutionsPruningService>();
	const databaseConfig = mock<DatabaseConfig>({
		type: 'postgresdb',
		postgresdb: { statementTimeoutMs: 300_000 },
	});
	let task = new ExecutionPruningSoftDeleteTask(config, databaseConfig, pruningService);

	beforeEach(() => {
		pruningService = mock<ExecutionsPruningService>();
		task = new ExecutionPruningSoftDeleteTask(config, databaseConfig, pruningService);
	});

	it('should declare the configured soft-delete cadence', () => {
		expect(task.name).toBe('execution-pruning-soft-delete');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: true });
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

			expect(
				new ExecutionPruningSoftDeleteTask(config, database, pruningService).timeoutSeconds,
			).toBe(timeoutSeconds);
		},
	);

	it('should soft-delete prunable executions on run', async () => {
		await task.run();

		expect(pruningService.softDelete).toHaveBeenCalledTimes(1);
	});
});
