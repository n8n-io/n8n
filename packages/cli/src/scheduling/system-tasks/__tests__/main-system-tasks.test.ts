import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { LicenseRenewalTask } from '@/license/license-renewal.task';
import { ActivityPruningTask } from '@/services/pruning/activity-pruning.task';
import { ExecutionPruningSoftDeleteTask } from '@/services/pruning/execution-pruning-soft-delete.task';
import { WorkflowHistoryCompactionOptimizeTask } from '@/services/pruning/workflow-history-compaction-optimize.task';
import { WorkflowHistoryCompactionTrimTask } from '@/services/pruning/workflow-history-compaction-trim.task';
import { WorkflowPublicationOutboxCleanupTask } from '@/workflows/publication/workflow-publication-outbox-cleanup.task';

import { mainSystemTasks } from '../main-system-tasks';

const configWith = ({ pruneData = true, useWorkflowPublicationService = true } = {}) =>
	mock<GlobalConfig>({
		executions: { pruneData },
		workflows: { useWorkflowPublicationService },
	});

it('should return every main task when all features are on', async () => {
	const tasks = await mainSystemTasks(configWith());

	expect(tasks).toEqual([
		ActivityPruningTask,
		LicenseRenewalTask,
		WorkflowHistoryCompactionOptimizeTask,
		WorkflowHistoryCompactionTrimTask,
		ExecutionPruningSoftDeleteTask,
		WorkflowPublicationOutboxCleanupTask,
	]);
});

it('should leave out execution pruning soft delete when pruning is off', async () => {
	const tasks = await mainSystemTasks(configWith({ pruneData: false }));

	expect(tasks).not.toContain(ExecutionPruningSoftDeleteTask);
	expect(tasks).toContain(WorkflowPublicationOutboxCleanupTask);
});

it('should leave out outbox cleanup when the publication service is off', async () => {
	const tasks = await mainSystemTasks(configWith({ useWorkflowPublicationService: false }));

	expect(tasks).not.toContain(WorkflowPublicationOutboxCleanupTask);
	expect(tasks).toContain(ExecutionPruningSoftDeleteTask);
});
