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
	activeVersionId: string;
}

const pendingConfirmations = new Map<string, PendingConfirmation>();

/**
 * Returns a promise that resolves to `true` when a `workflowActivated` push
 * event arrives for the expected version, or `false` when a
 * `workflowFailedToActivate` push event arrives or the timeout expires
 * without confirmation.
 */
export async function waitForActivationConfirmation(
	workflowId: string,
	activeVersionId: string,
): Promise<boolean> {
	// Clean up any existing confirmation for this workflow
	const existing = pendingConfirmations.get(workflowId);
	if (existing) {
		clearTimeout(existing.timeoutId);
		pendingConfirmations.delete(workflowId);
	}

	return await new Promise<boolean>((resolve) => {
		const timeoutId = setTimeout(() => {
			pendingConfirmations.delete(workflowId);
			resolve(false); // Don't show false success if push event never arrives
		}, CONFIRMATION_TIMEOUT);

		pendingConfirmations.set(workflowId, { resolve, timeoutId, activeVersionId });
	});
}

/**
 * Called by the `workflowActivated` push handler to confirm successful
 * activation. Only resolves if the activeVersionId matches the one being
 * published, preventing stale events from falsely completing the flow.
 */
export function resolveActivationConfirmation(
	workflowId: string,
	activeVersionId: string,
): boolean {
	const pending = pendingConfirmations.get(workflowId);
	if (pending && pending.activeVersionId === activeVersionId) {
		clearTimeout(pending.timeoutId);
		pendingConfirmations.delete(workflowId);
		pending.resolve(true);
		return true;
	}
	return false;
}

/**
 * Cancels a pending confirmation without resolving or rejecting it.
 * Used when the API call itself fails and no push event will arrive.
 */
export function cancelActivationConfirmation(workflowId: string): void {
	const pending = pendingConfirmations.get(workflowId);
	if (pending) {
		clearTimeout(pending.timeoutId);
		pendingConfirmations.delete(workflowId);
	}
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
