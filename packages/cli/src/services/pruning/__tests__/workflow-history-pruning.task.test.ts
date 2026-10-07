import type { DatabaseConfig } from '@n8n/config';
import { MAX_TASK_TIMEOUT_SECONDS } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import type { WorkflowHistoryManager } from '@/workflows/workflow-history/workflow-history-manager';

import { WorkflowHistoryPruningTask } from '../workflow-history-pruning.task';

describe('WorkflowHistoryPruningTask', () => {
	const workflowHistoryManager = mock<WorkflowHistoryManager>();
	const databaseConfig = mock<DatabaseConfig>({
		type: 'postgresdb',
		postgresdb: { statementTimeoutMs: 300_000 },
	});
	const task = new WorkflowHistoryPruningTask(databaseConfig, workflowHistoryManager);

	it('should declare an hourly idempotent durable cluster task that runs on takeover', () => {
		expect(task.name).toBe('workflow-history-pruning');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: true, runOnTakeover: true });
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

			expect(new WorkflowHistoryPruningTask(database, workflowHistoryManager).timeoutSeconds).toBe(
				timeoutSeconds,
			);
		},
	);

	it('should prune on run', async () => {
		await task.run();

		expect(workflowHistoryManager.prune).toHaveBeenCalledOnce();
	});
});
