import type { ErrorSourceLink } from '../execution/execution.types';

/**
 * The error source link as the row stores it: two columns, so the source
 * execution can be indexed. The record and the views carry it as one object or
 * `null`.
 */
export function toErrorSourceColumns(errorSource: ErrorSourceLink | null): {
	errorSourceExecutionId: string | null;
	errorSourceWorkflowId: string | null;
} {
	return {
		errorSourceExecutionId: errorSource?.executionId ?? null,
		errorSourceWorkflowId: errorSource?.workflowId ?? null,
	};
}

/** SQL that projects the two columns of `alias` back into one object, or `NULL`. */
export function errorSourceSql(alias: string): string {
	return `CASE WHEN ${alias}.error_source_execution_id IS NULL THEN NULL ELSE json_build_object(
		'executionId', ${alias}.error_source_execution_id,
		'workflowId', ${alias}.error_source_workflow_id
	) END`;
}
