import { PLACEHOLDER_EMPTY_WORKFLOW_ID, WorkflowHandleKey } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
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

	function resetState() {
		removeAllConnections({ setStateDirty: false });
		removeAllNodes({ setStateDirty: false, removePinData: true });

		ws.setWorkflowExecutionData(null);
		ws.resetAllNodesIssues();

		ws.setActive(ws.defaults.active);
		ws.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
		ws.setWorkflowName({ newName: '', setStateDirty: false });
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
	};
}

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
