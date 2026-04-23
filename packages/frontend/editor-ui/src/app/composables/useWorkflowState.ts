import * as workflowsApi from '@/app/api/workflows';
import { DEFAULT_NEW_WORKFLOW_NAME, WorkflowStateKey } from '@/app/constants';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { DEFAULT_SETTINGS } from '@/app/stores/workflowDocument/useWorkflowDocumentSettings';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowStateStore } from '@/app/stores/workflowState.store';
import { getPairedItemsMapping } from '@/app/utils/pairedItemUtils';
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
		if (workflowResultData?.data?.waitTill) {
			delete workflowResultData.data.resultData.runData[
				workflowResultData.data.resultData.lastNodeExecuted as string
			];
		}
		ws.workflowExecutionData = workflowResultData;
		ws.workflowExecutionPairedItemMappings = getPairedItemsMapping(workflowResultData);
		ws.workflowExecutionResultDataLastUpdate = Date.now();
		ws.workflowExecutionStartedData = undefined;
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
		setActiveExecutionId(undefined);
		workflowStateStore.executingNode.clearNodeExecutionQueue();
		ws.executionWaitingForWebhook = false;
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(ws.workflow.id),
		);
		documentTitle.setDocumentTitle(workflowDocumentStore.name, 'IDLE');
		ws.workflowExecutionStartedData = undefined;

		// TODO(ckolb): confirm this works across files?
		clearPopupWindowState();

		if (!ws.workflowExecutionData) {
			return;
		}

		const runData = ws.workflowExecutionData.data?.resultData.runData ?? {};

		for (const nodeName in runData) {
			runData[nodeName] = runData[nodeName].filter(
				({ executionStatus }) => executionStatus === 'success',
			);
		}

		if (stopData) {
			ws.workflowExecutionData.status = stopData.status;
			ws.workflowExecutionData.startedAt = stopData.startedAt;
			ws.workflowExecutionData.stoppedAt = stopData.stoppedAt;
		}
	}

	function resetState() {
		setWorkflowExecutionData(null);

		setActiveExecutionId(undefined);
		workflowStateStore.executingNode.executingNode.length = 0;
		ws.executionWaitingForWebhook = false;
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
