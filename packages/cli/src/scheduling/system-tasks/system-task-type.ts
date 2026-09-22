/** Prefix that tells a system task's durable job apart from any other task type. */
const SYSTEM_TASK_TYPE_PREFIX = 'system:';

/**
 * The task type of a system task's durable job.
 * One type per task, rather than a single `system` type for all of them.
 */
export function systemTaskType(taskName: string): string {
	return `${SYSTEM_TASK_TYPE_PREFIX}${taskName}`;
}

/** The task's name, or `undefined` when the task type belongs to something else. */
export function systemTaskName(taskType: string): string | undefined {
	return taskType.startsWith(SYSTEM_TASK_TYPE_PREFIX)
		? taskType.slice(SYSTEM_TASK_TYPE_PREFIX.length)
		: undefined;
}
