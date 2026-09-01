import type { SystemTaskClass } from '@n8n/decorators';

/**
 * Return the main command's own system tasks, owned by no backend module.
 */
export async function mainSystemTasks(): Promise<SystemTaskClass[]> {
	const { ExecutionPruningSoftDeleteTask } = await import(
		'@/services/pruning/execution-pruning-soft-delete.task.js'
	);
	const { WorkflowHistoryCompactionOptimizeTask } = await import(
		'@/services/pruning/workflow-history-compaction-optimize.task.js'
	);
	const { WorkflowHistoryCompactionTrimTask } = await import(
		'@/services/pruning/workflow-history-compaction-trim.task.js'
	);

	return [
		ExecutionPruningSoftDeleteTask,
		WorkflowHistoryCompactionOptimizeTask,
		WorkflowHistoryCompactionTrimTask,
	];
}
