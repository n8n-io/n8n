import type { WorkflowCredentialRequirement } from './credential/credential.types.js';
import type { WorkflowDataTableRequirement } from './data-table/data-table.types.js';

export interface WorkflowExportRequirements {
	credentials: WorkflowCredentialRequirement[];
	dataTables: WorkflowDataTableRequirement[];
}

export const mergeRequirements = (
	...parts: Array<WorkflowExportRequirements | undefined>
): WorkflowExportRequirements => ({
	credentials: parts.flatMap((part) => part?.credentials ?? []),
	dataTables: parts.flatMap((part) => part?.dataTables ?? []),
});
