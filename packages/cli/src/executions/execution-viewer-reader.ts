import { ExecutionRedactionServiceProxy } from '@n8n/backend-services';
import type { ExecutionEntity, IExecutionBase, IExecutionResponse, User } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import { UnsavedManualExecutionService } from '@/execution-lifecycle/unsaved-manual-execution.service';
import { EngineV2ExecutionReader } from '@/executions/engine-v2-execution-reader.service';
import { type ExecutionIdV2, isExecutionIdV2 } from '@/executions/execution-id';
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
 *
 * An engine v2 execution comes from the data plane. The data plane cannot
 * authorize the read, so this function also checks `execution:read` for it.
 */
export async function loadExecutionForViewer(
	executionId: string,
	viewer: User,
): Promise<IExecutionResponse | undefined> {
	const execution = isExecutionIdV2(executionId)
		? await Container.get(EngineV2ExecutionReader).findOne(
				executionId,
				async (workflowId) => await canAccessWorkflow(workflowId, viewer, EXECUTION_READ_SCOPES),
			)
		: ((await Container.get(ExecutionPersistence).findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			})) ?? (await loadUnsavedManualExecution(executionId, viewer)));
	if (!execution) return undefined;

	return await redactForViewer(execution, viewer);
}

/**
 * The newest engine v2 execution of a workflow, with its run data, redacted for
 * `viewer`. The caller must check that the viewer has `execution:read` on the
 * workflow first.
 */
export async function loadLatestEngineV2ExecutionForViewer(
	workflowId: string,
	viewer: User,
): Promise<IExecutionResponse | undefined> {
	const execution = await Container.get(EngineV2ExecutionReader).findLatest({}, [workflowId]);
	if (!execution) return undefined;

	return await redactForViewer(execution, viewer);
}

/**
 * An engine v2 execution without its run data, if `viewer` has `scopes` on its
 * workflow. Use it to check who may read or stop the execution, and to read
 * its status.
 */
export async function loadEngineV2ExecutionMetadataForViewer(
	executionId: ExecutionIdV2,
	viewer: User,
	scopes: Scope[],
): Promise<IExecutionBase | undefined> {
	return await Container.get(EngineV2ExecutionReader).findOne(
		executionId,
		async (workflowId) => await canAccessWorkflow(workflowId, viewer, scopes),
		{ includeData: false },
	);
}

const EXECUTION_READ_SCOPES: Scope[] = ['workflow:read', 'execution:read'];

async function canAccessWorkflow(workflowId: string, viewer: User, scopes: Scope[]) {
	const workflow = await Container.get(WorkflowFinderService).findWorkflowForUser(
		workflowId,
		viewer,
		scopes,
	);
	return Boolean(workflow);
}

/**
 * Redacts in place. Never reveals: a reveal is an audited user action in the
 * editor, and the Assistant must not do it on the user's behalf.
 */
async function redactForViewer(execution: IExecutionResponse, viewer: User) {
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
