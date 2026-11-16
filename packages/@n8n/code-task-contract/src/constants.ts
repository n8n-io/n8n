/**
 * Version of the task input and result formats. Increase it on every change
 * that an older reader cannot read.
 */
export const CODE_TASK_CONTRACT_VERSION = 1;

/** Path of the task input file, relative to the input folder of the task. */
export const TASK_INPUT_PATH = 'task.json';

/** Path of the task result file, relative to the output folder of the task. */
export const TASK_RESULT_PATH = 'result.json';

/** Max console entries in a result. */
export const MAX_CONSOLE_ENTRIES = 100;
