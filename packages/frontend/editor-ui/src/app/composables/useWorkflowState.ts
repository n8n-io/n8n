import * as workflowsApi from '@/app/api/workflows';
import {
	DEFAULT_NEW_WORKFLOW_NAME,
	IN_PROGRESS_EXECUTION_ID,
	VIEWS,
	WorkflowStateKey,
} from '@/app/constants';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionSessionStore } from '@/app/stores/workflowExecutionSession.store';
import {
	disposeExecutionDataStore,
	getActiveExecutionDataStore,
	useExecutionDataStore,
} from '@/app/stores/executionData.store';
import { DEFAULT_SETTINGS } from '@/app/stores/workflowDocument/useWorkflowDocumentSettings';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowStateStore } from '@/app/stores/workflowState.store';
import { isEmpty } from '@/app/utils/typesUtils';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type {
	IExecutionResponse,
	IExecutionsStopData,
} from '@/features/execution/executions/executions.types';
import { clearPopupWindowState } from '@/features/execution/executions/executions.utils';
import type { INewWorkflowData } from '@/Interface';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { type IDataObject, type IWorkflowSettings } from 'n8n-workflow';
import { getCurrentInstance, inject } from 'vue';
import { useRoute } from 'vue-router';
import { useDocumentTitle } from './useDocumentTitle';

export function useWorkflowState() {
	const ws = useWorkflowsStore();
	const workflowStateStore = useWorkflowStateStore();
	const rootStore = useRootStore();
	const route = getCurrentInstance() ? useRoute() : null;
	const uiStore = useUIStore();
	const sourceControlStore = useSourceControlStore();
	const documentTitle = useDocumentTitle();

	function getCurrentWorkflowId() {
		if (ws.workflowId) {
			return ws.workflowId;
		}

		if (!route) {
			return '';
		}

		if (route.name === VIEWS.DEMO || route.name === VIEWS.DEMO_DIFF) {
			return 'demo';
		}

		const workflowId = route.params.name;
		return (Array.isArray(workflowId) ? workflowId[0] : workflowId) ?? '';
	}

	function getCurrentWorkflowDocumentStore() {
		const workflowId = getCurrentWorkflowId();
		if (!workflowId) {
			return null;
		}

		return useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
	}

	function getCurrentWorkflowExecutionSessionStore() {
		const workflowId = getCurrentWorkflowId();
		if (!workflowId) {
			return null;
		}

		return useWorkflowExecutionSessionStore(workflowId);
	}

	////
	// Workflow editing state
	////

	function setExecution(execution: IExecutionResponse | null) {
		const workflowExecutionSessionStore = getCurrentWorkflowExecutionSessionStore();
		if (!workflowExecutionSessionStore) {
			return;
		}

		if (execution?.data?.waitTill) {
			delete execution.data.resultData.runData[
				execution.data.resultData.lastNodeExecuted as string
			];
		}

		if (!execution) {
			getActiveExecutionDataStore(workflowExecutionSessionStore)?.setExecution(null);
			return;
		}

		useExecutionDataStore(execution.id).setExecution(execution);
	}

	function setActiveExecutionId(id: string | null | undefined) {
		const workflowExecutionSessionStore = getCurrentWorkflowExecutionSessionStore();
		if (!workflowExecutionSessionStore) {
			return;
		}

		if (id && workflowExecutionSessionStore.activeExecutionId === null) {
			const inProgressExecutionStore = useExecutionDataStore(IN_PROGRESS_EXECUTION_ID);
			const executionDataStore = useExecutionDataStore(id);

			if (inProgressExecutionStore.execution && !executionDataStore.execution) {
				executionDataStore.setExecution({
					...inProgressExecutionStore.execution,
					id,
				});
				disposeExecutionDataStore(IN_PROGRESS_EXECUTION_ID);
			}
		}

		workflowExecutionSessionStore.setActiveExecutionId(id);
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

	function markExecutionAsStopped(stopData?: IExecutionsStopData) {
		workflowStateStore.executingNode.clearNodeExecutionQueue();
		const workflowDocumentStore = getCurrentWorkflowDocumentStore();
		if (!workflowDocumentStore) {
			clearPopupWindowState();
			return;
		}

		const workflowExecutionSessionStore = getCurrentWorkflowExecutionSessionStore();
		workflowExecutionSessionStore?.setExecutionWaitingForWebhook(false);
		documentTitle.setDocumentTitle(workflowDocumentStore.name, 'IDLE');
		const executionDataStore = workflowExecutionSessionStore
			? getActiveExecutionDataStore(workflowExecutionSessionStore)
			: null;
		executionDataStore?.clearExecutionStartedData();

		clearPopupWindowState();

		const currentExecution = executionDataStore?.execution;
		setActiveExecutionId(undefined);
		if (!currentExecution) {
			return;
		}

		const runData = currentExecution.data?.resultData.runData ?? {};

		for (const nodeName in runData) {
			runData[nodeName] = runData[nodeName].filter(
				({ executionStatus }) => executionStatus === 'success',
			);
		}

		const nextExecution: IExecutionResponse = {
			...currentExecution,
			data: currentExecution.data,
		};

		if (stopData) {
			nextExecution.status = stopData.status;
			nextExecution.startedAt = stopData.startedAt;
			nextExecution.stoppedAt = stopData.stoppedAt;
		}

		useExecutionDataStore(nextExecution.id).setExecution(nextExecution);
	}

	function resetState() {
		setExecution(null);
		setActiveExecutionId(undefined);
		workflowStateStore.executingNode.executingNode.length = 0;
		getCurrentWorkflowExecutionSessionStore()?.setExecutionWaitingForWebhook(false);
		useBuilderStore().resetManualExecutionStats();
	}

	async function fetchLastSuccessfulExecution() {
		const workflowId = ws.workflow.id;
		const workflowDocumentStore = getCurrentWorkflowDocumentStore();
		const workflowExecutionSessionStore = getCurrentWorkflowExecutionSessionStore();
		if (!workflowId || !workflowDocumentStore || !workflowExecutionSessionStore) {
			return;
		}

		const workflowPermissions = getResourcePermissions(workflowDocumentStore.scopes).workflow;

		try {
			if (
				ws.isNewWorkflow ||
				sourceControlStore.preferences.branchReadOnly ||
				uiStore.isReadOnlyView ||
				!workflowPermissions.update ||
				workflowDocumentStore.isArchived
			) {
				return;
			}

			const lastSuccessfulExecution = await workflowsApi.getLastSuccessfulExecution(
				rootStore.restApiContext,
				workflowId,
			);
			workflowExecutionSessionStore.setLastSuccessfulExecution(lastSuccessfulExecution);
		} catch {}
	}

	return {
		// Workflow editing state
		resetState,
		setExecution,
		setActiveExecutionId,
		getNewWorkflowData,
		fetchLastSuccessfulExecution,
		getCurrentWorkflowDocumentStore,
		getCurrentWorkflowExecutionSessionStore,

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
			return useWorkflowState();
		},
		true,
	);
}
