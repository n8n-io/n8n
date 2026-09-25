import { getCurrentScope, onScopeDispose } from 'vue';
import type { NodeGroupChangeEvent } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';

export interface UseNodeGroupsSubscriptionDeps {
	onNodeGroupsChange: (handler: (event: NodeGroupChangeEvent) => void) => { off: () => void };
	/** Reacts to individual group changes (SET / ADD / DELETE). */
	onChange: (event: NodeGroupChangeEvent) => void;
	/** Seeds state from the current document, on first bind and every rebind. */
	onRebind: () => void;
}

/**
 * Binds canvas group view state to the document's node groups: subscribes to
 * changes, seeds from the current groups, exposes `reinitialize()` for when a
 * persistent canvas swaps documents, and releases the subscription with the
 * surrounding scope so the handler doesn't outlive its owner.
 */
export function useNodeGroupsSubscription(deps: UseNodeGroupsSubscriptionDeps) {
	let subscription: { off: () => void } | undefined;

	function reinitialize() {
		subscription?.off();
		subscription = deps.onNodeGroupsChange(deps.onChange);
		deps.onRebind();
	}

	reinitialize();

	if (getCurrentScope()) {
		onScopeDispose(() => subscription?.off());
	}

	return { reinitialize };
}
