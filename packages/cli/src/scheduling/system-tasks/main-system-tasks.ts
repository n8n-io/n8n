import type { GlobalConfig } from '@n8n/config';
import type { SystemTaskClass } from '@n8n/decorators';

import { ActivityPruningTask } from '@/services/pruning/activity-pruning.task';
import { ExecutionPruningSoftDeleteTask } from '@/services/pruning/execution-pruning-soft-delete.task';
import { WorkflowHistoryCompactionOptimizeTask } from '@/services/pruning/workflow-history-compaction-optimize.task';
import { WorkflowHistoryCompactionTrimTask } from '@/services/pruning/workflow-history-compaction-trim.task';
import { WorkflowPublicationOutboxCleanupTask } from '@/workflows/publication/workflow-publication-outbox-cleanup.task';

/**
 * Return the main command's own system tasks, owned by no backend module.
 * A task whose feature is off is left out.
 */
export function mainSystemTasks(globalConfig: GlobalConfig): SystemTaskClass[] {
	const tasks: SystemTaskClass[] = [
		ActivityPruningTask,
		WorkflowHistoryCompactionOptimizeTask,
		WorkflowHistoryCompactionTrimTask,
	];

	if (globalConfig.executions.pruneData) {
		tasks.push(ExecutionPruningSoftDeleteTask);
	}

	if (globalConfig.workflows.useWorkflowPublicationService) {
		tasks.push(WorkflowPublicationOutboxCleanupTask);
	}

	return tasks;
}
