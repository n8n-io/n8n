import { DEFAULT_NEW_WORKFLOW_NAME, WorkflowStateKey } from '@/app/constants';
import type {
	INewWorkflowData,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
	IWorkflowDb,
} from '@/Interface';
import type {
	IExecutionResponse,
	IExecutionsStopData,
} from '@/features/execution/executions/executions.types';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { getPairedItemsMapping } from '@/app/utils/pairedItemUtils';
import {
	type INodeIssueData,
	type INodeIssueObjectProperty,
	NodeHelpers,
	type IDataObject,
	type INodeParameters,
	type IWorkflowSettings,
	type IPinData,
} from 'n8n-workflow';
import { inject } from 'vue';
import * as workflowsApi from '@/app/api/workflows';
import { useRootStore } from '@n8n/stores/useRootStore';
import { isEmpty, isJsonKeyObject } from '@/app/utils/typesUtils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { clearPopupWindowState } from '@/features/execution/executions/executions.utils';
import { useDocumentTitle } from './useDocumentTitle';
import { useWorkflowStateStore } from '@/app/stores/workflowState.store';
import { isObject } from '@/app/utils/objectUtils';
import findLast from 'lodash/findLast';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import { createEventBus } from '@n8n/utils/event-bus';
import type { WorkflowMetadata } from '@n8n/rest-api-client';
import { dataPinningEventBus } from '../event-bus';

export type WorkflowStateBusEvents = {
	updateNodeProperties: [WorkflowState, INodeUpdatePropertiesInformation];
};

export const workflowStateEventBus = createEventBus<WorkflowStateBusEvents>();

export function useWorkflowState() {
	const ws = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const workflowStateStore = useWorkflowStateStore();
	const uiStore = useUIStore();
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();

	////
	// Workflow editing state
	////

	function setWorkflowName(data: { newName: string; setStateDirty: boolean }) {
		if (data.setStateDirty) {
			uiStore.markStateDirty();
		}
		ws.workflow.name = data.newName;
		ws.workflowObject.name = data.newName;

		if (ws.workflow.id && workflowsListStore.workflowsById[ws.workflow.id]) {
			workflowsListStore.workflowsById[ws.workflow.id].name = data.newName;
		}
	}

	function removeAllConnections(data: { setStateDirty: boolean }): void {
		if (data?.setStateDirty) {
			uiStore.markStateDirty();
		}

		ws.workflow.connections = {};
		ws.workflowObject.setConnections({});
	}

	function removeAllNodes(data: { setStateDirty: boolean; removePinData: boolean }): void {
		if (data.setStateDirty) {
			uiStore.markStateDirty();
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

	function setActive(activeVersionId: string | null) {
		ws.workflow.active = activeVersionId !== null;
		ws.workflow.activeVersionId = activeVersionId;
	}

	function setWorkflowId(id?: string) {
		// Set the workflow ID directly, or empty string if not provided
		ws.workflow.id = id || '';
		ws.workflowObject.id = ws.workflow.id;
	}

	function setWorkflowSettings(workflowSettings: IWorkflowSettings) {
		ws.private.setWorkflowSettings(workflowSettings);
	}

	function setWorkflowTagIds(tags: string[]) {
		ws.workflow.tags = tags;
	}

	function setWorkflowProperty<K extends keyof IWorkflowDb>(key: K, value: IWorkflowDb[K]) {
		ws.workflow[key] = value;
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

	function addWorkflowTagIds(tags: string[]) {
		ws.workflow.tags = [...new Set([...(ws.workflow.tags ?? []), ...tags])] as IWorkflowDb['tags'];
	}

	function removeWorkflowTagId(tagId: string) {
		const tags = ws.workflow.tags as string[];
		const updated = tags.filter((id: string) => id !== tagId);
		ws.workflow.tags = updated as IWorkflowDb['tags'];
	}

	function setWorkflowScopes(scopes: IWorkflowDb['scopes']): void {
		ws.workflow.scopes = scopes;
	}

	function setWorkflowMetadata(metadata: WorkflowMetadata | undefined): void {
		ws.workflow.meta = metadata;
	}

	function addToWorkflowMetadata(data: Partial<WorkflowMetadata>): void {
		ws.workflow.meta = {
			...ws.workflow.meta,
			...data,
		};
	}

	function setWorkflowPinData(data: IPinData = {}) {
		const validPinData = Object.keys(data).reduce((accu, nodeName) => {
			accu[nodeName] = data[nodeName].map((item) => {
				if (!isJsonKeyObject(item)) {
					return { json: item };
				}

				return item;
			});

			return accu;
		}, {} as IPinData);

		ws.workflow.pinData = validPinData;
		ws.workflowObject.setPinData(validPinData);

		dataPinningEventBus.emit('pin-data', validPinData);
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

		setActive(ws.defaults.activeVersionId);
		setWorkflowId('');
		setWorkflowName({ newName: '', setStateDirty: false });
		setWorkflowSettings({ ...ws.defaults.settings });
		setWorkflowTagIds([]);

		setActiveExecutionId(undefined);
		workflowStateStore.executingNode.executingNode.length = 0;
		ws.executionWaitingForWebhook = false;
		useBuilderStore().resetManualExecutionStats();
	}

	////
	// Node modification
	////

	/**
	 * @returns `true` if the object was changed
	 */
	function updateNodeAtIndex(nodeIndex: number, nodeData: Partial<INodeUi>): boolean {
		if (nodeIndex !== -1) {
			const node = ws.workflow.nodes[nodeIndex];
			const existingData = pick<Partial<INodeUi>>(node, Object.keys(nodeData));
			const changed = !isEqual(existingData, nodeData);

			if (changed) {
				Object.assign(node, nodeData);
				ws.workflow.nodes[nodeIndex] = node;
				ws.workflowObject.setNodes(ws.workflow.nodes);
			}

			return changed;
		}
		return false;
	}

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

		const changed = updateNodeAtIndex(nodeIndex, {
			parameters: newParameters as INodeParameters,
		});

		if (changed) {
			uiStore.markStateDirty();
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

	function setNodeValue(updateInformation: IUpdateInformation): void {
		// Find the node that should be updated
		const nodeIndex = ws.workflow.nodes.findIndex((node) => {
			return node.name === updateInformation.name;
		});

		if (nodeIndex === -1 || !updateInformation.key) {
			throw new Error(
				`Node with the name "${updateInformation.name}" could not be found to set parameter.`,
			);
		}

		const changed = updateNodeAtIndex(nodeIndex, {
			[updateInformation.key]: updateInformation.value,
		});

		if (changed) {
			uiStore.markStateDirty();
		}

		const excludeKeys = ['position', 'notes', 'notesInFlow'];

		if (changed && !excludeKeys.includes(updateInformation.key)) {
			ws.nodeMetadata[ws.workflow.nodes[nodeIndex].name].parametersLastUpdatedAt = Date.now();
		}
	}

	function setNodePositionById(id: string, position: INodeUi['position']): void {
		const node = ws.workflow.nodes.find((n) => n.id === id);
		if (!node) return;

		setNodeValue({ name: node.name, key: 'position', value: position });
	}

	/**
	 * Update node by ID. Finds the node by ID and updates it with the provided data.
	 * @returns `true` if the node was found and updated
	 */
	function updateNodeById(nodeId: string, nodeData: Partial<INodeUi>): boolean {
		const nodeIndex = ws.workflow.nodes.findIndex((node) => node.id === nodeId);
		if (nodeIndex === -1) return false;
		return updateNodeAtIndex(nodeIndex, nodeData);
	}

	/**
	 * Reset parametersLastUpdatedAt to current timestamp for a node.
	 * Used to mark a node as "dirty" when its parameters change.
	 */
	function resetParametersLastUpdatedAt(nodeName: string): void {
		if (!ws.nodeMetadata[nodeName]) {
			ws.nodeMetadata[nodeName] = { pristine: true };
		}
		ws.nodeMetadata[nodeName].parametersLastUpdatedAt = Date.now();
	}

	function updateNodeProperties(
		this: WorkflowState,
		updateInformation: INodeUpdatePropertiesInformation,
	): void {
		// Find the node that should be updated
		const nodeIndex = ws.workflow.nodes.findIndex((node) => {
			return node.name === updateInformation.name;
		});

		if (nodeIndex !== -1) {
			for (const key of Object.keys(updateInformation.properties)) {
				const typedKey = key as keyof INodeUpdatePropertiesInformation['properties'];
				const property = updateInformation.properties[typedKey];

				const changed = updateNodeAtIndex(nodeIndex, { [key]: property });

				if (changed) {
					uiStore.markStateDirty();
				}
			}
		}

		workflowStateEventBus.emit('updateNodeProperties', [this, updateInformation]);
	}

	function setNodeIssue(nodeIssueData: INodeIssueData): void {
		const nodeIndex = ws.workflow.nodes.findIndex((node) => {
			return node.name === nodeIssueData.node;
		});
		if (nodeIndex === -1) {
			return;
		}

		const node = ws.workflow.nodes[nodeIndex];

		if (nodeIssueData.value === null) {
			// Remove the value if one exists
			if (node.issues?.[nodeIssueData.type] === undefined) {
				// No values for type exist so nothing has to get removed
				return;
			}

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { [nodeIssueData.type]: _removedNodeIssue, ...remainingNodeIssues } = node.issues;
			updateNodeAtIndex(nodeIndex, {
				issues: remainingNodeIssues,
			});
		} else {
			updateNodeAtIndex(nodeIndex, {
				issues: {
					...node.issues,
					[nodeIssueData.type]: nodeIssueData.value as INodeIssueObjectProperty,
				},
			});
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
		setWorkflowProperty,
		setActiveExecutionId,
		getNewWorkflowDataAndMakeShareable,
		addWorkflowTagIds,
		removeWorkflowTagId,
		setWorkflowScopes,
		setWorkflowMetadata,
		addToWorkflowMetadata,
		setWorkflowPinData,

		// Execution
		markExecutionAsStopped,

		// Node modification
		setNodeParameters,
		setLastNodeParameters,
		setNodeValue,
		setNodePositionById,
		setNodeIssue,
		updateNodeAtIndex,
		updateNodeById,
		updateNodeProperties,
		resetParametersLastUpdatedAt,

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
