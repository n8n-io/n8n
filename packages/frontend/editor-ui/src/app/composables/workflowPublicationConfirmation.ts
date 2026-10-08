/**
 * Tracks the intent to show the one-time "Workflow published" success modal
 * once a publication is confirmed.
 *
 * The publish API responds before triggers are actually registered (the
 * registration runs asynchronously, on the leader in multi-main setups).
 * Opening the success modal right after the API response can contradict a
 * `workflowFailedToActivate` push that arrives moments later. Instead, the
 * publish flow registers an intent here, and the `workflowActivated` push
 * handler consumes it once the publication really succeeded.
 *
 * The registry is module-level on purpose: the publish flow and the push
 * handlers run in unrelated component lifecycles, and the intent must only
 * exist in the browser tab that initiated the publish.
 */

/**
 * How long a pending intent stays valid before it is silently dropped.
 *
 * The backend applies a publication under an outbox lease
 * (N8N_WORKFLOW_PUBLICATION_OUTBOX_LEASE_SECONDS, default 2 minutes), and a
 * record whose lease expired is reclaimed and retried. Cover the default lease
 * plus one retry so a slow publication still gets its success modal; this is
 * only a cleanup safety net — the modal opens when the confirming push
 * arrives, not at this deadline.
 */
export const PENDING_ACTIVATION_MODAL_TIMEOUT = 5 * 60_000;

interface PendingActivationModal {
	activeVersionId: string;
	timeoutId: ReturnType<typeof setTimeout>;
}

const pendingActivationModalsByWorkflowId = new Map<string, PendingActivationModal>();

/**
 * Registers the intent to show the activation success modal for a workflow
 * once its publication is confirmed. Re-registering overwrites any previous
 * intent for the same workflow. The intent expires after
 * {@link PENDING_ACTIVATION_MODAL_TIMEOUT} so a slow or lost confirmation
 * cannot pop a stale modal much later.
 */
export function registerPendingActivationModal(workflowId: string, activeVersionId: string): void {
	clearPendingActivationModal(workflowId);

	const timeoutId = setTimeout(() => {
		pendingActivationModalsByWorkflowId.delete(workflowId);
	}, PENDING_ACTIVATION_MODAL_TIMEOUT);

	pendingActivationModalsByWorkflowId.set(workflowId, { activeVersionId, timeoutId });
}

/**
 * Consumes the pending intent for a workflow when the confirmed version
 * matches the one that was published. Returns whether the caller should show
 * the success modal. A version mismatch keeps the intent in place: it belongs
 * to a newer publish whose confirmation is still on its way.
 */
export function consumePendingActivationModal(
	workflowId: string,
	activeVersionId: string,
): boolean {
	const pending = pendingActivationModalsByWorkflowId.get(workflowId);
	if (pending?.activeVersionId !== activeVersionId) {
		return false;
	}

	clearTimeout(pending.timeoutId);
	pendingActivationModalsByWorkflowId.delete(workflowId);
	return true;
}

/**
 * Drops the pending intent for a workflow, e.g. because the publication
 * failed, was partial, or the workflow got unpublished in the meantime.
 */
export function clearPendingActivationModal(workflowId: string): void {
	const pending = pendingActivationModalsByWorkflowId.get(workflowId);
	if (pending) {
		clearTimeout(pending.timeoutId);
		pendingActivationModalsByWorkflowId.delete(workflowId);
	}
}
