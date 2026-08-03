import type { WorkflowCredentialRequirement } from './credential/credential.types';
import type { WorkflowDataTableRequirement } from './data-table/data-table.types';
import type { WorkflowTagUsage } from './tag/tag.types';
import type { WorkflowVariableRequirement } from './variable/variable.types';
import type { WorkflowNodeTypeSource } from './workflow/node-type-usage';

export interface WorkflowExportRequirements {
	credentials: WorkflowCredentialRequirement[];
	dataTables: WorkflowDataTableRequirement[];
	variables: WorkflowVariableRequirement[];
<<<<<<< HEAD
=======
	tags: WorkflowTagUsage[];
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
	/** Per-workflow node lists; folded into unique pairs at manifest-assembly time. */
	nodeTypes: WorkflowNodeTypeSource[];
}

export const mergeRequirements = (
	...parts: Array<WorkflowExportRequirements | undefined>
): WorkflowExportRequirements => ({
	credentials: parts.flatMap((part) => part?.credentials ?? []),
	dataTables: parts.flatMap((part) => part?.dataTables ?? []),
	variables: parts.flatMap((part) => part?.variables ?? []),
<<<<<<< HEAD
=======
	tags: parts.flatMap((part) => part?.tags ?? []),
>>>>>>> 891dba318100e072fc55bba909ef6b316f78abcf
	nodeTypes: parts.flatMap((part) => part?.nodeTypes ?? []),
});
