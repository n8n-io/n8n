import { WorkflowStateKey } from '@/app/constants';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { hasInjectionContext, inject, toValue, type MaybeRefOrGetter } from 'vue';

export interface UseWorkflowStateOptions {
	/**
	 * Binds this instance's execution-state writes to a specific workflow
	 * document. Pass this when the caller owns a document that isn't the
	 * globally-current one (e.g. `WorkflowCanvasHost`, which provides its own
	 * `WorkflowIdKey` in the same setup and so can't inject it back) or when
	 * running outside a component tree (async push handlers).
	 */
	documentId?: MaybeRefOrGetter<WorkflowDocumentId>;
}

export function useWorkflowState(options: UseWorkflowStateOptions = {}) {
	const ws = useWorkflowsStore();

	// Resolve the scoped workflow id once at setup time — `inject` must run in an
	// injection context. An explicit `documentId` always wins; otherwise prefer
	// the per-document `WorkflowIdKey` provided by a host, falling back to the
	// global current workflow for legacy callers outside a host tree.
	const injectedWorkflowId =
		!options.documentId && hasInjectionContext() ? inject(WorkflowIdKey, null) : null;

	function resolveWorkflowId(): string {
		if (options.documentId) {
			const [workflowId] = toValue(options.documentId).split('@');
			return workflowId;
		}
		return injectedWorkflowId ? toValue(injectedWorkflowId) : ws.workflowId;
	}

	function resolveDocumentId(): WorkflowDocumentId {
		if (options.documentId) return toValue(options.documentId);
		return createWorkflowDocumentId(resolveWorkflowId());
	}

	function resetState() {
		const wid = resolveWorkflowId();
		if (!wid) {
			useBuilderStore().resetManualExecutionStats();
			return;
		}
		const workflowExecutionStateStore = useWorkflowExecutionStateStore(resolveDocumentId());
		// Disposes every tracked executionData store + IN_PROGRESS placeholder, then clears all
		// session-level fields (including the executing-node queue).
		workflowExecutionStateStore.resetExecutionState();
		// Then dispose the per-workflow state store so pinia state doesn't accumulate one entry
		// per workflow ever opened in this session.
		disposeWorkflowExecutionStateStore(workflowExecutionStateStore);

		useBuilderStore().resetManualExecutionStats();
	}

	return {
		resetState,
	};
}

export type WorkflowState = ReturnType<typeof useWorkflowState>;

export function injectWorkflowState() {
	return inject(
		WorkflowStateKey,
		() => {
			// While we're migrating we're happy to fall back onto a separate instance since
			// all data is still stored in the workflowsStore
			// Once we're ready to move the actual refs to `useWorkflowState` we should error here
			// to track down remaining usages that would break
			// console.error('Attempted to inject workflowState outside of NodeView tree');
			return useWorkflowState();
		},
		true,
	);
}
