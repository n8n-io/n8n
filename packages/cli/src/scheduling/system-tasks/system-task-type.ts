const SYSTEM_TASK_TYPE_PREFIX = 'system:';

/**
 * The task type of a system task's durable job.
 * One type per task, rather than a single `system` type for all of them.
 */
export function systemTaskType(taskName: string): string {
	return `${SYSTEM_TASK_TYPE_PREFIX}${taskName}`;
}

/** Inverse of `systemTaskType`. Returns `undefined` for any other task type. */
export function systemTaskName(taskType: string): string | undefined {
	return taskType.startsWith(SYSTEM_TASK_TYPE_PREFIX)
		? taskType.slice(SYSTEM_TASK_TYPE_PREFIX.length)
		: undefined;
}
