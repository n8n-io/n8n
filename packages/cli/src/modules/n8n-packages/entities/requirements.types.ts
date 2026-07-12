import type { WorkflowCredentialRequirement } from './credential/credential.types';
import type { WorkflowVariableRequirement } from './variable/variable.types';

export interface WorkflowExportRequirements {
	credentials: WorkflowCredentialRequirement[];
	variables: WorkflowVariableRequirement[];
}

export const mergeRequirements = (
	...parts: Array<WorkflowExportRequirements | undefined>
): WorkflowExportRequirements => ({
	credentials: parts.flatMap((part) => part?.credentials ?? []),
	variables: parts.flatMap((part) => part?.variables ?? []),
});
