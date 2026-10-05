import type { CredentialExportRequirement } from './credential/credential.types';
import type { DataTableExportRequirement } from './data-table/data-table.types';
import type { WorkflowTagUsage } from './tag/tag.types';
import type { VariableExportRequirement } from './variable/variable.types';
import type { NodeTypeSource } from './workflow/node-type-usage';

export interface WorkflowExportRequirements {
	credentials: CredentialExportRequirement[];
	dataTables: DataTableExportRequirement[];
	variables: VariableExportRequirement[];
	tags: WorkflowTagUsage[];
	/** Node lists from workflows and agents. The manifest contains each type/version pair once. */
	nodeTypes: NodeTypeSource[];
}

export const mergeRequirements = (
	...parts: Array<WorkflowExportRequirements | undefined>
): WorkflowExportRequirements => ({
	credentials: parts.flatMap((part) => part?.credentials ?? []),
	dataTables: parts.flatMap((part) => part?.dataTables ?? []),
	variables: parts.flatMap((part) => part?.variables ?? []),
	tags: parts.flatMap((part) => part?.tags ?? []),
	nodeTypes: parts.flatMap((part) => part?.nodeTypes ?? []),
});
