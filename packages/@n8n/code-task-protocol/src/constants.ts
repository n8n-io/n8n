/**
 * Version of the task input and result formats. n8n and the runtime come from
 * the same n8n release, so they always use the same version. Increase it on
 * every change that an older reader cannot read.
 */
export const CODE_TASK_PROTOCOL_VERSION = 1;

/** Path of the task input file, relative to the input folder of the task. */
export const TASK_INPUT_PATH = 'task.json';

/** Path of the task result file, relative to the output folder of the task. */
export const TASK_RESULT_PATH = 'result.json';

/** Max console entries in a result, before the entry that tells about the truncation. */
export const MAX_CONSOLE_ENTRIES = 100;

/** The last console entry of a result that has more than `MAX_CONSOLE_ENTRIES` entries. */
export function consoleTruncationEntry(droppedEntries: number): string[] {
	return [`[Output truncated - ${droppedEntries} more entries]`];
}
