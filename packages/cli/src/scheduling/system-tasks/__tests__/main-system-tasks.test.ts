import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { PendingAuthorizationCleanupTask } from '@/credentials/pending-authorization-cleanup.task';
import { LicenseRenewalTask } from '@/license/license-renewal.task';
import { ActivityPruningTask } from '@/services/pruning/activity-pruning.task';
import { ExecutionPruningSoftDeleteTask } from '@/services/pruning/execution-pruning-soft-delete.task';
import { WorkflowHistoryCompactionOptimizeTask } from '@/services/pruning/workflow-history-compaction-optimize.task';
import { WorkflowHistoryCompactionTrimTask } from '@/services/pruning/workflow-history-compaction-trim.task';
import { WorkflowHistoryPruningTask } from '@/services/pruning/workflow-history-pruning.task';
import { WorkflowStatisticsRollupTask } from '@/services/workflow-statistics-rollup.task';
import { TelemetryPulseTask } from '@/telemetry/telemetry-pulse.task';
import { WorkflowPublicationOutboxCleanupTask } from '@/workflows/publication/workflow-publication-outbox-cleanup.task';

import { mainSystemTasks } from '../main-system-tasks';

const configWith = ({
	pruneData = true,
	useWorkflowPublicationService = true,
	diagnosticsEnabled = true,
	historyPruneTimeHours = -1,
	dbType = 'postgresdb',
} = {}) =>
	mock<GlobalConfig>({
		executions: { pruneData },
		workflows: { useWorkflowPublicationService },
		diagnostics: { enabled: diagnosticsEnabled },
		workflowHistory: { pruneTime: historyPruneTimeHours },
		workflowHistoryCompaction: { trimmingMinimumAgeDays: 6 },
		database: { type: dbType as GlobalConfig['database']['type'] },
	});

it('should return every main task when all features are on', async () => {
	const tasks = await mainSystemTasks(configWith());

	expect(tasks).toEqual([
		ActivityPruningTask,
		LicenseRenewalTask,
		WorkflowHistoryCompactionOptimizeTask,
		WorkflowHistoryPruningTask,
		PendingAuthorizationCleanupTask,
		WorkflowHistoryCompactionTrimTask,
		ExecutionPruningSoftDeleteTask,
		TelemetryPulseTask,
		WorkflowPublicationOutboxCleanupTask,
		WorkflowStatisticsRollupTask,
	]);
});

it('should leave out the telemetry pulse when diagnostics are off', async () => {
	const tasks = await mainSystemTasks(configWith({ diagnosticsEnabled: false }));

	expect(tasks).not.toContain(TelemetryPulseTask);
});

it('should leave out execution pruning soft delete when pruning is off', async () => {
	const tasks = await mainSystemTasks(configWith({ pruneData: false }));

	expect(tasks).not.toContain(ExecutionPruningSoftDeleteTask);
	expect(tasks).toContain(WorkflowPublicationOutboxCleanupTask);
});

it('should leave out the history trim when the prune horizon is shorter than the trim window', async () => {
	const tasks = await mainSystemTasks(configWith({ historyPruneTimeHours: 24 }));

	expect(tasks).not.toContain(WorkflowHistoryCompactionTrimTask);
	expect(tasks).toContain(WorkflowHistoryCompactionOptimizeTask);
});

it('should leave out outbox cleanup when the publication service is off', async () => {
	const tasks = await mainSystemTasks(configWith({ useWorkflowPublicationService: false }));

	expect(tasks).not.toContain(WorkflowPublicationOutboxCleanupTask);
	expect(tasks).toContain(ExecutionPruningSoftDeleteTask);
});

it('should leave out the statistics rollup when the database is not Postgres', async () => {
	const tasks = await mainSystemTasks(configWith({ dbType: 'sqlite' }));

	expect(tasks).not.toContain(WorkflowStatisticsRollupTask);
});
