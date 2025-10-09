import {
	DEFAULT_NEW_WORKFLOW_NAME,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	WorkflowStateKey,
} from '@/constants';
import type {
	IExecutionResponse,
	IExecutionsStopData,
	INewWorkflowData,
	INodeUi,
	IUpdateInformation,
} from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getPairedItemsMapping } from '@/utils/pairedItemUtils';
import {
	NodeHelpers,
	type IDataObject,
	type INodeParameters,
	type IWorkflowSettings,
} from 'n8n-workflow';
import { inject } from 'vue';
import * as workflowsApi from '@/api/workflows';
import { useRootStore } from '@n8n/stores/useRootStore';
import { isEmpty } from '@/utils/typesUtils';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectSharingData } from '@/types/projects.types';
import { clearPopupWindowState } from '@/utils/executionUtils';
import { useDocumentTitle } from './useDocumentTitle';
import { useWorkflowStateStore } from '@/stores/workflowState.store';
import { isObject } from '@/utils/objectUtils';
import findLast from 'lodash/findLast';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export function useWorkflowState() {
	const ws = useWorkflowsStore();
	const workflowStateStore = useWorkflowStateStore();
	const uiStore = useUIStore();
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();

	////
	// Workflow editing state
	////

	function setWorkflowName(data: { newName: string; setStateDirty: boolean }) {
		if (data.setStateDirty) {
			uiStore.stateIsDirty = true;
		}
		ws.workflow.name = data.newName;
		ws.workflowObject.name = data.newName;

		if (ws.workflow.id !== PLACEHOLDER_EMPTY_WORKFLOW_ID && ws.workflowsById[ws.workflow.id]) {
			ws.workflowsById[ws.workflow.id].name = data.newName;
		}
	}

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

	function setWorkflowSettings(workflowSettings: IWorkflowSettings) {
		ws.private.setWorkflowSettings(workflowSettings);
	}

	function setWorkflowTagIds(tags: string[]) {
		ws.workflow.tags = tags;
	}

	function setActiveExecutionId(id: string | null | undefined) {
		ws.private.setActiveExecutionId(id);
	}

	async function getNewWorkflowData(
		name?: string,
		projectId?: string,
		parentFolderId?: string,
	): Promise<INewWorkflowData> {
		let workflowData = {
			name: '',
			settings: { ...ws.defaults.settings },
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

		setWorkflowName({ newName: workflowData.name, setStateDirty: false });

		return workflowData;
	}

	function makeNewWorkflowShareable() {
		const { currentProject, personalProject } = useProjectsStore();
		const homeProject = currentProject ?? personalProject ?? {};
		const scopes = currentProject?.scopes ?? personalProject?.scopes ?? [];

		ws.workflow.homeProject = homeProject as ProjectSharingData;
		ws.workflow.scopes = scopes;
	}

	async function getNewWorkflowDataAndMakeShareable(
		name?: string,
		projectId?: string,
		parentFolderId?: string,
	): Promise<INewWorkflowData> {
		const workflowData = await getNewWorkflowData(name, projectId, parentFolderId);
		makeNewWorkflowShareable();
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
		documentTitle.setDocumentTitle(ws.workflowName, 'IDLE');
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
		removeAllConnections({ setStateDirty: false });
		removeAllNodes({ setStateDirty: false, removePinData: true });

		setWorkflowExecutionData(null);
		resetAllNodesIssues();

		setActive(ws.defaults.active);
		setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
		setWorkflowName({ newName: '', setStateDirty: false });
		setWorkflowSettings({ ...ws.defaults.settings });
		setWorkflowTagIds([]);

		setActiveExecutionId(undefined);
		workflowStateStore.executingNode.executingNode.length = 0;
		ws.executionWaitingForWebhook = false;
	}

	////
	// Node modification
	////

	function setNodeParameters(updateInformation: IUpdateInformation, append?: boolean): void {
		// Find the node that should be updated
		const nodeIndex = ws.workflow.nodes.findIndex((node) => {
			return node.name === updateInformation.name;
		});

		if (nodeIndex === -1) {
			throw new Error(
				`Node with the name "${updateInformation.name}" could not be found to set parameter.`,
			);
		}

		const { name, parameters } = ws.workflow.nodes[nodeIndex];

		const newParameters =
			!!append && isObject(updateInformation.value)
				? { ...parameters, ...updateInformation.value }
				: updateInformation.value;

		const changed = ws.updateNodeAtIndex(nodeIndex, {
			parameters: newParameters as INodeParameters,
		});

		if (changed) {
			uiStore.stateIsDirty = true;
			ws.nodeMetadata[name].parametersLastUpdatedAt = Date.now();
		}
	}

	function setLastNodeParameters(updateInformation: IUpdateInformation): void {
		const latestNode = findLast(
			ws.workflow.nodes,
			(node) => node.type === updateInformation.key,
		) as INodeUi;
		const nodeType = nodeTypesStore.getNodeType(latestNode.type);
		if (!nodeType) return;

		const nodeParams = NodeHelpers.getNodeParameters(
			nodeType.properties,
			updateInformation.value as INodeParameters,
			true,
			false,
			latestNode,
			nodeType,
		);

		if (latestNode) {
			setNodeParameters({ value: nodeParams, name: latestNode.name }, true);
		}
	}

	return {
		// Workflow editing state
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
		getNewWorkflowDataAndMakeShareable,

		// Execution
		markExecutionAsStopped,

		// Node modification
		setNodeParameters,
		setLastNodeParameters,

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
