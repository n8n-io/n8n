import type { WorkflowCredentialRequirement } from './credential/credential.types';
import type { WorkflowDataTableRequirement } from './data-table/data-table.types';
import type { WorkflowWorkflowRequirement } from './workflow/workflow.types';

export interface WorkflowExportRequirements {
	credentials: WorkflowCredentialRequirement[];
	dataTables: WorkflowDataTableRequirement[];
	workflows: WorkflowWorkflowRequirement[];
}

export const mergeRequirements = (
	...parts: Array<WorkflowExportRequirements | undefined>
): WorkflowExportRequirements => ({
	credentials: parts.flatMap((part) => part?.credentials ?? []),
	dataTables: parts.flatMap((part) => part?.dataTables ?? []),
	workflows: parts.flatMap((part) => part?.workflows ?? []),
});
