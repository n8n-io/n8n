import * as workflowsApi from '@/app/api/workflows';
import {
	DEFAULT_NEW_WORKFLOW_NAME,
	IN_PROGRESS_EXECUTION_ID,
	WorkflowStateKey,
} from '@/app/constants';
import {
	createDisplayedExecutionDataId,
	createExecutionDataId,
	useExecutionDataStore,
} from '@/app/stores/executionData.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	createWorkflowExecutionSessionId,
	useWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';
import { DEFAULT_SETTINGS } from '@/app/stores/workflowDocument/useWorkflowDocumentSettings';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowStateStore } from '@/app/stores/workflowState.store';
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

export function useWorkflowState() {
	const ws = useWorkflowsStore();
	const workflowStateStore = useWorkflowStateStore();
	const rootStore = useRootStore();

	////
	// Workflow editing state
	////

	function setWorkflowExecutionData(workflowResultData: IExecutionResponse | null) {
		const workflowId = ws.workflowId || workflowResultData?.workflowId || '';
		const workflowExecutionSession = useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId(workflowId),
		);

		if (!workflowResultData) {
			const activeExecutionId = workflowExecutionSession.activeExecutionId;
			if (activeExecutionId) {
				useExecutionDataStore(createExecutionDataId(activeExecutionId)).resetExecutionData();
			}
			workflowExecutionSession.setPendingExecution(null);
			workflowExecutionSession.clearDisplayedExecution();
			return;
		}

		if (workflowResultData.id === IN_PROGRESS_EXECUTION_ID) {
			workflowExecutionSession.setPendingExecution(workflowResultData);
			return;
		}

		const executionDataId = createDisplayedExecutionDataId(workflowResultData.id);
		useExecutionDataStore(executionDataId).setExecution(workflowResultData);
		workflowExecutionSession.setDisplayedExecutionId(executionDataId);
	}

	function setActiveExecutionId(id: string | null | undefined) {
		ws.private.setActiveExecutionId(id);
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
		const workflowExecutionSession = useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId(ws.workflowId),
		);
		const activeExecutionId = workflowExecutionSession.activeExecutionId;
		const execution = workflowExecutionSession.activeExecution;

		setActiveExecutionId(undefined);
		workflowStateStore.executingNode.clearNodeExecutionQueue();
		workflowExecutionSession.setExecutionWaitingForWebhook(false);
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(ws.workflow.id),
		);
		documentTitle.setDocumentTitle(workflowDocumentStore.name, 'IDLE');

		if (activeExecutionId) {
			useExecutionDataStore(createExecutionDataId(activeExecutionId)).clearExecutionStartedData();
		}

		clearPopupWindowState();

		if (!execution) return;

		const runData = execution.data?.resultData.runData ?? {};

		for (const nodeName in runData) {
			runData[nodeName] = runData[nodeName].filter(
				({ executionStatus }) => executionStatus === 'success',
			);
		}

		if (stopData) {
			execution.status = stopData.status;
			execution.startedAt = stopData.startedAt;
			execution.stoppedAt = stopData.stoppedAt;
		}

		if (activeExecutionId) {
			useExecutionDataStore(createExecutionDataId(activeExecutionId)).setExecution(execution);
		} else {
			workflowExecutionSession.setPendingExecution(execution);
		}
	}

	function resetState() {
		setWorkflowExecutionData(null);

		setActiveExecutionId(undefined);
		workflowStateStore.executingNode.executingNode.length = 0;
		useWorkflowExecutionSessionStore(
			createWorkflowExecutionSessionId(ws.workflowId),
		).setExecutionWaitingForWebhook(false);
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
