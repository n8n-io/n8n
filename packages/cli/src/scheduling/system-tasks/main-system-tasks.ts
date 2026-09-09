import type { GlobalConfig } from '@n8n/config';
import type { SystemTaskClass } from '@n8n/decorators';

import { ActivityPruningTask } from '@/services/pruning/activity-pruning.task';

/**
 * Return the main command's own system tasks, owned by no backend module.
 * A task whose feature is off is left out, so the runner only logs tasks that will run.
 */
export async function mainSystemTasks(globalConfig: GlobalConfig): Promise<SystemTaskClass[]> {
	const { WorkflowHistoryCompactionOptimizeTask } = await import(
		'@/services/pruning/workflow-history-compaction-optimize.task.js'
	);
	const { WorkflowHistoryCompactionTrimTask } = await import(
		'@/services/pruning/workflow-history-compaction-trim.task.js'
	);

	const tasks: SystemTaskClass[] = [
		ActivityPruningTask,
		WorkflowHistoryCompactionOptimizeTask,
		WorkflowHistoryCompactionTrimTask,
	];

	if (globalConfig.executions.pruneData) {
		const { ExecutionPruningSoftDeleteTask } = await import(
			'@/services/pruning/execution-pruning-soft-delete.task.js'
		);
		tasks.push(ExecutionPruningSoftDeleteTask);
	}

	if (globalConfig.workflows.useWorkflowPublicationService) {
		const { WorkflowPublicationOutboxCleanupTask } = await import(
			'@/workflows/publication/workflow-publication-outbox-cleanup.task.js'
		);
		tasks.push(WorkflowPublicationOutboxCleanupTask);
	}

	return tasks;
}
