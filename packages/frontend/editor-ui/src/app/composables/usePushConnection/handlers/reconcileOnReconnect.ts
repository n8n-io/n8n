import type { ExecutionStatus } from 'n8n-workflow';

import { getActiveExecutions } from '@/app/api/workflows';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { reconcileFinishedExecution } from './executionRecovered';
import type { PushHandlerOptions } from './types';

/**
 * Server-side statuses that still count as an in-flight run. If the execution
 * this document is tracking is not returned under one of these, it has reached
 * a terminal state on the server.
 */
const ACTIVE_EXECUTION_STATUSES: ExecutionStatus[] = ['new', 'running', 'waiting'];

/**
 * Reconciles the canvas execution state against server truth after a push
 * reconnect.
 *
 * If the client disconnects across the moment a run finishes (or a single
 * `executionFinished` frame is lost), that push is never delivered and the
 * canvas is stranded showing a running spinner. On reconnect we ask the server
 * which executions are still active for this workflow; if the one this document
 * is tracking is no longer among them, it finished while we were away, so we
 * re-fetch it and render the final state — which also clears the spinner.
 *
 * A run that is genuinely still executing server-side is left untouched, so
 * live execution rendering during a normal, uninterrupted run is unaffected.
 */
export async function reconcileExecutionStateOnReconnect(options: PushHandlerOptions) {
	const { documentId } = options;
	const rootStore = useRootStore();
	const executionStateStore = useWorkflowExecutionStateStore(documentId);
	const { activeExecutionId, workflowId } = executionStateStore;

	// Only a run tracked by a concrete backend id can strand. A pending run
	// (`null`, id not yet assigned) has nothing to query, and an idle document
	// (`undefined`) has nothing to reconcile.
	if (typeof activeExecutionId !== 'string' || !executionStateStore.isWorkflowRunning) {
		return;
	}

	let isStillActive: boolean;
	try {
		const activeExecutions = await getActiveExecutions(rootStore.restApiContext, {
			workflowId,
			status: ACTIVE_EXECUTION_STATUSES,
		});
		isStillActive = activeExecutions.some((execution) => execution.id === activeExecutionId);
	} catch {
		// Could not confirm server state; leave the canvas untouched rather than
		// risk clearing a genuinely running execution.
		return;
	}

	if (isStillActive) {
		return;
	}

	// A new run may have started while the request was in flight. Only reconcile
	// if this document is still tracking the same finished execution.
	if (executionStateStore.activeExecutionId !== activeExecutionId) {
		return;
	}

	await reconcileFinishedExecution(activeExecutionId, options);
}
