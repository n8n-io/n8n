import { WorkflowStateKey } from '@/constants';
import type { IExecutionResponse } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getPairedItemsMapping } from '@/utils/pairedItemUtils';
import type { IWorkflowSettings } from 'n8n-workflow';
import { inject, ref } from 'vue';

export function useWorkflowState() {
	const ws = useWorkflowsStore();
	const uiStore = useUIStore();

	const isNewWorkflow = ref(true);

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

	function setWorkflowId(id: string) {
		ws.workflow.id = id;
		ws.workflowObject.id = ws.workflow.id;
	}

	function setWorkflowName(data: { newName: string; setStateDirty: boolean }) {
		ws.private.setWorkflowName(data);
	}

	function setWorkflowSettings(workflowSettings: IWorkflowSettings) {
		ws.private.setWorkflowSettings(workflowSettings);
	}

	function setWorkflowTagIds(tags: string[]) {
		ws.workflow.tags = tags;
	}

	function setActiveExecutionId(id: string | null | undefined) {
		ws.private.setActiveExecutionId(id);
	}

	function resetState() {
		removeAllConnections({ setStateDirty: false });
		removeAllNodes({ setStateDirty: false, removePinData: true });

		setWorkflowExecutionData(null);
		resetAllNodesIssues();

		setActive(ws.defaults.active);
		setWorkflowId('');
		setWorkflowName({ newName: '', setStateDirty: false });
		setWorkflowSettings({ ...ws.defaults.settings });
		setWorkflowTagIds([]);

		setActiveExecutionId(undefined);
		ws.executingNode.length = 0;
		ws.executionWaitingForWebhook = false;
	}

	return {
		isNewWorkflow,
		resetState,
		removeAllConnections,
		removeAllNodes,
		setWorkflowExecutionData,
		resetAllNodesIssues,
		setActive,
		setWorkflowId,
		setWorkflowName,
		setWorkflowSettings,
		setWorkflowTagIds,
		setActiveExecutionId,
	};
}

export type WorkflowState = ReturnType<typeof useWorkflowState>;

export function injectWorkflowState() {
	return inject(
		WorkflowStateKey,
		() => {
			console.error('Attempted to inject workflowState outside of NodeView tree');
			return useWorkflowState();
		},
		true,
	);
}
