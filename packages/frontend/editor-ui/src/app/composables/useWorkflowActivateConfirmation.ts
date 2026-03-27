/**
 * Manages pending workflow activation confirmations.
 *
 * When publishing a workflow, the API may return success before the actual
 * webhook/trigger registration completes (multi-main mode). This module
 * bridges the publish flow with the push event handlers so the UI can
 * wait for real confirmation before showing a success dialog.
 */

const CONFIRMATION_TIMEOUT = 30_000; // 30 seconds

interface PendingConfirmation {
	resolve: (confirmed: boolean) => void;
	timeoutId: ReturnType<typeof setTimeout>;
}

const pendingConfirmations = new Map<string, PendingConfirmation>();

/**
 * Returns a promise that resolves to `true` when a `workflowActivated` push
 * event arrives, or `false` when a `workflowFailedToActivate` push event
 * arrives. Falls back to `true` after a timeout (e.g. if the push connection
 * drops).
 */
export function waitForActivationConfirmation(workflowId: string): Promise<boolean> {
	// Clean up any existing confirmation for this workflow
	const existing = pendingConfirmations.get(workflowId);
	if (existing) {
		clearTimeout(existing.timeoutId);
		pendingConfirmations.delete(workflowId);
	}

	return new Promise<boolean>((resolve) => {
		const timeoutId = setTimeout(() => {
			pendingConfirmations.delete(workflowId);
			resolve(true); // Assume success on timeout
		}, CONFIRMATION_TIMEOUT);

		pendingConfirmations.set(workflowId, { resolve, timeoutId });
	});
}

/**
 * Called by the `workflowActivated` push handler to confirm successful
 * activation.
 */
export function resolveActivationConfirmation(workflowId: string): boolean {
	const pending = pendingConfirmations.get(workflowId);
	if (pending) {
		clearTimeout(pending.timeoutId);
		pendingConfirmations.delete(workflowId);
		pending.resolve(true);
		return true;
	}
	return false;
}

/**
 * Called by the `workflowFailedToActivate` push handler to signal that
 * activation failed.
 */
export function rejectActivationConfirmation(workflowId: string): boolean {
	const pending = pendingConfirmations.get(workflowId);
	if (pending) {
		clearTimeout(pending.timeoutId);
		pendingConfirmations.delete(workflowId);
		pending.resolve(false);
		return true;
	}
	return false;
}
