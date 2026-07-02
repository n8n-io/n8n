import type { WorkflowCredentialRequirement } from './credential/credential.types';

/**
 * Everything an exported set of workflows needs shipped alongside them, grouped
 * by type. Deliberately keyed the same way as the manifest's `requirements` and
 * the import `bindings` ({ credentials, dataTables, ... }), so a source resource
 * listed here maps 1:1 to the target it is bound to on import. Add a field per
 * new type (data tables, variables).
 */
export interface WorkflowExportRequirements {
	credentials: WorkflowCredentialRequirement[];
}

/**
 * Merges the requirements from any number of export results. The single place
 * that names each requirement field — a new type adds a field above and one line
 * here; every exporter that aggregates results stays untouched. Tolerates
 * `undefined` parts so callers can pass optional export results directly.
 */
export const mergeRequirements = (
	...parts: Array<WorkflowExportRequirements | undefined>
): WorkflowExportRequirements => ({
	credentials: parts.flatMap((part) => part?.credentials ?? []),
});
