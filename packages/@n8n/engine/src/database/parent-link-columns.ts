import type { ParentLink } from '../execution/execution.types';

/**
 * The parent link as the row stores it: three columns, so the parent execution
 * can be indexed. The record and the views carry it as one object or `null`.
 */
export function toParentColumns(parent: ParentLink | null): {
	parentExecutionId: string | null;
	parentStepId: string | null;
	parentAwaited: boolean | null;
} {
	return {
		parentExecutionId: parent?.executionId ?? null,
		parentStepId: parent?.stepId ?? null,
		parentAwaited: parent?.awaited ?? null,
	};
}

/** SQL that projects the three columns of `alias` back into one object, or `NULL`. */
export function parentLinkSql(alias: string): string {
	return `CASE WHEN ${alias}.parent_execution_id IS NULL THEN NULL ELSE json_build_object(
		'executionId', ${alias}.parent_execution_id,
		'stepId', ${alias}.parent_step_id,
		'awaited', ${alias}.parent_awaited
	) END`;
}
