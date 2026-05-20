import * as workflowsApi from '@/app/api/workflows';
import { DEFAULT_NEW_WORKFLOW_NAME, WorkflowStateKey } from '@/app/constants';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { DEFAULT_SETTINGS } from '@/app/stores/workflowDocument/useWorkflowDocumentSettings';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowStateStore } from '@/app/stores/workflowState.store';
import {
	createWorkflowExecutionStateId,
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { isEmpty } from '@/app/utils/typesUtils';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import type {
	IExecutionResponse,
	IExecutionsStopData,
} from '@/features/execution/executions/executions.types';
import { clearPopupWindowState } from '@/features/execution/executions/executions.utils';
import type { INewWorkflowData } from '@/Interface';
import { useRootStore } from '@n8n/stores/useRootStore';
import { type IDataObject, type IWorkflowSettings } from 'n8n-workflow';
import { inject } from 'vue';
import { useDocumentTitle } from './useDocumentTitle';
import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';

export function useWorkflowState() {
	const ws = useWorkflowsStore();
	const workflowStateStore = useWorkflowStateStore();
	const rootStore = useRootStore();

	////
	// Workflow editing state
	////

	function setWorkflowExecutionData(workflowResultData: IExecutionResponse | null) {
		const stateStore = useWorkflowExecutionStateStore(
			createWorkflowExecutionStateId(ws.workflowId),
		);
		if (workflowResultData === null) {
			stateStore.setPendingExecution(null);
			stateStore.clearDisplayedExecution();
		} else if (workflowResultData.id === IN_PROGRESS_EXECUTION_ID) {
			stateStore.setPendingExecution(workflowResultData);
			stateStore.setActiveExecutionId(null);
			useExecutionDataStore(createExecutionDataId(IN_PROGRESS_EXECUTION_ID)).setExecution(
				workflowResultData,
			);
		} else {
			stateStore.trackExecutionId(workflowResultData.id);
			useExecutionDataStore(createExecutionDataId(workflowResultData.id)).setExecution(
				workflowResultData,
			);
			if (typeof stateStore.activeExecutionId !== 'string') {
				stateStore.setPendingExecution(null);
				stateStore.setActiveExecutionId(undefined);
				stateStore.setDisplayedExecutionId(workflowResultData.id);
			}
		}
	}

	function setActiveExecutionId(id: string | null | undefined) {
		useWorkflowExecutionStateStore(
			createWorkflowExecutionStateId(ws.workflowId),
		).setActiveExecutionId(id);
	}

	async function getNewWorkflowData(
		name?: string,
		projectId?: string,
		parentFolderId?: string,
	): Promise<INewWorkflowData> {
		let workflowData: { name: string; settings: IWorkflowSettings } = {
			name: '',
			settings: { ...DEFAULT_SETTINGS },
		};
		try {
			const data: IDataObject = {
				name,
				projectId,
				parentFolderId,
			};

			workflowData = await workflowsApi.getNewWorkflow(
				rootStore.restApiContext,
				isEmpty(data) ? undefined : data,
			);
		} catch (e) {
			// in case of error, default to original name
			workflowData.name = name || DEFAULT_NEW_WORKFLOW_NAME;
		}

		return workflowData;
	}

	////
	// Execution
	////

	const documentTitle = useDocumentTitle();

	function markExecutionAsStopped(stopData?: IExecutionsStopData) {
		const stateStore = useWorkflowExecutionStateStore(
			createWorkflowExecutionStateId(ws.workflowId),
		);
		const activeExecutionId = stateStore.activeExecutionId;

		stateStore.setActiveExecutionId(undefined);
		workflowStateStore.executingNode.clearNodeExecutionQueue();
		stateStore.setExecutionWaitingForWebhook(false);

		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(ws.workflowId));
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
				stateStore.applyStopDataToPendingExecution(stopData);
			}
		} else {
			// activeExecutionId === undefined: fall back to displayedExecutionId for the
			// stop-race-with-finished case where active was just cleared.
			const displayedExecutionId = stateStore.displayedExecutionId;
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
		const stateStore = useWorkflowExecutionStateStore(createWorkflowExecutionStateId(wid));
		// Disposes every tracked executionData store + IN_PROGRESS placeholder, then clears all
		// session-level fields.
		stateStore.resetExecutionState();
		// Then dispose the per-workflow state store so pinia state doesn't accumulate one entry
		// per workflow ever opened in this session.
		disposeWorkflowExecutionStateStore(stateStore);

		workflowStateStore.executingNode.executingNode.length = 0;
		useBuilderStore().resetManualExecutionStats();
	}

	return {
		// Workflow editing state
		resetState,
		setWorkflowExecutionData,
		setActiveExecutionId,
		getNewWorkflowData,

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
