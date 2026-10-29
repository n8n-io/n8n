import { ExecutionRedactionServiceProxy } from '@n8n/backend-services';
import type { ExecutionEntity, IExecutionResponse, User } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { UnsavedManualExecutionService } from '@/execution-lifecycle/unsaved-manual-execution.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

/**
 * Load an execution with its run data, redacted for `viewer` the same way the
 * executions API redacts it: the workflow redaction policy, dynamic
 * credentials, and credentials the viewer cannot use.
 *
 * This is the only place the Assistant may read execution data from. The
 * extractors take the loaded execution, so they cannot read raw data. The
 * caller must check that the viewer has `execution:read` on the workflow first.
 *
 * A manual execution that n8n did not save is loaded only for the user who
 * started it, until pruning hard-deletes it. See {@link loadUnsavedManualExecution}.
 */
export async function loadExecutionForViewer(
	executionId: string,
	viewer: User,
): Promise<IExecutionResponse | undefined> {
	const execution =
		(await Container.get(ExecutionPersistence).findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		})) ?? (await loadUnsavedManualExecution(executionId, viewer));
	if (!execution) return undefined;

	// Redacts in place. Never reveals: a reveal is an audited user action in the
	// editor, and the Assistant must not do it on the user's behalf.
	await Container.get(ExecutionRedactionServiceProxy).processExecution(execution, {
		user: viewer,
	});
	return execution;
}

/**
 * A manual execution that n8n did not save, without its run data, if `viewer` started
 * it. Use it to check who may read the execution, and load its data with
 * {@link loadExecutionForViewer}.
 */
export async function findUnsavedManualExecutionForViewer(
	executionId: string,
	viewer: User,
): Promise<ExecutionEntity | null> {
	const isStarter = await Container.get(UnsavedManualExecutionService).isStarter(
		executionId,
		viewer.id,
	);
	if (!isStarter) return null;

	return await Container.get(ExecutionRepository).findUnsavedManualExecution(executionId);
}

/**
 * An unsaved manual execution that `viewer` started, with its run data. It also
 * checks that the viewer may still read executions of its workflow, because a
 * caller's earlier check may have passed while the execution was still saved.
 */
async function loadUnsavedManualExecution(
	executionId: string,
	viewer: User,
): Promise<IExecutionResponse | undefined> {
	const isStarter = await Container.get(UnsavedManualExecutionService).isStarter(
		executionId,
		viewer.id,
	);
	if (!isStarter) return undefined;

	const execution =
		await Container.get(ExecutionPersistence).findUnsavedManualExecution(executionId);
	if (!execution) return undefined;

	const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
		execution.workflowId,
		viewer,
		['execution:read'],
	);
	return workflow ? execution : undefined;
}

/**
 * Why the viewer gets redacted data and whether they can reveal it, or
 * `undefined` when the data is complete.
 */
export function getExecutionRedaction(
	execution: IExecutionResponse,
): { reason: string; canReveal: boolean } | undefined {
	const info = execution.data?.redactionInfo;
	return info?.isRedacted ? { reason: info.reason, canReveal: info.canReveal } : undefined;
}
