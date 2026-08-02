import type { ExecutionStore } from './execution-store';
import type { StepStore } from './step-store';

/**
 * Records the execution's outcome once no step is left to run: `failed` if any
 * step failed, `completed` otherwise. A no-op while work is still outstanding.
 *
 * Shared by every handler that can leave an execution with nothing planned —
 * both the one that plans the first steps and the one that plans the rest — since
 * whichever of them runs last is the one that has to notice.
 *
 * TODO(CAT-3910): "nothing queued or running" has a false-empty window — a step
 * can be completed while its successors are not yet planned — so a concurrent
 * handler can finish the execution early. Unreachable while the queue dispatches
 * sequentially.
 */
export async function finishExecutionIfDone(
	executionStore: ExecutionStore,
	stepStore: StepStore,
	executionId: string,
): Promise<void> {
	if (await stepStore.hasActiveSteps(executionId)) return;

	const failed = await stepStore.hasFailedSteps(executionId);
	await executionStore.finishExecution(executionId, failed ? 'failed' : 'completed');
}
