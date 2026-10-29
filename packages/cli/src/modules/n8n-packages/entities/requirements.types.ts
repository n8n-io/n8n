import type { CredentialRequirement } from './credential/credential.types';
import type { DataTableRequirement } from './data-table/data-table.types';
import type { WorkflowTagUsage } from './tag/tag.types';
import type { VariableRequirement } from './variable/variable.types';
import type { NodeTypeSource } from './workflow/node-type-usage';

export interface ExportRequirements {
	credentials: CredentialRequirement[];
	dataTables: DataTableRequirement[];
	variables: VariableRequirement[];
	tags: WorkflowTagUsage[];
	/** Node lists are folded into unique pairs when the manifest is assembled. */
	nodeTypes: NodeTypeSource[];
}

export const mergeRequirements = (
	...parts: Array<ExportRequirements | undefined>
): ExportRequirements => ({
	credentials: parts.flatMap((part) => part?.credentials ?? []),
	dataTables: parts.flatMap((part) => part?.dataTables ?? []),
	variables: parts.flatMap((part) => part?.variables ?? []),
	tags: parts.flatMap((part) => part?.tags ?? []),
	nodeTypes: parts.flatMap((part) => part?.nodeTypes ?? []),
});
