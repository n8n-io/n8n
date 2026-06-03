import { WorkflowStateKey } from '@/app/constants';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowStateStore } from '@/app/stores/workflowState.store';
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
import { inject } from 'vue';
import { useDocumentTitle } from './useDocumentTitle';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';

export function useWorkflowState() {
	const ws = useWorkflowsStore();
	const workflowStateStore = useWorkflowStateStore();

	////
	// Workflow editing state
	////

	function setWorkflowExecutionData(workflowResultData: IExecutionResponse | null) {
		const workflowExecutionStateStore = useWorkflowExecutionStateStore(
			createWorkflowDocumentId(ws.workflowId),
		);
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
		useWorkflowExecutionStateStore(createWorkflowDocumentId(ws.workflowId)).setActiveExecutionId(
			id,
		);
	}

	////
	// Execution
	////

	const documentTitle = useDocumentTitle();

	function markExecutionAsStopped(stopData?: IExecutionsStopData) {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(ws.workflowId));
		const workflowExecutionStateStore = useWorkflowExecutionStateStore(
			workflowDocumentStore.documentId,
		);
		const activeExecutionId = workflowExecutionStateStore.activeExecutionId;

		workflowExecutionStateStore.setActiveExecutionId(undefined);
		workflowStateStore.executingNode.clearNodeExecutionQueue();
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
		const wid = ws.workflowId;
		if (!wid) {
			workflowStateStore.executingNode.executingNode.length = 0;
			useBuilderStore().resetManualExecutionStats();
			return;
		}
		const workflowExecutionStateStore = useWorkflowExecutionStateStore(
			createWorkflowDocumentId(wid),
		);
		// Disposes every tracked executionData store + IN_PROGRESS placeholder, then clears all
		// session-level fields.
		workflowExecutionStateStore.resetExecutionState();
		// Then dispose the per-workflow state store so pinia state doesn't accumulate one entry
		// per workflow ever opened in this session.
		disposeWorkflowExecutionStateStore(workflowExecutionStateStore);

		workflowStateStore.executingNode.executingNode.length = 0;
		useBuilderStore().resetManualExecutionStats();
	}

	return {
		// Workflow editing state
		resetState,
		setWorkflowExecutionData,
		setActiveExecutionId,

		// Execution
		markExecutionAsStopped,

		// reexport
		executingNode: workflowStateStore.executingNode,
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
