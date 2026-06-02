import { WorkflowStateKey } from '@/app/constants';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import type {
	IExecutionResponse,
	IExecutionsStopData,
} from '@/features/execution/executions/executions.types';
import { clearPopupWindowState } from '@/features/execution/executions/executions.utils';
import { hasInjectionContext, inject, toValue, type MaybeRefOrGetter } from 'vue';
import { useDocumentTitle } from './useDocumentTitle';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';

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

	////
	// Workflow editing state
	////

	function setWorkflowExecutionData(workflowResultData: IExecutionResponse | null) {
		const workflowExecutionStateStore = useWorkflowExecutionStateStore(resolveDocumentId());
		if (workflowResultData === null) {
			workflowExecutionStateStore.setPendingExecution(null);
			workflowExecutionStateStore.clearDisplayedExecution();
		} else if (workflowResultData.id === IN_PROGRESS_EXECUTION_ID) {
			workflowExecutionStateStore.setPendingExecution(workflowResultData);
			workflowExecutionStateStore.setActiveExecutionId(null);
			useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
				workflowResultData,
			);
		} else {
			workflowExecutionStateStore.trackExecutionId(workflowResultData.id);
			useExecutionDataStore(createExecutionDataId(workflowResultData.id)).setExecution(
				workflowResultData,
			);
			if (typeof workflowExecutionStateStore.activeExecutionId !== 'string') {
				workflowExecutionStateStore.setPendingExecution(null);
				workflowExecutionStateStore.setActiveExecutionId(undefined);
				workflowExecutionStateStore.setDisplayedExecutionId(workflowResultData.id);
			}
		}
	}

	function setActiveExecutionId(id: string | null | undefined) {
		useWorkflowExecutionStateStore(resolveDocumentId()).setActiveExecutionId(id);
	}

	////
	// Execution
	////

	const documentTitle = useDocumentTitle();

	function markExecutionAsStopped(stopData?: IExecutionsStopData) {
		const workflowDocumentStore = useWorkflowDocumentStore(resolveDocumentId());
		const workflowExecutionStateStore = useWorkflowExecutionStateStore(
			workflowDocumentStore.documentId,
		);
		const activeExecutionId = workflowExecutionStateStore.activeExecutionId;

		workflowExecutionStateStore.setActiveExecutionId(undefined);
		workflowExecutionStateStore.executingNode.clearNodeExecutionQueue();
		workflowExecutionStateStore.setExecutionWaitingForWebhook(false);

		documentTitle.setDocumentTitle(workflowDocumentStore.name, 'IDLE');

		if (typeof activeExecutionId === 'string') {
			const executionDataStore = useExecutionDataStore(createExecutionDataId(activeExecutionId));
			executionDataStore.clearExecutionStartedData();
			executionDataStore.markAsStopped(stopData);
		} else if (activeExecutionId === null) {
			// Pending scaffold: filter the IN_PROGRESS placeholder data and
			// mirror status onto the pendingExecution ref so the UI sees the canceled state.
			const executionDataStore = useExecutionDataStore(
				createExecutionDataId(IN_PROGRESS_EXECUTION_ID),
			);
			executionDataStore.clearExecutionStartedData();
			executionDataStore.markAsStopped(stopData);
			if (stopData) {
				workflowExecutionStateStore.applyStopDataToPendingExecution(stopData);
			}
		} else {
			// activeExecutionId === undefined: fall back to displayedExecutionId for the
			// stop-race-with-finished case where active was just cleared.
			const displayedExecutionId = workflowExecutionStateStore.displayedExecutionId;
			if (typeof displayedExecutionId === 'string') {
				const executionDataStore = useExecutionDataStore(
					createExecutionDataId(displayedExecutionId),
				);
				executionDataStore.clearExecutionStartedData();
				executionDataStore.markAsStopped(stopData);
			}
		}

		clearPopupWindowState();
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
		// Workflow editing state
		resetState,
		setWorkflowExecutionData,
		setActiveExecutionId,

		// Execution
		markExecutionAsStopped,
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
