import type { SystemTaskClass } from '@n8n/decorators';

/**
 * Return the main command's own system tasks, owned by no backend module.
 */
export async function mainSystemTasks(): Promise<SystemTaskClass[]> {
	const { ExecutionPruningSoftDeleteTask } = await import(
		'@/services/pruning/execution-pruning-soft-delete.task.js'
	);

	return [ExecutionPruningSoftDeleteTask];
}
