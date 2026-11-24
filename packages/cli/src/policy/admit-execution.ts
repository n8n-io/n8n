import { isEntityNotFoundError } from '@n8n/db';
import type { PolicyCleared } from '@n8n/decorators';
import type { IWorkflowBase, WorkflowExecuteMode, WorkflowExecutionSource } from 'n8n-workflow';

import type { OwnershipService } from '@/services/ownership.service';

import type { PolicyEnforcementService } from './policy-enforcement.service';

export type ExecutionToAdmit = {
	workflow: Pick<IWorkflowBase, 'id' | 'name'>;
	mode: WorkflowExecuteMode;
	source?: WorkflowExecutionSource;
	/** The owner project, when the caller knows it. An empty ID counts as unknown. */
	projectId?: string;
};

/**
 * Enforces the `executionAdmission` policy for an engine v1 run that has no execution row yet.
 * A refusal throws, so the caller must call this before it creates the row.
 *
 * Returns `undefined` when no check is registered, so an absent feature costs no project lookup.
 */
export async function admitExecution(
	policyEnforcementService: PolicyEnforcementService,
	ownershipService: OwnershipService,
	{ workflow, mode, source, projectId }: ExecutionToAdmit,
): Promise<PolicyCleared<'executionAdmission'> | undefined> {
	if (!policyEnforcementService.hasChecksFor('executionAdmission')) return undefined;

	return await policyEnforcementService.enforceExecutionAdmission(
		{
			artifact: { kind: 'workflow', id: workflow.id, name: workflow.name },
			projectId: projectId || (await findOwnerProjectId(ownershipService, workflow.id)),
			mode,
			source: source ?? null,
			engine: 'v1',
		},
		{ kind: 'system', reason: 'execution' },
	);
}

/** Null when the workflow has no owner project, for example an unsaved workflow. */
async function findOwnerProjectId(ownershipService: OwnershipService, workflowId: string) {
	if (!workflowId) return null;

	try {
		return (await ownershipService.getWorkflowProjectCached(workflowId)).id;
	} catch (error) {
		if (isEntityNotFoundError(error)) return null;
		throw error;
	}
}
