import type { WorkflowCredentialRequirement } from './credential/credential.types';

export interface WorkflowExportRequirements {
	credentials: WorkflowCredentialRequirement[];
}

export const mergeRequirements = (
	...parts: Array<WorkflowExportRequirements | undefined>
): WorkflowExportRequirements => ({
	credentials: parts.flatMap((part) => part?.credentials ?? []),
});
