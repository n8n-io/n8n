import { PLACEHOLDER_EMPTY_WORKFLOW_ID, WorkflowHandleKey } from '@/constants';
import type { IExecutionResponse } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getPairedItemsMapping } from '@/utils/pairedItemUtils';
import { inject } from 'vue';

export function useWorkflowHandle() {
	const ws = useWorkflowsStore();
	const uiStore = useUIStore();

	function removeAllConnections(data: { setStateDirty: boolean }): void {
		if (data?.setStateDirty) {
			uiStore.stateIsDirty = true;
		}

		ws.workflow.connections = {};
		ws.workflowObject.setConnections({});
	}

	function removeAllNodes(data: { setStateDirty: boolean; removePinData: boolean }): void {
		if (data.setStateDirty) {
			uiStore.stateIsDirty = true;
		}

		if (data.removePinData) {
			ws.workflow.pinData = {};
		}

		ws.workflow.nodes.splice(0, ws.workflow.nodes.length);
		ws.workflowObject.setNodes(ws.workflow.nodes);
		ws.nodeMetadata = {};
	}

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

	function resetAllNodesIssues(): boolean {
		ws.workflow.nodes.forEach((node) => {
			node.issues = undefined;
		});
		return true;
	}

	function setActive(active: boolean) {
		ws.workflow.active = active;
	}

	function setWorkflowId(id?: string) {
		ws.workflow.id = !id || id === 'new' ? PLACEHOLDER_EMPTY_WORKFLOW_ID : id;
		ws.workflowObject.id = ws.workflow.id;
	}

	function setWorkflowName(data: { newName: string; setStateDirty: boolean }) {
		ws.setWorkflowName(data);
	}

	function resetState() {
		removeAllConnections({ setStateDirty: false });
		removeAllNodes({ setStateDirty: false, removePinData: true });

		setWorkflowExecutionData(null);
		resetAllNodesIssues();

		setActive(ws.defaults.active);
		setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
		setWorkflowName({ newName: '', setStateDirty: false });
		ws.setWorkflowSettings({ ...ws.defaults.settings });
		ws.setWorkflowTagIds([]);

		ws.setActiveExecutionId(undefined);
		ws.executingNode.length = 0;
		ws.executionWaitingForWebhook = false;
	}

	return {
		resetState,
		removeAllConnections,
		removeAllNodes,
		setWorkflowExecutionData,
		resetAllNodesIssues,
		setActive,
		setWorkflowId,
		setWorkflowName,
	};
}

export type WorkflowHandle = ReturnType<typeof useWorkflowHandle>;

export function injectWorkflowHandle() {
	return inject(
		WorkflowHandleKey,
		() => {
			console.error('Attempted to inject workflowHandle outside of NodeView tree');
			return useWorkflowHandle();
		},
		true,
	);
}
