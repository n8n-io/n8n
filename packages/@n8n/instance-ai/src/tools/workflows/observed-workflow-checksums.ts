import type { InstanceAiContext } from '../../types';

/**
 * Checksum of the workflow state this conversation last observed, per workflow.
 *
 * `build-workflow` gets its optimistic-concurrency expectation from the source
 * file binding, but the plain `workflows(action="update")` path has no source
 * file to bind to. Without an expectation the agent overwrites whatever landed
 * in the meantime — a canvas autosave, another user's edit, another thread.
 */
const observedChecksums = new WeakMap<InstanceAiContext, Map<string, string>>();

function checksumsFor(context: InstanceAiContext): Map<string, string> {
	let checksums = observedChecksums.get(context);
	if (!checksums) {
		checksums = new Map();
		observedChecksums.set(context, checksums);
	}

	return checksums;
}

/** Records the workflow state this conversation has seen — a read or its own save. */
export function rememberObservedWorkflowChecksum(
	context: InstanceAiContext,
	workflowId: string,
	checksum: string | undefined,
): void {
	const checksums = checksumsFor(context);
	if (checksum === undefined) {
		// No checksum to pin to — drop the stale one rather than guarding against it.
		checksums.delete(workflowId);
		return;
	}

	checksums.set(workflowId, checksum);
}

/**
 * Records the workflow's current state for reads that hand the agent a graph to
 * edit but no checksum of their own (`get-json`). Best-effort: bookkeeping must
 * never fail the read it is attached to.
 */
export async function rememberCurrentWorkflowChecksum(
	context: InstanceAiContext,
	workflowId: string,
): Promise<void> {
	try {
		const detail = await context.workflowService.get(workflowId);
		rememberObservedWorkflowChecksum(context, workflowId, detail.checksum);
	} catch (error) {
		context.logger?.debug('Failed to record the observed workflow checksum', {
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export function getObservedWorkflowChecksum(
	context: InstanceAiContext,
	workflowId: string,
): string | undefined {
	return observedChecksums.get(context)?.get(workflowId);
}
