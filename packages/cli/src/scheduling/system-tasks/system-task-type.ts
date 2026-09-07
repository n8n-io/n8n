/**
 * The task type of a system task's durable job.
 * One type per task, rather than a single `system` type for all of them.
 */
export function systemTaskType(taskName: string): string {
	return `system:${taskName}`;
}
