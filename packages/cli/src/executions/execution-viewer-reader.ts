import { ExecutionRedactionServiceProxy } from '@n8n/backend-services';
import type { IExecutionResponse, User } from '@n8n/db';
import { Container } from '@n8n/di';

import { ExecutionPersistence } from '@/executions/execution-persistence';

/**
 * Load an execution with its run data, redacted for `viewer` the same way the
 * executions API redacts it: the workflow redaction policy, dynamic
 * credentials, and credentials the viewer cannot use.
 *
 * This is the only place the Assistant may read execution data from. The
 * extractors take the loaded execution, so they cannot read raw data. The
 * caller must check that the viewer has `execution:read` on the workflow first.
 */
export async function loadExecutionForViewer(
	executionId: string,
	viewer: User,
): Promise<IExecutionResponse | undefined> {
	const execution = await Container.get(ExecutionPersistence).findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});
	if (!execution) return undefined;

	// Redacts in place. Never reveals: a reveal is an audited user action in the
	// editor, and the Assistant must not do it on the user's behalf.
	await Container.get(ExecutionRedactionServiceProxy).processExecution(execution, {
		user: viewer,
	});
	return execution;
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
