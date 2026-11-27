import { mockLogger } from '@n8n/backend-test-utils';
import type { DatabaseConfig } from '@n8n/config';
import { MAX_TIMER_DELAY_SECONDS } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import type { ExecutionLimitUsageRepository } from '../execution-limit-usage.repository';
import { ExecutionLimitUsagePruningTask } from '../execution-limit-usage-pruning.task';
import { ExecutionLimitsConfig } from '../execution-limits.config';

describe('ExecutionLimitUsagePruningTask', () => {
	const databaseConfig = mock<DatabaseConfig>({
		type: 'postgresdb',
		postgresdb: { statementTimeoutMs: 300_000 },
	});
	let config: ExecutionLimitsConfig;
	let repository: ReturnType<typeof mock<ExecutionLimitUsageRepository>>;
	let task: ExecutionLimitUsagePruningTask;

	beforeEach(() => {
		config = new ExecutionLimitsConfig();
		repository = mock<ExecutionLimitUsageRepository>();
		repository.deleteUsageBefore.mockResolvedValue({ projectRows: 0, instanceRows: 0 });
		task = new ExecutionLimitUsagePruningTask(config, databaseConfig, repository, mockLogger());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('has the pruning task name', () => {
		expect(task.name).toBe('execution-limit-usage-pruning');
	});

	it('runs once a day', () => {
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 86400 });
	});

	it('runs on the cluster, retries on failure and runs when a main takes over', () => {
		expect(task.target).toEqual({
			scope: 'cluster',
			scheduler: { retryOnFailure: true, timeoutSeconds: 900 },
			leaderTimer: { runOnTakeover: true },
		});
	});

	it.each([
		{ type: 'postgresdb', statementTimeoutMs: 0, timeoutSeconds: MAX_TIMER_DELAY_SECONDS },
		{ type: 'sqlite', statementTimeoutMs: 0, timeoutSeconds: 900 },
	] as const)(
		'times out after both statement timeouts plus 5 minutes ($type, $statementTimeoutMs ms)',
		({ type, statementTimeoutMs, timeoutSeconds }) => {
			const database = mock<DatabaseConfig>({ type, postgresdb: { statementTimeoutMs } });

			const { target } = new ExecutionLimitUsagePruningTask(
				config,
				database,
				repository,
				mockLogger(),
			);

			expect(target.scheduler.timeoutSeconds).toBe(timeoutSeconds);
		},
	);

	it('deletes the rows older than 430 days before the current UTC day', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-11-25T23:30:00.000Z'));

		await task.run();

		expect(repository.deleteUsageBefore).toHaveBeenCalledTimes(1);
		expect(repository.deleteUsageBefore).toHaveBeenCalledWith('2025-09-21', {});
	});

	it('uses the configured retention for the cutoff day', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-11-25T23:30:00.000Z'));
		config.usageRetentionDays = 31;

		await task.run();

		expect(repository.deleteUsageBefore).toHaveBeenCalledWith('2026-10-25', {});
	});

	it('rejects when the delete fails, so the framework retries', async () => {
		repository.deleteUsageBefore.mockRejectedValue(new Error('delete failed'));

		await expect(task.run()).rejects.toThrow('delete failed');
	});
});
