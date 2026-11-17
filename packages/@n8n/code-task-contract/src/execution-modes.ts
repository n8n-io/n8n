import type { CodeExecutionMode, WorkflowExecuteMode } from 'n8n-workflow';

/**
 * Returns the list as it is. The list does not compile unless it has every
 * member of `T` and no other value, so it stays 1:1 with the type.
 */
const listOf =
	<T extends string>() =>
	<const L extends readonly T[]>(list: L & ([T] extends [L[number]] ? unknown : never)): L =>
		list;

/**
 * Copies of value lists of `n8n-workflow`, checked against its types. This
 * package has no runtime dependency on `n8n-workflow`.
 */
export const CODE_EXECUTION_MODES = listOf<CodeExecutionMode>()([
	'runOnceForAllItems',
	'runOnceForEachItem',
]);

export const WORKFLOW_EXECUTE_MODES = listOf<WorkflowExecuteMode>()([
	'cli',
	'error',
	'integrated',
	'internal',
	'manual',
	'retry',
	'trigger',
	'webhook',
	'evaluation',
	'chat',
	'agent',
]);
