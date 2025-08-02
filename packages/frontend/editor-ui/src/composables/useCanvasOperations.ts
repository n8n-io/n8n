/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import type {
	AddedNodesAndConnections,
	IExecutionResponse,
	INodeUi,
	IUsedCredential,
	IWorkflowDb,
	WorkflowDataWithTemplateId,
	XYPosition,
} from '@/Interface';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import type { IWorkflowTemplate } from '@n8n/rest-api-client/api/templates';
import type { WorkflowData, WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { useDataSchema } from '@/composables/useDataSchema';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@n8n/i18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { type PinDataSource, usePinnedData } from '@/composables/usePinnedData';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { getExecutionErrorToastConfiguration } from '@/utils/executionUtils';
import {
	EnterpriseEditionFeature,
	FORM_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
	STICKY_NODE_TYPE,
	UPDATE_WEBHOOK_ID_NODE_TYPES,
	WEBHOOK_NODE_TYPE,
} from '@/constants';
import {
	AddConnectionCommand,
	AddNodeCommand,
	MoveNodeCommand,
	RemoveConnectionCommand,
	RemoveNodeCommand,
	RenameNodeCommand,
	ReplaceNodeParametersCommand,
} from '@/models/history';
import { useCanvasStore } from '@/stores/canvas.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useExecutionsStore } from '@/stores/executions.store';
import { useHistoryStore } from '@/stores/history.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/stores/settings.store';
import { useTagsStore } from '@/stores/tags.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type {
	CanvasConnection,
	CanvasConnectionCreateData,
	CanvasConnectionPort,
	CanvasNode,
	CanvasNodeMoveEvent,
	ViewportBoundaries,
} from '@/types';
import { CanvasConnectionMode } from '@/types';
import {
	createCanvasConnectionHandleString,
	mapCanvasConnectionToLegacyConnection,
	mapLegacyConnectionsToCanvasConnections,
	mapLegacyConnectionToCanvasConnection,
	parseCanvasConnectionHandleString,
} from '@/utils/canvasUtils';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import {
	GRID_SIZE,
	CONFIGURABLE_NODE_SIZE,
	CONFIGURATION_NODE_SIZE,
	DEFAULT_NODE_SIZE,
	DEFAULT_VIEWPORT_BOUNDARIES,
	generateOffsets,
	getNodesGroupSize,
	PUSH_NODES_OFFSET,
} from '@/utils/nodeViewUtils';
import type { Connection } from '@vue-flow/core';
import type {
	IConnection,
	IConnections,
	IDataObject,
	INode,
	INodeConnections,
	INodeCredentials,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	INodeTypeDescription,
	INodeTypeNameVersion,
	IPinData,
	IWorkflowBase,
	NodeInputConnections,
	NodeParameterValueType,
	Workflow,
	NodeConnectionType,
	INodeParameters,
} from 'n8n-workflow';
import { deepCopy, NodeConnectionTypes, NodeHelpers, TelemetryHelpers } from 'n8n-workflow';
import { computed, nextTick, ref } from 'vue';
import { useClipboard } from '@/composables/useClipboard';
import { useUniqueNodeName } from '@/composables/useUniqueNodeName';
import { isPresent } from '../utils/typesUtils';
import { useProjectsStore } from '@/stores/projects.store';
import type { CanvasLayoutEvent } from './useCanvasLayout';
import { chatEventBus } from '@n8n/chat/event-buses';
import { useLogsStore } from '@/stores/logs.store';
import { isChatNode } from '@/utils/aiUtils';
import cloneDeep from 'lodash/cloneDeep';
import uniq from 'lodash/uniq';

type AddNodeData = Partial<INodeUi> & {
	type: string;
};

type AddNodeDataWithTypeVersion = AddNodeData & {
	typeVersion: INodeUi['typeVersion'];
};

type AddNodesBaseOptions = {
	dragAndDrop?: boolean;
	trackHistory?: boolean;
	keepPristine?: boolean;
	telemetry?: boolean;
	forcePosition?: boolean;
	viewport?: ViewportBoundaries;
};

type AddNodesOptions = AddNodesBaseOptions & {
	position?: XYPosition;
	trackBulk?: boolean;
};

type AddNodeOptions = AddNodesBaseOptions & {
	openNDV?: boolean;
	isAutoAdd?: boolean;
};

export function useCanvasOperations() {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const credentialsStore = useCredentialsStore();
	const historyStore = useHistoryStore();
	const uiStore = useUIStore();
	const ndvStore = useNDVStore();
	const nodeTypesStore = useNodeTypesStore();
	const canvasStore = useCanvasStore();
	const settingsStore = useSettingsStore();
	const tagsStore = useTagsStore();
	const nodeCreatorStore = useNodeCreatorStore();
	const executionsStore = useExecutionsStore();
	const projectsStore = useProjectsStore();
	const logsStore = useLogsStore();

	const i18n = useI18n();
	const toast = useToast();
	const workflowHelpers = useWorkflowHelpers();
	const nodeHelpers = useNodeHelpers();
	const telemetry = useTelemetry();
	const externalHooks = useExternalHooks();
	const clipboard = useClipboard();
	const { uniqueNodeName } = useUniqueNodeName();

	const lastClickPosition = ref<XYPosition>([0, 0]);

	const preventOpeningNDV = !!localStorage.getItem('NodeView.preventOpeningNDV');

	const editableWorkflow = computed(() => workflowsStore.workflow);
	const editableWorkflowObject = computed(() => workflowsStore.getCurrentWorkflow());

	const triggerNodes = computed<INodeUi[]>(() => {
		return workflowsStore.workflowTriggerNodes;
	});

	/**
	 * Node operations
	 */

	function tidyUp({ result, source, target }: CanvasLayoutEvent) {
		updateNodesPosition(
			result.nodes.map(({ id, x, y }) => ({ id, position: { x, y } })),
			{ trackBulk: true, trackHistory: true },
		);
		trackTidyUp({ result, source, target });
	}

	function trackTidyUp({ result, source, target }: CanvasLayoutEvent) {
		telemetry.track('User tidied up canvas', {
			source,
			target,
			nodes_count: result.nodes.length,
		});
	}

	function updateNodesPosition(
		events: CanvasNodeMoveEvent[],
		{ trackHistory = false, trackBulk = true } = {},
	) {
		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		events.forEach(({ id, position }) => {
			updateNodePosition(id, position, { trackHistory });
		});

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	function updateNodePosition(
		id: string,
		position: CanvasNode['position'],
		{ trackHistory = false } = {},
	) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		const oldPosition: XYPosition = [...node.position];
		const newPosition: XYPosition = [position.x, position.y];

		workflowsStore.setNodePositionById(id, newPosition);

		if (trackHistory) {
			historyStore.pushCommandToUndo(
				new MoveNodeCommand(node.name, oldPosition, newPosition, Date.now()),
			);
		}
	}

	function revertUpdateNodePosition(nodeName: string, position: CanvasNode['position']) {
		const node = workflowsStore.getNodeByName(nodeName);
		if (!node) {
			return;
		}

		updateNodePosition(node.id, position);
	}

	function replaceNodeParameters(
		nodeId: string,
		currentParameters: INodeParameters,
		newParameters: INodeParameters,
		{ trackHistory = false, trackBulk = true } = {},
	) {
		const node = workflowsStore.getNodeById(nodeId);
		if (!node) return;

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}
		workflowsStore.setNodeParameters({
			name: node.name,
			value: newParameters,
		});

		if (trackHistory) {
			historyStore.pushCommandToUndo(
				new ReplaceNodeParametersCommand(nodeId, currentParameters, newParameters, Date.now()),
			);
		}

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	async function revertReplaceNodeParameters(
		nodeId: string,
		currentParameters: INodeParameters,
		newParameters: INodeParameters,
	) {
		replaceNodeParameters(nodeId, newParameters, currentParameters);
	}

	async function renameNode(
		currentName: string,
		newName: string,
		{ trackHistory = false, trackBulk = true } = {},
	) {
		if (currentName === newName) {
			return;
		}

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		newName = uniqueNodeName(newName);

		// Rename the node and update the connections
		const workflow = workflowsStore.getCurrentWorkflow(true);
		try {
			workflow.renameNode(currentName, newName);
		} catch (error) {
			toast.showMessage({
				type: 'error',
				title: error.message,
				message: error.description,
			});
			return;
		}

		if (trackHistory) {
			historyStore.pushCommandToUndo(new RenameNodeCommand(currentName, newName, Date.now()));
		}

		// Update also last selected node and execution data
		workflowsStore.renameNodeSelectedAndExecution({ old: currentName, new: newName });

		workflowsStore.setNodes(Object.values(workflow.nodes));
		workflowsStore.setConnections(workflow.connectionsBySourceNode);

		const isRenamingActiveNode = ndvStore.activeNodeName === currentName;
		if (isRenamingActiveNode) {
			ndvStore.activeNodeName = newName;
		}

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	async function revertRenameNode(currentName: string, previousName: string) {
		await renameNode(currentName, previousName);
	}

	function connectAdjacentNodes(id: string, { trackHistory = false } = {}) {
		const node = workflowsStore.getNodeById(id);

		if (!node) {
			return;
		}

		const outputConnectionsByType = workflowsStore.outgoingConnectionsByNodeName(node.name);
		const incomingConnectionsByType = workflowsStore.incomingConnectionsByNodeName(node.name);

		for (const [type, incomingConnectionsByInputIndex] of Object.entries(
			incomingConnectionsByType,
		) as Array<[NodeConnectionType, NodeInputConnections]>) {
			// Only connect nodes connected to the first input of a type
			for (const incomingConnection of incomingConnectionsByInputIndex.at(0) ?? []) {
				const incomingNodeId = workflowsStore.getNodeByName(incomingConnection.node)?.id;

				if (!incomingNodeId) continue;

				// Only connect to nodes connected to the first output of a type
				// For example on an If node, connect to the "true" main output
				for (const outgoingConnection of outputConnectionsByType[type]?.at(0) ?? []) {
					const outgoingNodeId = workflowsStore.getNodeByName(outgoingConnection.node)?.id;

					if (!outgoingNodeId) continue;

					if (trackHistory) {
						historyStore.pushCommandToUndo(
							new AddConnectionCommand(
								[
									{
										node: incomingConnection.node,
										type,
										index: incomingConnection.index,
									},
									{
										node: outgoingConnection.node,
										type,
										index: outgoingConnection.index,
									},
								],
								Date.now(),
							),
						);
					}

					createConnection({
						source: incomingNodeId,
						sourceHandle: createCanvasConnectionHandleString({
							mode: CanvasConnectionMode.Output,
							type,
							index: incomingConnection.index,
						}),
						target: outgoingNodeId,
						targetHandle: createCanvasConnectionHandleString({
							mode: CanvasConnectionMode.Input,
							type,
							index: outgoingConnection.index,
						}),
					});
				}
			}
		}
	}

	function deleteNode(id: string, { trackHistory = false, trackBulk = true } = {}) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		if (uiStore.lastInteractedWithNodeId === id) {
			uiStore.lastInteractedWithNodeId = undefined;
		}

		connectAdjacentNodes(id, { trackHistory });
		deleteConnectionsByNodeId(id, { trackHistory, trackBulk: false });

		workflowsStore.removeNodeExecutionDataById(id);
		workflowsStore.removeNodeById(id);

		if (trackHistory) {
			historyStore.pushCommandToUndo(new RemoveNodeCommand(node, Date.now()));

			if (trackBulk) {
				historyStore.stopRecordingUndo();
			}
		}

		trackDeleteNode(id);
	}

	function deleteNodes(ids: string[], { trackHistory = true, trackBulk = true } = {}) {
		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		ids.forEach((id) => deleteNode(id, { trackHistory, trackBulk: false }));

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	function revertDeleteNode(node: INodeUi) {
		workflowsStore.addNode(node);
		uiStore.stateIsDirty = true;
	}

	function trackDeleteNode(id: string) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		if (node.type === STICKY_NODE_TYPE) {
			telemetry.track('User deleted workflow note', {
				workflow_id: workflowsStore.workflowId,
			});
		} else {
			void externalHooks.run('node.deleteNode', { node });
			telemetry.track('User deleted node', {
				node_type: node.type,
				workflow_id: workflowsStore.workflowId,
			});
		}
	}

	function replaceNodeConnections(
		previousId: string,
		newId: string,
		{ trackHistory = false, trackBulk = true, replaceInputs = true, replaceOutputs = true } = {},
	) {
		const previousNode = workflowsStore.getNodeById(previousId);
		const newNode = workflowsStore.getNodeById(newId);

		if (!previousNode || !newNode) {
			return;
		}
		const wf = workflowsStore.getCurrentWorkflow();

		const inputNodeNames = replaceInputs
			? uniq(wf.getParentNodes(previousNode.name, 'main', 1))
			: [];
		const outputNodeNames = replaceOutputs
			? uniq(wf.getChildNodes(previousNode.name, 'main', 1))
			: [];
		const connectionPairs = [
			...wf.getConnectionsBetweenNodes(inputNodeNames, [previousNode.name]),
			...wf.getConnectionsBetweenNodes([previousNode.name], outputNodeNames),
		];

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}
		for (const pair of connectionPairs) {
			const sourceNode = workflowsStore.getNodeByName(pair[0].node);
			const targetNode = workflowsStore.getNodeByName(pair[1].node);
			if (!sourceNode || !targetNode) continue;
			const oldCanvasConnection = mapLegacyConnectionToCanvasConnection(
				sourceNode,
				targetNode,
				pair,
			);
			deleteConnection(oldCanvasConnection, { trackHistory, trackBulk: false });

			const newCanvasConnection = mapLegacyConnectionToCanvasConnection(
				sourceNode.name === previousNode.name ? newNode : sourceNode,
				targetNode.name === previousNode.name ? newNode : targetNode,
				[
					{
						...pair[0],
						node: pair[0].node === previousNode.name ? newNode.name : pair[0].node,
					},
					{
						...pair[1],
						node: pair[1].node === previousNode.name ? newNode.name : pair[1].node,
					},
				],
			);
			createConnection(newCanvasConnection, { trackHistory });
		}

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	function setNodeActive(id: string) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		workflowsStore.setNodePristine(node.name, false);
		setNodeActiveByName(node.name);
	}

	function setNodeActiveByName(name: string) {
		ndvStore.activeNodeName = name;
	}

	function clearNodeActive() {
		ndvStore.activeNodeName = null;
	}

	function setNodeParameters(id: string, parameters: Record<string, unknown>) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		workflowsStore.setNodeParameters(
			{
				name: node.name,
				value: parameters as NodeParameterValueType,
			},
			true,
		);
	}

	function setNodeSelected(id?: string) {
		if (!id) {
			uiStore.lastInteractedWithNodeId = undefined;
			uiStore.lastSelectedNode = '';
			return;
		}

		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		uiStore.lastInteractedWithNodeId = id;
		uiStore.lastSelectedNode = node.name;
	}

	function toggleNodesDisabled(ids: string[], { trackHistory = true, trackBulk = true } = {}) {
		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		const nodes = workflowsStore.getNodesByIds(ids);
		nodeHelpers.disableNodes(nodes, { trackHistory, trackBulk: false });

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	function revertToggleNodeDisabled(nodeName: string) {
		const node = workflowsStore.getNodeByName(nodeName);
		if (node) {
			nodeHelpers.disableNodes([node]);
		}
	}

	function toggleNodesPinned(
		ids: string[],
		source: PinDataSource,
		{ trackHistory = true, trackBulk = true } = {},
	) {
		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		const nodes = workflowsStore.getNodesByIds(ids);
		const nextStatePinned = nodes.some((node) => !workflowsStore.pinDataByNodeName(node.name));

		for (const node of nodes) {
			const pinnedDataForNode = usePinnedData(node);
			if (nextStatePinned) {
				const dataToPin = useDataSchema().getInputDataWithPinned(node);
				if (dataToPin.length !== 0) {
					pinnedDataForNode.setData(dataToPin, source);
				}
			} else {
				pinnedDataForNode.unsetData(source);
			}
		}

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	function requireNodeTypeDescription(
		type: INodeUi['type'],
		version?: INodeUi['typeVersion'],
	): INodeTypeDescription {
		return (
			nodeTypesStore.getNodeType(type, version) ?? {
				properties: [],
				displayName: type,
				name: type,
				group: [],
				description: '',
				version: version ?? 1,
				defaults: {},
				inputs: [],
				outputs: [],
			}
		);
	}

	async function addNodes(
		nodes: AddedNodesAndConnections['nodes'],
		{ viewport, ...options }: AddNodesOptions = {},
	) {
		let insertPosition = options.position;
		let lastAddedNode: INodeUi | undefined;
		const addedNodes: INodeUi[] = [];

		const nodesWithTypeVersion = nodes.map((node) => {
			const typeVersion =
				node.typeVersion ?? resolveNodeVersion(requireNodeTypeDescription(node.type));
			return {
				...node,
				typeVersion,
			};
		});

		await loadNodeTypesProperties(nodesWithTypeVersion);

		if (options.trackHistory && options.trackBulk) {
			historyStore.startRecordingUndo();
		}

		for (const [index, nodeAddData] of nodesWithTypeVersion.entries()) {
			const { isAutoAdd, openDetail: openNDV, ...node } = nodeAddData;
			const position = node.position ?? insertPosition;
			const nodeTypeDescription = requireNodeTypeDescription(node.type, node.typeVersion);

			try {
				const newNode = addNode(
					{
						...node,
						position,
					},
					nodeTypeDescription,
					{
						...options,
						...(index === 0 ? { viewport } : {}),
						openNDV,
						isAutoAdd,
					},
				);
				lastAddedNode = newNode;
				addedNodes.push(newNode);
			} catch (error) {
				toast.showError(error, i18n.baseText('error'));
				console.error(error);
				continue;
			}

			// When we're adding multiple nodes, increment the X position for the next one
			insertPosition = [
				lastAddedNode.position[0] + DEFAULT_NODE_SIZE[0] * 2 + GRID_SIZE,
				lastAddedNode.position[1],
			];
		}

		if (lastAddedNode) {
			updatePositionForNodeWithMultipleInputs(lastAddedNode);
		}

		if (options.trackHistory && options.trackBulk) {
			historyStore.stopRecordingUndo();
		}

		if (!options.keepPristine) {
			uiStore.stateIsDirty = true;
		}

		return addedNodes;
	}

	function updatePositionForNodeWithMultipleInputs(node: INodeUi) {
		const inputNodes = editableWorkflowObject.value.getParentNodesByDepth(node.name, 1);

		if (inputNodes.length > 1) {
			inputNodes.slice(1).forEach((inputNode, index) => {
				const nodeUi = workflowsStore.getNodeByName(inputNode.name);
				if (!nodeUi) return;

				updateNodePosition(nodeUi.id, {
					x: nodeUi.position[0],
					y: nodeUi.position[1] + 100 * (index + 1),
				});
			});
		}
	}

	/**
	 * Check if maximum allowed number of this type of node has been reached
	 */
	function checkMaxNodesOfTypeReached(nodeTypeDescription: INodeTypeDescription) {
		if (
			nodeTypeDescription.maxNodes !== undefined &&
			workflowHelpers.getNodeTypeCount(nodeTypeDescription.name) >= nodeTypeDescription.maxNodes
		) {
			throw new Error(
				i18n.baseText('nodeView.showMessage.showMaxNodeTypeError.message', {
					adjustToNumber: nodeTypeDescription.maxNodes,
					interpolate: { nodeTypeDataDisplayName: nodeTypeDescription.displayName },
				}),
			);
		}
	}

	function addNode(
		node: AddNodeDataWithTypeVersion,
		nodeTypeDescription: INodeTypeDescription,
		options: AddNodeOptions = {},
	): INodeUi {
		checkMaxNodesOfTypeReached(nodeTypeDescription);

		const nodeData = resolveNodeData(node, nodeTypeDescription, {
			viewport: options.viewport,
		});
		if (!nodeData) {
			throw new Error(i18n.baseText('nodeViewV2.showError.failedToCreateNode'));
		}

		workflowsStore.addNode(nodeData);

		if (options.trackHistory) {
			historyStore.pushCommandToUndo(new AddNodeCommand(nodeData, Date.now()));
		}

		if (!options.isAutoAdd) {
			createConnectionToLastInteractedWithNode(nodeData, options);
		}

		void nextTick(() => {
			if (!options.keepPristine) {
				uiStore.stateIsDirty = true;
			}

			workflowsStore.setNodePristine(nodeData.name, true);
			nodeHelpers.matchCredentials(nodeData);
			nodeHelpers.updateNodeParameterIssues(nodeData);
			nodeHelpers.updateNodeCredentialIssues(nodeData);
			nodeHelpers.updateNodeInputIssues(nodeData);

			if (options.telemetry) {
				trackAddNode(nodeData, options);
			}

			if (nodeData.type !== STICKY_NODE_TYPE) {
				void externalHooks.run('nodeView.addNodeButton', { nodeTypeName: nodeData.type });

				if (options.openNDV && !preventOpeningNDV) {
					ndvStore.setActiveNodeName(nodeData.name);
				}
			}
		});

		return nodeData;
	}

	async function revertAddNode(nodeName: string) {
		const node = workflowsStore.getNodeByName(nodeName);
		if (!node) {
			return;
		}

		deleteNode(node.id);
	}

	function createConnectionToLastInteractedWithNode(node: INodeUi, options: AddNodeOptions = {}) {
		const lastInteractedWithNode = uiStore.lastInteractedWithNode;
		if (!lastInteractedWithNode) {
			return;
		}

		const lastInteractedWithNodeId = lastInteractedWithNode.id;
		const lastInteractedWithNodeConnection = uiStore.lastInteractedWithNodeConnection;
		const lastInteractedWithNodeHandle = uiStore.lastInteractedWithNodeHandle;
		// If we have a specific endpoint to connect to
		if (lastInteractedWithNodeHandle) {
			const { type: connectionType, mode } = parseCanvasConnectionHandleString(
				lastInteractedWithNodeHandle,
			);

			const nodeId = node.id;
			const nodeHandle = createCanvasConnectionHandleString({
				mode: CanvasConnectionMode.Input,
				type: connectionType,
				index: 0,
			});

			if (mode === CanvasConnectionMode.Input) {
				createConnection({
					source: nodeId,
					sourceHandle: nodeHandle,
					target: lastInteractedWithNodeId,
					targetHandle: lastInteractedWithNodeHandle,
				});
			} else {
				createConnection({
					source: lastInteractedWithNodeId,
					sourceHandle: lastInteractedWithNodeHandle,
					target: nodeId,
					targetHandle: nodeHandle,
				});
			}
		} else {
			// If a node is last selected then connect between the active and its child ones
			// Connect active node to the newly created one
			createConnection({
				source: lastInteractedWithNodeId,
				sourceHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Output,
					type: NodeConnectionTypes.Main,
					index: 0,
				}),
				target: node.id,
				targetHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Input,
					type: NodeConnectionTypes.Main,
					index: 0,
				}),
			});
		}

		if (lastInteractedWithNodeConnection) {
			deleteConnection(lastInteractedWithNodeConnection, { trackHistory: options.trackHistory });

			const targetNode = workflowsStore.getNodeById(lastInteractedWithNodeConnection.target);
			if (targetNode) {
				createConnection({
					source: node.id,
					sourceHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Input,
						type: NodeConnectionTypes.Main,
						index: 0,
					}),
					target: lastInteractedWithNodeConnection.target,
					targetHandle: lastInteractedWithNodeConnection.targetHandle,
				});
			}
		}
	}

	function trackAddNode(nodeData: INodeUi, options: AddNodeOptions) {
		switch (nodeData.type) {
			case STICKY_NODE_TYPE:
				trackAddStickyNoteNode();
				break;
			default:
				trackAddDefaultNode(nodeData, options);
		}
	}

	function trackAddStickyNoteNode() {
		telemetry.track('User inserted workflow note', {
			workflow_id: workflowsStore.workflowId,
		});
	}

	function trackAddDefaultNode(nodeData: INodeUi, options: AddNodeOptions) {
		nodeCreatorStore.onNodeAddedToCanvas({
			node_id: nodeData.id,
			node_type: nodeData.type,
			node_version: nodeData.typeVersion,
			is_auto_add: options.isAutoAdd,
			workflow_id: workflowsStore.workflowId,
			drag_and_drop: options.dragAndDrop,
			input_node_type: uiStore.lastInteractedWithNode
				? uiStore.lastInteractedWithNode.type
				: undefined,
		});
	}

	/**
	 * Resolves the data for a new node
	 */
	function resolveNodeData(
		node: AddNodeDataWithTypeVersion,
		nodeTypeDescription: INodeTypeDescription,
		options: { viewport?: ViewportBoundaries; forcePosition?: boolean } = {},
	) {
		const id = node.id ?? nodeHelpers.assignNodeId(node as INodeUi);
		const name =
			node.name ??
			nodeHelpers.getDefaultNodeName(node) ??
			(nodeTypeDescription.defaults.name as string);
		const type = nodeTypeDescription.name;
		const typeVersion = node.typeVersion;
		const position =
			options.forcePosition && node.position
				? node.position
				: resolveNodePosition(node as INodeUi, nodeTypeDescription, {
						viewport: options.viewport,
					});
		const disabled = node.disabled ?? false;
		const parameters = node.parameters ?? {};

		const nodeData: INodeUi = {
			...node,
			id,
			name,
			type,
			typeVersion,
			position,
			disabled,
			parameters,
		};

		resolveNodeName(nodeData);
		resolveNodeParameters(nodeData, nodeTypeDescription);
		resolveNodeWebhook(nodeData, nodeTypeDescription);

		return nodeData;
	}

	async function loadNodeTypesProperties(
		nodes: Array<Pick<INodeUi, 'type' | 'typeVersion'>>,
	): Promise<void> {
		const allNodeTypeDescriptions: INodeTypeDescription[] = nodeTypesStore.allNodeTypes;

		const nodesToBeFetched: INodeTypeNameVersion[] = [];
		allNodeTypeDescriptions.forEach((nodeTypeDescription) => {
			const nodeVersions = Array.isArray(nodeTypeDescription.version)
				? nodeTypeDescription.version
				: [nodeTypeDescription.version];
			if (
				!!nodes.find(
					(n) => n.type === nodeTypeDescription.name && nodeVersions.includes(n.typeVersion),
				) &&
				!nodeTypeDescription.hasOwnProperty('properties')
			) {
				nodesToBeFetched.push({
					name: nodeTypeDescription.name,
					version: Array.isArray(nodeTypeDescription.version)
						? nodeTypeDescription.version.slice(-1)[0]
						: nodeTypeDescription.version,
				});
			}
		});

		if (nodesToBeFetched.length > 0) {
			// Only call API if node information is actually missing
			await nodeTypesStore.getNodesInformation(nodesToBeFetched);
		}
	}

	function resolveNodeVersion(nodeTypeDescription: INodeTypeDescription) {
		let nodeVersion = nodeTypeDescription.defaultVersion;

		if (typeof nodeVersion === 'undefined') {
			nodeVersion = Array.isArray(nodeTypeDescription.version)
				? nodeTypeDescription.version.slice(-1)[0]
				: nodeTypeDescription.version;
		}

		return nodeVersion;
	}

	function resolveNodeParameters(node: INodeUi, nodeTypeDescription: INodeTypeDescription) {
		const nodeParameters = NodeHelpers.getNodeParameters(
			nodeTypeDescription?.properties ?? [],
			node.parameters,
			true,
			false,
			node,
			nodeTypeDescription,
		);

		node.parameters = nodeParameters ?? {};
	}

	function resolveNodePosition(
		node: Omit<INodeUi, 'position'> & { position?: INodeUi['position'] },
		nodeTypeDescription: INodeTypeDescription,
		options: { viewport?: ViewportBoundaries } = {},
	) {
		// Available when
		// - clicking the plus button of a node handle
		// - dragging an edge / connection of a node handle
		// - selecting a node, adding a node via the node creator
		const lastInteractedWithNode = uiStore.lastInteractedWithNode;
		// Available when clicking the plus button of a node edge / connection
		const lastInteractedWithNodeConnection = uiStore.lastInteractedWithNodeConnection;
		// Available when dragging an edge / connection from a node
		const lastInteractedWithNodeHandle = uiStore.lastInteractedWithNodeHandle;

		const { type: connectionType, index: connectionIndex } = parseCanvasConnectionHandleString(
			lastInteractedWithNodeHandle ?? lastInteractedWithNodeConnection?.sourceHandle ?? '',
		);

		const nodeSize =
			connectionType === NodeConnectionTypes.Main ? DEFAULT_NODE_SIZE : CONFIGURATION_NODE_SIZE;
		const pushOffsets: XYPosition = [nodeSize[0] / 2, nodeSize[1] / 2];

		let position: XYPosition | undefined = node.position;
		if (position) {
			return NodeViewUtils.getNewNodePosition(workflowsStore.allNodes, position, {
				offset: pushOffsets,
				size: nodeSize,
				viewport: options.viewport,
				normalize: false,
			});
		}

		if (lastInteractedWithNode) {
			const lastInteractedWithNodeTypeDescription = nodeTypesStore.getNodeType(
				lastInteractedWithNode.type,
				lastInteractedWithNode.typeVersion,
			);
			const lastInteractedWithNodeObject = editableWorkflowObject.value.getNode(
				lastInteractedWithNode.name,
			);

			const newNodeInsertPosition = uiStore.lastCancelledConnectionPosition;
			if (newNodeInsertPosition) {
				// When pulling / cancelling a connection.
				// The new node should be placed at the same position as the mouse up event,
				// designated by the `newNodeInsertPosition` value.

				const xOffset = connectionType === NodeConnectionTypes.Main ? 0 : -nodeSize[0] / 2;
				const yOffset = connectionType === NodeConnectionTypes.Main ? -nodeSize[1] / 2 : 0;

				position = [newNodeInsertPosition[0] + xOffset, newNodeInsertPosition[1] + yOffset];

				uiStore.lastCancelledConnectionPosition = undefined;
			} else if (lastInteractedWithNodeTypeDescription && lastInteractedWithNodeObject) {
				// When
				// - clicking the plus button of a node handle
				// - clicking the plus button of a node edge / connection
				// - selecting a node, adding a node via the node creator

				const lastInteractedWithNodeInputs = NodeHelpers.getNodeInputs(
					editableWorkflowObject.value,
					lastInteractedWithNodeObject,
					lastInteractedWithNodeTypeDescription,
				);
				const lastInteractedWithNodeInputTypes = NodeHelpers.getConnectionTypes(
					lastInteractedWithNodeInputs,
				);

				const lastInteractedWithNodeScopedInputTypes = (
					lastInteractedWithNodeInputTypes || []
				).filter((input) => input !== NodeConnectionTypes.Main);

				const lastInteractedWithNodeOutputs = NodeHelpers.getNodeOutputs(
					editableWorkflowObject.value,
					lastInteractedWithNodeObject,
					lastInteractedWithNodeTypeDescription,
				);
				const lastInteractedWithNodeOutputTypes = NodeHelpers.getConnectionTypes(
					lastInteractedWithNodeOutputs,
				);

				const lastInteractedWithNodeMainOutputs = lastInteractedWithNodeOutputTypes.filter(
					(output) => output === NodeConnectionTypes.Main,
				);

				let yOffset = 0;
				if (lastInteractedWithNodeConnection) {
					// When clicking the plus button of a node edge / connection
					// Compute the y offset for the new node based on the number of main outputs of the source node
					// and shift the downstream nodes accordingly

					shiftDownstreamNodesPosition(lastInteractedWithNode.name, PUSH_NODES_OFFSET, {
						trackHistory: true,
					});
				}

				if (lastInteractedWithNodeMainOutputs.length > 1) {
					const yOffsetValues = generateOffsets(
						lastInteractedWithNodeMainOutputs.length,
						DEFAULT_NODE_SIZE[1],
						GRID_SIZE,
					);

					yOffset = yOffsetValues[connectionIndex];
				}

				let outputs: Array<NodeConnectionType | INodeOutputConfiguration> = [];
				try {
					// It fails when the outputs are an expression. As those nodes have
					// normally no outputs by default and the only reason we need the
					// outputs here is to calculate the position, it is fine to assume
					// that they have no outputs and are so treated as a regular node
					// with only "main" outputs.
					outputs = NodeHelpers.getNodeOutputs(
						editableWorkflowObject.value,
						node as INode,
						nodeTypeDescription,
					);
				} catch (e) {}
				const outputTypes = NodeHelpers.getConnectionTypes(outputs);

				/**
				 * Custom Y offsets for specific connection types when adding them using the plus button:
				 * - AI Language Model: Moved left by 2 node widths
				 * - AI Memory: Moved left by 1 node width
				 */
				const CUSTOM_Y_OFFSETS: Record<string, number> = {
					[NodeConnectionTypes.AiLanguageModel]: nodeSize[0] * 2,
					[NodeConnectionTypes.AiMemory]: nodeSize[0],
				};

				const customOffset: number = CUSTOM_Y_OFFSETS[connectionType as string] ?? 0;

				if (
					outputTypes.length > 0 &&
					outputTypes.every((outputName) => outputName !== NodeConnectionTypes.Main)
				) {
					// When the added node has only non-main outputs (configuration nodes)
					// We want to place the new node directly below the last interacted with node.

					const scopedConnectionIndex = lastInteractedWithNodeScopedInputTypes.findIndex(
						(inputType) => outputs[0] === inputType,
					);

					const lastInteractedWithNodeWidthDivisions = Math.max(
						lastInteractedWithNodeScopedInputTypes.length + 1,
						1,
					);

					position = [
						lastInteractedWithNode.position[0] +
							(CONFIGURABLE_NODE_SIZE[0] / lastInteractedWithNodeWidthDivisions) *
								(scopedConnectionIndex + 1) -
							nodeSize[0] / 2 -
							customOffset,
						lastInteractedWithNode.position[1] + PUSH_NODES_OFFSET,
					];
				} else {
					// When the node has only main outputs, mixed outputs, or no outputs at all
					// We want to place the new node directly to the right of the last interacted with node.

					let pushOffset = PUSH_NODES_OFFSET;
					if (
						lastInteractedWithNodeInputTypes.find((input) => input !== NodeConnectionTypes.Main)
					) {
						// If the node has scoped inputs, push it down a bit more
						pushOffset += 140;
					}

					// If a node is active then add the new node directly after the current one
					position = [
						lastInteractedWithNode.position[0] + pushOffset,
						lastInteractedWithNode.position[1] + yOffset,
					];
				}
			}
		}

		if (!position) {
			if (nodeTypesStore.isTriggerNode(node.type) && triggerNodes.value.length === 0) {
				// When added node is a trigger, and it's the first one added to the canvas
				// we place it at root to replace the canvas add button

				position = [0, 0];
			} else {
				// When no position is set, we place the node at the last clicked position

				position = lastClickPosition.value;
			}
		}

		return NodeViewUtils.getNewNodePosition(workflowsStore.allNodes, position, {
			offset: pushOffsets,
			size: nodeSize,
			viewport: options.viewport,
		});
	}

	function resolveNodeName(node: INodeUi) {
		const localizedName = i18n.localizeNodeName(rootStore.defaultLocale, node.name, node.type);

		node.name = uniqueNodeName(localizedName);
	}

	function resolveNodeWebhook(node: INodeUi, nodeTypeDescription: INodeTypeDescription) {
		if (nodeTypeDescription.webhooks?.length && !node.webhookId) {
			nodeHelpers.assignWebhookId(node);
		}

		// if it's a webhook and the path is empty set the UUID as the default path
		if (
			[WEBHOOK_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, MCP_TRIGGER_NODE_TYPE].includes(node.type) &&
			node.parameters.path === ''
		) {
			node.parameters.path = node.webhookId as string;
		}
	}

	/**
	 * Moves all downstream nodes of a node
	 */
	function shiftDownstreamNodesPosition(
		sourceNodeName: string,
		margin: number,
		{ trackHistory = false }: { trackHistory?: boolean },
	) {
		const sourceNode = workflowsStore.nodesByName[sourceNodeName];
		const checkNodes = workflowHelpers.getConnectedNodes(
			'downstream',
			editableWorkflowObject.value,
			sourceNodeName,
		);
		for (const nodeName of checkNodes) {
			const node = workflowsStore.nodesByName[nodeName];
			if (!node || !sourceNode || node.position[0] < sourceNode.position[0]) {
				continue;
			}

			updateNodePosition(
				node.id,
				{
					x: node.position[0] + margin,
					y: node.position[1],
				},
				{ trackHistory },
			);
		}
	}

	/**
	 * Connection operations
	 */

	function createConnection(
		connection: Connection,
		{ trackHistory = false, keepPristine = false } = {},
	) {
		const sourceNode = workflowsStore.getNodeById(connection.source);
		const targetNode = workflowsStore.getNodeById(connection.target);
		if (!sourceNode || !targetNode) {
			return;
		}

		if (trackHistory) {
			historyStore.pushCommandToUndo(
				new AddConnectionCommand(
					mapCanvasConnectionToLegacyConnection(sourceNode, targetNode, connection),
					Date.now(),
				),
			);
		}

		const mappedConnection = mapCanvasConnectionToLegacyConnection(
			sourceNode,
			targetNode,
			connection,
		);

		if (!isConnectionAllowed(sourceNode, targetNode, mappedConnection[0], mappedConnection[1])) {
			return;
		}

		workflowsStore.addConnection({
			connection: mappedConnection,
		});

		void nextTick(() => {
			nodeHelpers.updateNodeInputIssues(sourceNode);
			nodeHelpers.updateNodeInputIssues(targetNode);
		});

		if (!keepPristine) {
			uiStore.stateIsDirty = true;
		}
	}

	function revertCreateConnection(connection: [IConnection, IConnection]) {
		const sourceNodeName = connection[0].node;
		const sourceNode = workflowsStore.getNodeByName(sourceNodeName);
		const targetNodeName = connection[1].node;
		const targetNode = workflowsStore.getNodeByName(targetNodeName);

		if (!sourceNode || !targetNode) {
			return;
		}

		deleteConnection(mapLegacyConnectionToCanvasConnection(sourceNode, targetNode, connection));
	}

	function deleteConnectionsByNodeId(
		targetNodeId: string,
		{ trackHistory = false, trackBulk = true } = {},
	) {
		const targetNode = workflowsStore.getNodeById(targetNodeId);
		if (!targetNode) {
			return;
		}

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		const connections = cloneDeep(workflowsStore.workflow.connections);
		for (const nodeName of Object.keys(connections)) {
			const node = workflowsStore.getNodeByName(nodeName);
			if (!node) {
				continue;
			}

			for (const type of Object.keys(connections[nodeName])) {
				for (const index of Object.keys(connections[nodeName][type])) {
					const connectionsToDelete = connections[nodeName][type][parseInt(index, 10)] ?? [];
					for (const connectionIndex of Object.keys(connectionsToDelete)) {
						const connectionData = connectionsToDelete[parseInt(connectionIndex, 10)];
						if (!connectionData) {
							continue;
						}

						const connectionDataNode = workflowsStore.getNodeByName(connectionData.node);
						if (
							connectionDataNode &&
							(connectionDataNode.id === targetNode.id || node.name === targetNode.name)
						) {
							deleteConnection(
								{
									source: node.id,
									sourceHandle: createCanvasConnectionHandleString({
										mode: CanvasConnectionMode.Output,
										type: type as NodeConnectionType,
										index: parseInt(index, 10),
									}),
									target: connectionDataNode.id,
									targetHandle: createCanvasConnectionHandleString({
										mode: CanvasConnectionMode.Input,
										type: connectionData.type,
										index: connectionData.index,
									}),
								},
								{ trackHistory, trackBulk: false },
							);
						}
					}
				}
			}
		}

		delete workflowsStore.workflow.connections[targetNode.name];

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	function deleteConnection(
		connection: Connection,
		{ trackHistory = false, trackBulk = true } = {},
	) {
		const sourceNode = workflowsStore.getNodeById(connection.source);
		const targetNode = workflowsStore.getNodeById(connection.target);
		if (!sourceNode || !targetNode) {
			return;
		}

		const mappedConnection = mapCanvasConnectionToLegacyConnection(
			sourceNode,
			targetNode,
			connection,
		);

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		workflowsStore.removeConnection({
			connection: mappedConnection,
		});

		if (trackHistory) {
			historyStore.pushCommandToUndo(new RemoveConnectionCommand(mappedConnection, Date.now()));

			if (trackBulk) {
				historyStore.stopRecordingUndo();
			}
		}
	}

	function revertDeleteConnection(connection: [IConnection, IConnection]) {
		workflowsStore.addConnection({
			connection,
		});
	}

	function revalidateNodeConnections(id: string, connectionMode: CanvasConnectionMode) {
		const node = workflowsStore.getNodeById(id);
		const isInput = connectionMode === CanvasConnectionMode.Input;
		if (!node) {
			return;
		}

		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType) {
			return;
		}

		const connections = mapLegacyConnectionsToCanvasConnections(
			workflowsStore.workflow.connections,
			workflowsStore.workflow.nodes,
		);

		connections.forEach((connection) => {
			const isRelevantConnection = isInput ? connection.target === id : connection.source === id;

			if (isRelevantConnection) {
				const otherNodeId = isInput ? connection.source : connection.target;

				const otherNode = workflowsStore.getNodeById(otherNodeId);
				if (!otherNode || !connection.data) {
					return;
				}

				const [firstNode, secondNode] = isInput ? [otherNode, node] : [node, otherNode];

				if (
					!isConnectionAllowed(
						firstNode,
						secondNode,
						connection.data.source,
						connection.data.target,
					)
				) {
					void nextTick(() => deleteConnection(connection));
				}
			}
		});
	}

	function revalidateNodeInputConnections(id: string) {
		return revalidateNodeConnections(id, CanvasConnectionMode.Input);
	}

	function revalidateNodeOutputConnections(id: string) {
		return revalidateNodeConnections(id, CanvasConnectionMode.Output);
	}

	function isConnectionAllowed(
		sourceNode: INodeUi,
		targetNode: INodeUi,
		sourceConnection: IConnection | CanvasConnectionPort,
		targetConnection: IConnection | CanvasConnectionPort,
	): boolean {
		const blocklist = [STICKY_NODE_TYPE];

		if (sourceConnection.type !== targetConnection.type) {
			return false;
		}

		if (blocklist.includes(sourceNode.type) || blocklist.includes(targetNode.type)) {
			return false;
		}

		const sourceNodeType = nodeTypesStore.getNodeType(sourceNode.type, sourceNode.typeVersion);
		const sourceWorkflowNode = editableWorkflowObject.value.getNode(sourceNode.name);
		if (!sourceWorkflowNode) {
			return false;
		}

		let sourceNodeOutputs: Array<NodeConnectionType | INodeOutputConfiguration> = [];
		if (sourceNodeType) {
			sourceNodeOutputs =
				NodeHelpers.getNodeOutputs(
					editableWorkflowObject.value,
					sourceWorkflowNode,
					sourceNodeType,
				) || [];
		}

		const sourceNodeHasOutputConnectionOfType = !!sourceNodeOutputs.find((output) => {
			const outputType = typeof output === 'string' ? output : output.type;
			return outputType === sourceConnection.type;
		});

		const sourceNodeHasOutputConnectionPortOfType =
			sourceConnection.index < sourceNodeOutputs.length;

		if (!sourceNodeHasOutputConnectionOfType || !sourceNodeHasOutputConnectionPortOfType) {
			return false;
		}

		const targetNodeType = nodeTypesStore.getNodeType(targetNode.type, targetNode.typeVersion);
		const targetWorkflowNode = editableWorkflowObject.value.getNode(targetNode.name);
		if (!targetWorkflowNode) {
			return false;
		}

		let targetNodeInputs: Array<NodeConnectionType | INodeInputConfiguration> = [];
		if (targetNodeType) {
			targetNodeInputs =
				NodeHelpers.getNodeInputs(
					editableWorkflowObject.value,
					targetWorkflowNode,
					targetNodeType,
				) || [];
		}

		const targetNodeHasInputConnectionOfType = !!targetNodeInputs.find((input) => {
			const inputType = typeof input === 'string' ? input : input.type;
			if (inputType !== targetConnection.type) return false;

			const filter = typeof input === 'object' && 'filter' in input ? input.filter : undefined;
			if (
				(filter?.nodes?.length && !filter.nodes?.includes(sourceNode.type)) ||
				(filter?.excludedNodes?.length && filter.excludedNodes?.includes(sourceNode.type))
			) {
				toast.showToast({
					title: i18n.baseText('nodeView.showError.nodeNodeCompatible.title'),
					message: i18n.baseText('nodeView.showError.nodeNodeCompatible.message', {
						interpolate: { sourceNodeName: sourceNode.name, targetNodeName: targetNode.name },
					}),
					type: 'error',
					duration: 5000,
				});

				return false;
			}

			return true;
		});

		const targetNodeHasInputConnectionPortOfType = targetConnection.index < targetNodeInputs.length;

		return targetNodeHasInputConnectionOfType && targetNodeHasInputConnectionPortOfType;
	}

	async function addConnections(
		connections: CanvasConnectionCreateData[] | CanvasConnection[],
		{ trackBulk = true, trackHistory = false, keepPristine = false } = {},
	) {
		await nextTick(); // Connection creation relies on the nodes being already added to the store

		if (trackBulk && trackHistory) {
			historyStore.startRecordingUndo();
		}

		for (const connection of connections) {
			createConnection(connection, { trackHistory, keepPristine });
		}

		if (trackBulk && trackHistory) {
			historyStore.stopRecordingUndo();
		}

		if (!keepPristine) {
			uiStore.stateIsDirty = true;
		}
	}

	/**
	 * Workspace operations
	 */

	function resetWorkspace() {
		// Reset node creator
		nodeCreatorStore.setNodeCreatorState({ createNodeActive: false });
		nodeCreatorStore.setShowScrim(false);

		// Make sure that if there is a waiting test-webhook, it gets removed
		if (workflowsStore.executionWaitingForWebhook) {
			try {
				void workflowsStore.removeTestWebhook(workflowsStore.workflowId);
			} catch (error) {}
		}

		// Reset editable workflow state
		workflowsStore.resetWorkflow();
		workflowsStore.resetState();
		workflowsStore.currentWorkflowExecutions = [];
		workflowsStore.setActiveExecutionId(undefined);

		// Reset actions
		uiStore.resetLastInteractedWith();
		uiStore.stateIsDirty = false;

		// Reset executions
		executionsStore.activeExecution = null;

		// Reset credentials updates
		nodeHelpers.credentialsUpdated.value = false;
	}

	function initializeWorkspace(data: IWorkflowDb) {
		workflowHelpers.initState(data);

		data.nodes.forEach((node) => {
			const nodeTypeDescription = requireNodeTypeDescription(node.type, node.typeVersion);
			nodeHelpers.matchCredentials(node);
			resolveNodeParameters(node, nodeTypeDescription);
			resolveNodeWebhook(node, nodeTypeDescription);
		});

		workflowsStore.setNodes(data.nodes);
		workflowsStore.setConnections(data.connections);
	}

	/**
	 * Import operations
	 */

	function removeUnknownCredentials(workflow: WorkflowDataUpdate) {
		if (!workflow?.nodes) return;

		for (const node of workflow.nodes) {
			if (!node.credentials) continue;

			for (const [name, credential] of Object.entries(node.credentials)) {
				if (typeof credential === 'string' || credential.id === null) continue;

				if (!credentialsStore.getCredentialById(credential.id)) {
					delete node.credentials[name];
				}
			}
		}
	}

	async function addImportedNodesToWorkflow(
		data: WorkflowDataUpdate,
		{ trackBulk = true, trackHistory = false, viewport = DEFAULT_VIEWPORT_BOUNDARIES } = {},
	): Promise<WorkflowDataUpdate> {
		// Because nodes with the same name maybe already exist, it could
		// be needed that they have to be renamed. Also could it be possible
		// that nodes are not allowed to be created because they have a create
		// limit set. So we would then link the new nodes with the already existing ones.
		// In this object all that nodes get saved in the format:
		//   old-name -> new-name
		const nodeNameTable: {
			[key: string]: string;
		} = {};
		const newNodeNames = new Set<string>((data.nodes ?? []).map((node) => node.name));

		if (!data.nodes) {
			// No nodes to add
			throw new Error(i18n.baseText('nodeView.noNodesGivenToAdd'));
		}

		// Get how many of the nodes of the types which have
		// a max limit set already exist
		const nodeTypesCount = workflowHelpers.getNodeTypesMaxCount();

		let oldName: string;
		let newName: string;
		const createNodes: INode[] = [];

		await nodeHelpers.loadNodesProperties(
			data.nodes.map((node) => ({ name: node.type, version: node.typeVersion })),
		);

		data.nodes.forEach((node) => {
			if (nodeTypesCount[node.type] !== undefined) {
				if (nodeTypesCount[node.type].exist >= nodeTypesCount[node.type].max) {
					// Node is not allowed to be created so
					// do not add it to the create list but
					// add the name of the existing node
					// that this one gets linked up instead.
					nodeNameTable[node.name] = nodeTypesCount[node.type].nodeNames[0];
					return;
				} else {
					// Node can be created but increment the
					// counter in case multiple ones are
					// supposed to be created
					nodeTypesCount[node.type].exist += 1;
				}
			}

			oldName = node.name;

			const localized = i18n.localizeNodeName(rootStore.defaultLocale, node.name, node.type);

			newNodeNames.delete(oldName);
			newName = uniqueNodeName(localized, Array.from(newNodeNames));
			newNodeNames.add(newName);

			nodeNameTable[oldName] = newName;

			createNodes.push(node);
		});

		// Get only the connections of the nodes that get created
		const newConnections: IConnections = {};
		const currentConnections = data.connections ?? {};
		const createNodeNames = createNodes.map((node) => node.name);
		let sourceNode, type, sourceIndex, connectionIndex, connectionData;
		for (sourceNode of Object.keys(currentConnections)) {
			if (!createNodeNames.includes(sourceNode)) {
				// Node does not get created so skip output connections
				continue;
			}

			const connection: INodeConnections = {};

			for (type of Object.keys(currentConnections[sourceNode])) {
				connection[type] = [];
				for (
					sourceIndex = 0;
					sourceIndex < currentConnections[sourceNode][type].length;
					sourceIndex++
				) {
					const nodeSourceConnections = [];
					const connectionsToCheck = currentConnections[sourceNode][type][sourceIndex];
					if (connectionsToCheck) {
						for (
							connectionIndex = 0;
							connectionIndex < connectionsToCheck.length;
							connectionIndex++
						) {
							connectionData = connectionsToCheck[connectionIndex];
							if (!createNodeNames.includes(connectionData.node)) {
								// Node does not get created so skip input connection
								continue;
							}

							nodeSourceConnections.push(connectionData);
							// Add connection
						}
					}
					connection[type].push(nodeSourceConnections);
				}
			}

			newConnections[sourceNode] = connection;
		}

		// Create a workflow with the new nodes and connections that we can use
		// the rename method
		const tempWorkflow: Workflow = workflowsStore.getWorkflow(createNodes, newConnections);

		// Rename all the nodes of which the name changed
		for (oldName in nodeNameTable) {
			if (oldName === nodeNameTable[oldName]) {
				// Name did not change so skip
				continue;
			}
			tempWorkflow.renameNode(oldName, nodeNameTable[oldName]);
		}

		if (data.pinData) {
			let pinDataSuccess = true;
			for (const nodeName of Object.keys(data.pinData)) {
				// Pin data limit reached
				if (!pinDataSuccess) {
					toast.showError(
						new Error(i18n.baseText('ndv.pinData.error.tooLarge.description')),
						i18n.baseText('ndv.pinData.error.tooLarge.title'),
					);
					continue;
				}

				const node = tempWorkflow.nodes[nodeNameTable[nodeName]];
				try {
					const pinnedDataForNode = usePinnedData(node);
					pinnedDataForNode.setData(data.pinData[nodeName], 'add-nodes');
					pinDataSuccess = true;
				} catch (error) {
					pinDataSuccess = false;
					console.error(error);
				}
			}
		}

		// Add the nodes with the changed node names, expressions and connections
		if (trackBulk && trackHistory) {
			historyStore.startRecordingUndo();
		}

		await addNodes(Object.values(tempWorkflow.nodes), {
			trackBulk: false,
			trackHistory,
			viewport,
		});
		await addConnections(
			mapLegacyConnectionsToCanvasConnections(
				tempWorkflow.connectionsBySourceNode,
				Object.values(tempWorkflow.nodes),
			),
			{ trackBulk: false, trackHistory },
		);

		if (trackBulk && trackHistory) {
			historyStore.stopRecordingUndo();
		}

		uiStore.stateIsDirty = true;

		return {
			nodes: Object.values(tempWorkflow.nodes),
			connections: tempWorkflow.connectionsBySourceNode,
		};
	}

	async function importWorkflowData(
		workflowData: WorkflowDataUpdate,
		source: string,
		{
			importTags = true,
			trackBulk = true,
			trackHistory = true,
			viewport,
			regenerateIds = true,
		}: {
			importTags?: boolean;
			trackBulk?: boolean;
			trackHistory?: boolean;
			regenerateIds?: boolean;
			viewport?: ViewportBoundaries;
		} = {},
	): Promise<WorkflowDataUpdate> {
		uiStore.resetLastInteractedWith();

		// If it is JSON check if it looks on the first look like data we can use
		if (!workflowData.hasOwnProperty('nodes') || !workflowData.hasOwnProperty('connections')) {
			return {};
		}

		try {
			const nodeIdMap: { [prev: string]: string } = {};
			if (workflowData.nodes) {
				const nodeNames = new Set(workflowData.nodes.map((node) => node.name));
				workflowData.nodes.forEach((node: INode) => {
					// Provide a new name for nodes that don't have one
					if (!node.name) {
						const nodeType = nodeTypesStore.getNodeType(node.type);
						const newName = uniqueNodeName(
							nodeType?.displayName ?? node.type,
							Array.from(nodeNames),
						);
						node.name = newName;
						nodeNames.add(newName);
					}

					// Generate new webhookId if workflow already contains a node with the same webhookId
					if (node.webhookId && UPDATE_WEBHOOK_ID_NODE_TYPES.includes(node.type)) {
						const isDuplicate = Object.values(workflowHelpers.getCurrentWorkflow().nodes).some(
							(n) => n.webhookId === node.webhookId,
						);
						if (isDuplicate) {
							nodeHelpers.assignWebhookId(node);

							if (node.parameters.path) {
								node.parameters.path = node.webhookId;
							} else if ((node.parameters.options as IDataObject).path) {
								(node.parameters.options as IDataObject).path = node.webhookId;
							}
						}
					}

					// Set all new ids when pasting/importing workflows
					if (node.id) {
						const previousId = node.id;
						if (regenerateIds) {
							const newId = nodeHelpers.assignNodeId(node);
							nodeIdMap[newId] = previousId;
						}
					} else {
						nodeHelpers.assignNodeId(node);
					}
				});
			}

			removeUnknownCredentials(workflowData);

			const nodeGraph = JSON.stringify(
				TelemetryHelpers.generateNodesGraph(
					workflowData as IWorkflowBase,
					workflowHelpers.getNodeTypes(),
					{
						nodeIdMap,
						sourceInstanceId:
							workflowData.meta && workflowData.meta.instanceId !== rootStore.instanceId
								? workflowData.meta.instanceId
								: '',
						isCloudDeployment: settingsStore.isCloudDeployment,
					},
				).nodeGraph,
			);

			if (source === 'paste') {
				telemetry.track('User pasted nodes', {
					workflow_id: workflowsStore.workflowId,
					node_graph_string: nodeGraph,
				});
			} else if (source === 'duplicate') {
				telemetry.track('User duplicated nodes', {
					workflow_id: workflowsStore.workflowId,
					node_graph_string: nodeGraph,
				});
			} else {
				telemetry.track('User imported workflow', {
					source,
					workflow_id: workflowsStore.workflowId,
					node_graph_string: nodeGraph,
				});
			}

			// Fix the node position as it could be totally offscreen
			// and the pasted nodes would so not be directly visible to
			// the user
			workflowHelpers.updateNodePositions(
				workflowData,
				NodeViewUtils.getNewNodePosition(editableWorkflow.value.nodes, lastClickPosition.value, {
					...(workflowData.nodes && workflowData.nodes.length > 1
						? { size: getNodesGroupSize(workflowData.nodes) }
						: {}),
					viewport,
				}),
			);

			await addImportedNodesToWorkflow(workflowData, {
				trackBulk,
				trackHistory,
				viewport,
			});

			if (importTags && settingsStore.areTagsEnabled && Array.isArray(workflowData.tags)) {
				await importWorkflowTags(workflowData);
			}

			return workflowData;
		} catch (error) {
			toast.showError(error, i18n.baseText('nodeView.showError.importWorkflowData.title'));
			return {};
		}
	}

	async function importWorkflowTags(workflowData: WorkflowDataUpdate) {
		const allTags = await tagsStore.fetchAll();
		const tagNames = new Set(allTags.map((tag) => tag.name));

		const workflowTags = workflowData.tags as ITag[];
		const notFound = workflowTags.filter((tag) => !tagNames.has(tag.name));

		const creatingTagPromises: Array<Promise<ITag>> = [];
		for (const tag of notFound) {
			const creationPromise = tagsStore.create(tag.name).then((newTag: ITag) => {
				allTags.push(newTag);
				return newTag;
			});

			creatingTagPromises.push(creationPromise);
		}

		await Promise.all(creatingTagPromises);

		const tagIds = workflowTags.reduce((accu: string[], imported: ITag) => {
			const tag = allTags.find((t) => t.name === imported.name);
			if (tag) {
				accu.push(tag.id);
			}

			return accu;
		}, []);

		workflowsStore.addWorkflowTagIds(tagIds);
	}

	async function fetchWorkflowDataFromUrl(url: string): Promise<WorkflowDataUpdate | undefined> {
		let workflowData: WorkflowDataUpdate;

		canvasStore.startLoading();
		try {
			workflowData = await workflowsStore.getWorkflowFromUrl(url);
		} catch (error) {
			toast.showError(error, i18n.baseText('nodeView.showError.getWorkflowDataFromUrl.title'));
			return;
		} finally {
			canvasStore.stopLoading();
		}

		return workflowData;
	}

	function getNodesToSave(nodes: INode[]): WorkflowData {
		const data = {
			nodes: [] as INodeUi[],
			connections: {} as IConnections,
			pinData: {} as IPinData,
		} satisfies WorkflowData;

		const exportedNodeNames = new Set<string>();

		for (const node of nodes) {
			const nodeSaveData = workflowHelpers.getNodeDataToSave(node);
			const pinDataForNode = workflowsStore.pinDataByNodeName(node.name);

			if (pinDataForNode) {
				data.pinData[node.name] = pinDataForNode;
			}

			if (
				nodeSaveData.credentials &&
				settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]
			) {
				nodeSaveData.credentials = filterAllowedCredentials(
					nodeSaveData.credentials,
					workflowsStore.usedCredentials,
				);
			}

			data.nodes.push(nodeSaveData);
			exportedNodeNames.add(node.name);
		}

		data.connections = getConnectionsForNodes(data.nodes, exportedNodeNames);

		workflowHelpers.removeForeignCredentialsFromWorkflow(data, credentialsStore.allCredentials);

		return data;
	}

	function filterAllowedCredentials(
		credentials: INodeCredentials,
		usedCredentials: Record<string, IUsedCredential>,
	): INodeCredentials {
		return Object.fromEntries(
			Object.entries(credentials).filter(([, credential]) => {
				return (
					credential.id &&
					(!usedCredentials[credential.id] || usedCredentials[credential.id]?.currentUserHasAccess)
				);
			}),
		);
	}

	function getConnectionsForNodes(
		nodes: INodeUi[],
		includeNodeNames: Set<string>,
	): Record<string, INodeConnections> {
		const connections: Record<string, INodeConnections> = {};

		for (const node of nodes) {
			const outgoingConnections = workflowsStore.outgoingConnectionsByNodeName(node.name);
			if (!Object.keys(outgoingConnections).length) continue;

			const filteredConnections = filterConnectionsByNodes(outgoingConnections, includeNodeNames);
			if (Object.keys(filteredConnections).length) {
				connections[node.name] = filteredConnections;
			}
		}

		return connections;
	}

	function filterConnectionsByNodes(
		connections: INodeConnections,
		includeNodeNames: Set<string>,
	): INodeConnections {
		const filteredConnections: INodeConnections = {};

		for (const [type, typeConnections] of Object.entries(connections)) {
			const validConnections = typeConnections.map((sourceConnections) =>
				(sourceConnections ?? []).filter((connection) => includeNodeNames.has(connection.node)),
			);

			if (validConnections.length) {
				filteredConnections[type] = validConnections;
			}
		}

		return filteredConnections;
	}

	async function duplicateNodes(ids: string[], options: { viewport?: ViewportBoundaries } = {}) {
		const workflowData = deepCopy(getNodesToSave(workflowsStore.getNodesByIds(ids)));
		const result = await importWorkflowData(workflowData, 'duplicate', {
			viewport: options.viewport,
			importTags: false,
		});

		return result.nodes?.map((node) => node.id).filter(isPresent) ?? [];
	}

	async function copyNodes(ids: string[]) {
		const workflowData = deepCopy(getNodesToSave(workflowsStore.getNodesByIds(ids)));

		workflowData.meta = {
			...workflowData.meta,
			...workflowsStore.workflow.meta,
			instanceId: rootStore.instanceId,
		};

		await clipboard.copy(JSON.stringify(workflowData, null, 2));

		telemetry.track('User copied nodes', {
			node_types: workflowData.nodes.map((node) => node.type),
			workflow_id: workflowsStore.workflowId,
		});
	}

	async function cutNodes(ids: string[]) {
		await copyNodes(ids);
		deleteNodes(ids);
	}

	async function openExecution(executionId: string, nodeId?: string) {
		let data: IExecutionResponse | undefined;
		try {
			data = await workflowsStore.getExecution(executionId);
		} catch (error) {
			toast.showError(error, i18n.baseText('nodeView.showError.openExecution.title'));
			return;
		}

		if (data === undefined) {
			throw new Error(`Execution with id "${executionId}" could not be found!`);
		}

		if (data.status === 'error' && data.data?.resultData.error) {
			const { title, message } = getExecutionErrorToastConfiguration({
				error: data.data.resultData.error,
				lastNodeExecuted: data.data.resultData.lastNodeExecuted,
			});
			toast.showMessage({ title, message, type: 'error', duration: 0 });
		}

		initializeWorkspace(data.workflowData);

		workflowsStore.setWorkflowExecutionData(data);

		if (!['manual', 'evaluation'].includes(data.mode)) {
			workflowsStore.setWorkflowPinData({});
		}

		if (nodeId) {
			const node = workflowsStore.getNodeById(nodeId);
			if (node) {
				ndvStore.activeNodeName = node.name;
			} else {
				toast.showError(
					new Error(`Node with id "${nodeId}" could not be found!`),
					i18n.baseText('nodeView.showError.openExecution.node'),
				);
			}
		}

		uiStore.stateIsDirty = false;

		return data;
	}

	function startChat(source?: 'node' | 'main') {
		if (!workflowsStore.allNodes.some(isChatNode)) {
			return;
		}

		const workflow = workflowsStore.getCurrentWorkflow();

		logsStore.toggleOpen(true);

		const payload = {
			workflow_id: workflow.id,
			button_type: source,
		};

		void externalHooks.run('nodeView.onOpenChat', payload);
		telemetry.track('User clicked chat open button', payload);

		setTimeout(() => {
			chatEventBus.emit('focusInput');
		}, 0);
	}

	async function importTemplate({
		id,
		name,
		workflow,
	}: {
		id: string | number;
		name?: string;
		workflow: IWorkflowTemplate['workflow'] | WorkflowDataWithTemplateId;
	}) {
		const convertedNodes = workflow.nodes?.map(workflowsStore.convertTemplateNodeToNodeUi);

		if (workflow.connections) {
			workflowsStore.setConnections(workflow.connections);
		}
		await addNodes(convertedNodes ?? []);
		await workflowsStore.getNewWorkflowDataAndMakeShareable(name, projectsStore.currentProjectId);
		workflowsStore.addToWorkflowMetadata({ templateId: `${id}` });
	}

	function tryToOpenSubworkflowInNewTab(nodeId: string): boolean {
		const node = workflowsStore.getNodeById(nodeId);
		if (!node) return false;
		const subWorkflowId = NodeHelpers.getSubworkflowId(node);
		if (!subWorkflowId) return false;
		window.open(`${rootStore.baseUrl}workflow/${subWorkflowId}`, '_blank');
		return true;
	}

	return {
		lastClickPosition,
		editableWorkflow,
		editableWorkflowObject,
		triggerNodes,
		requireNodeTypeDescription,
		addNodes,
		addNode,
		resolveNodePosition,
		revertAddNode,
		updateNodesPosition,
		updateNodePosition,
		tidyUp,
		revertUpdateNodePosition,
		setNodeActive,
		setNodeActiveByName,
		clearNodeActive,
		setNodeSelected,
		toggleNodesDisabled,
		revertToggleNodeDisabled,
		toggleNodesPinned,
		setNodeParameters,
		renameNode,
		revertRenameNode,
		replaceNodeParameters,
		revertReplaceNodeParameters,
		deleteNode,
		deleteNodes,
		copyNodes,
		cutNodes,
		duplicateNodes,
		getNodesToSave,
		revertDeleteNode,
		addConnections,
		createConnection,
		revertCreateConnection,
		deleteConnection,
		revertDeleteConnection,
		deleteConnectionsByNodeId,
		revalidateNodeInputConnections,
		revalidateNodeOutputConnections,
		isConnectionAllowed,
		filterConnectionsByNodes,
		connectAdjacentNodes,
		importWorkflowData,
		fetchWorkflowDataFromUrl,
		resetWorkspace,
		initializeWorkspace,
		resolveNodeWebhook,
		openExecution,
		startChat,
		importTemplate,
		replaceNodeConnections,
		tryToOpenSubworkflowInNewTab,
	};
}
