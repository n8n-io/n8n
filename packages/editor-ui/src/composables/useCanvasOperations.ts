/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import type {
	AddedNodesAndConnections,
	INodeUi,
	ITag,
	IUsedCredential,
	IWorkflowData,
	IWorkflowDataUpdate,
	IWorkflowDb,
	XYPosition,
} from '@/Interface';
import { useDataSchema } from '@/composables/useDataSchema';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@/composables/useI18n';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { usePinnedData, type PinDataSource } from '@/composables/usePinnedData';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import {
	EnterpriseEditionFeature,
	FORM_TRIGGER_NODE_TYPE,
	QUICKSTART_NOTE_NAME,
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
} from '@/models/history';
import { useCanvasStore } from '@/stores/canvas.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useExecutionsStore } from '@/stores/executions.store';
import { useHistoryStore } from '@/stores/history.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRootStore } from '@/stores/root.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useTagsStore } from '@/stores/tags.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type {
	CanvasConnection,
	CanvasConnectionCreateData,
	CanvasNode,
	CanvasNodeMoveEvent,
} from '@/types';
import { CanvasConnectionMode } from '@/types';
import {
	createCanvasConnectionHandleString,
	getUniqueNodeName,
	mapCanvasConnectionToLegacyConnection,
	mapLegacyConnectionsToCanvasConnections,
	mapLegacyConnectionToCanvasConnection,
	parseCanvasConnectionHandleString,
} from '@/utils/canvasUtilsV2';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import { isValidNodeConnectionType } from '@/utils/typeGuards';
import type { Connection } from '@vue-flow/core';
import type {
	ConnectionTypes,
	IConnection,
	IConnections,
	INode,
	INodeConnections,
	INodeCredentials,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	INodeTypeDescription,
	INodeTypeNameVersion,
	IPinData,
	ITelemetryTrackProperties,
	IWorkflowBase,
	NodeInputConnections,
	NodeParameterValueType,
	Workflow,
} from 'n8n-workflow';
import { deepCopy, NodeConnectionType, NodeHelpers, TelemetryHelpers } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import type { Ref } from 'vue';
import { computed, nextTick } from 'vue';
import type { useRouter } from 'vue-router';
import { useClipboard } from '@/composables/useClipboard';
import { isPresent } from '../utils/typesUtils';

type AddNodeData = Partial<INodeUi> & {
	type: string;
};

type AddNodeOptions = {
	dragAndDrop?: boolean;
	openNDV?: boolean;
	trackHistory?: boolean;
	isAutoAdd?: boolean;
};

export function useCanvasOperations({
	router,
	lastClickPosition,
}: {
	router: ReturnType<typeof useRouter>;
	lastClickPosition: Ref<XYPosition>;
}) {
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

	const i18n = useI18n();
	const toast = useToast();
	const workflowHelpers = useWorkflowHelpers({ router });
	const nodeHelpers = useNodeHelpers();
	const telemetry = useTelemetry();
	const externalHooks = useExternalHooks();
	const clipboard = useClipboard();

	const editableWorkflow = computed(() => workflowsStore.workflow);
	const editableWorkflowObject = computed(() => workflowsStore.getCurrentWorkflow());

	const triggerNodes = computed<INodeUi[]>(() => {
		return workflowsStore.workflowTriggerNodes;
	});

	/**
	 * Node operations
	 */

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

		if (trackBulk) {
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
			historyStore.pushCommandToUndo(new MoveNodeCommand(node.name, oldPosition, newPosition));
		}
	}

	function revertUpdateNodePosition(nodeName: string, position: CanvasNode['position']) {
		const node = workflowsStore.getNodeByName(nodeName);
		if (!node) {
			return;
		}

		updateNodePosition(node.id, position);
	}

	async function renameNode(currentName: string, newName: string, { trackHistory = false } = {}) {
		if (currentName === newName) {
			return;
		}

		if (trackHistory) {
			historyStore.startRecordingUndo();
		}

		newName = getUniqueNodeName(newName, workflowsStore.canvasNames);

		// Rename the node and update the connections
		const workflow = workflowsStore.getCurrentWorkflow(true);
		workflow.renameNode(currentName, newName);

		if (trackHistory) {
			historyStore.pushCommandToUndo(new RenameNodeCommand(currentName, newName));
		}

		// Update also last selected node and execution data
		workflowsStore.renameNodeSelectedAndExecution({ old: currentName, new: newName });

		workflowsStore.setNodes(Object.values(workflow.nodes));
		workflowsStore.setConnections(workflow.connectionsBySourceNode);

		const isRenamingActiveNode = ndvStore.activeNodeName === currentName;
		if (isRenamingActiveNode) {
			ndvStore.activeNodeName = newName;
		}

		if (trackHistory) {
			historyStore.stopRecordingUndo();
		}
	}

	async function revertRenameNode(currentName: string, previousName: string) {
		await renameNode(currentName, previousName);
	}

	function connectAdjacentNodes(id: string) {
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

					createConnection({
						source: incomingNodeId,
						sourceHandle: createCanvasConnectionHandleString({
							mode: CanvasConnectionMode.Output,
							type,
						}),
						target: outgoingNodeId,
						targetHandle: createCanvasConnectionHandleString({
							mode: CanvasConnectionMode.Input,
							type,
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

		connectAdjacentNodes(id);
		workflowsStore.removeNodeConnectionsById(id);
		workflowsStore.removeNodeExecutionDataById(id);
		workflowsStore.removeNodeById(id);

		if (trackHistory) {
			historyStore.pushCommandToUndo(new RemoveNodeCommand(node));

			if (trackBulk) {
				historyStore.stopRecordingUndo();
			}
		}

		trackDeleteNode(id);
	}

	function deleteNodes(ids: string[]) {
		historyStore.startRecordingUndo();
		ids.forEach((id) => deleteNode(id, { trackHistory: true, trackBulk: false }));
		historyStore.stopRecordingUndo();
	}

	function revertDeleteNode(node: INodeUi) {
		workflowsStore.addNode(node);
	}

	function trackDeleteNode(id: string) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		if (node.type === STICKY_NODE_TYPE) {
			telemetry.track('User deleted workflow note', {
				workflow_id: workflowsStore.workflowId,
				is_welcome_note: node.name === QUICKSTART_NOTE_NAME,
			});
		} else {
			void externalHooks.run('node.deleteNode', { node });
			telemetry.track('User deleted node', {
				node_type: node.type,
				workflow_id: workflowsStore.workflowId,
			});
		}
	}

	function setNodeActive(id: string) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		setNodeActiveByName(node.name);
	}

	function setNodeActiveByName(name: string) {
		ndvStore.activeNodeName = name;
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
			uiStore.lastSelectedNode = '';
			return;
		}

		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		uiStore.lastSelectedNode = node.name;
	}

	function toggleNodesDisabled(
		ids: string[],
		{ trackHistory = true, trackBulk = true }: { trackHistory?: boolean; trackBulk?: boolean } = {},
	) {
		if (trackBulk) {
			historyStore.startRecordingUndo();
		}

		const nodes = workflowsStore.getNodesByIds(ids);
		nodeHelpers.disableNodes(nodes, trackHistory);

		if (trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	function revertToggleNodeDisabled(nodeName: string) {
		const node = workflowsStore.getNodeByName(nodeName);
		if (node) {
			nodeHelpers.disableNodes([node]);
		}
	}

	function toggleNodesPinned(ids: string[], source: PinDataSource) {
		historyStore.startRecordingUndo();

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

		historyStore.stopRecordingUndo();
	}

	async function addNodes(
		nodes: AddedNodesAndConnections['nodes'],
		options: {
			dragAndDrop?: boolean;
			position?: XYPosition;
			trackHistory?: boolean;
			trackBulk?: boolean;
		} = {},
	) {
		let insertPosition = options.position;
		let lastAddedNode: INodeUi | undefined;

		if (options.trackBulk) {
			historyStore.startRecordingUndo();
		}

		for (const nodeAddData of nodes) {
			const { isAutoAdd, openDetail: openNDV, ...node } = nodeAddData;
			const position = node.position ?? insertPosition;

			try {
				lastAddedNode = await addNode(
					{
						...node,
						position,
					},
					{
						...options,
						openNDV,
						isAutoAdd,
						trackHistory: options.trackHistory,
					},
				);
			} catch (error) {
				toast.showError(error, i18n.baseText('error'));
				continue;
			}

			// When we're adding multiple nodes, increment the X position for the next one
			insertPosition = [
				lastAddedNode.position[0] + NodeViewUtils.NODE_SIZE * 2 + NodeViewUtils.GRID_SIZE,
				lastAddedNode.position[1],
			];
		}

		if (lastAddedNode) {
			// @TODO Figure out what this does and why it's needed
			updatePositionForNodeWithMultipleInputs(lastAddedNode);
		}

		if (options.trackBulk) {
			historyStore.stopRecordingUndo();
		}
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

	async function addNode(node: AddNodeData, options: AddNodeOptions = {}): Promise<INodeUi> {
		const nodeTypeDescription = nodeTypesStore.getNodeType(node.type);
		if (!nodeTypeDescription) {
			throw new Error(
				i18n.baseText('nodeView.showMessage.addNodeButton.message', {
					interpolate: { nodeTypeName: node.type },
				}),
			);
		}

		// Check if maximum allowed number of this type of node has been reached
		if (
			nodeTypeDescription.maxNodes !== undefined &&
			workflowHelpers.getNodeTypeCount(node.type) >= nodeTypeDescription.maxNodes
		) {
			throw new Error(
				i18n.baseText('nodeView.showMessage.showMaxNodeTypeError.message', {
					adjustToNumber: nodeTypeDescription.maxNodes,
					interpolate: { nodeTypeDataDisplayName: nodeTypeDescription.displayName },
				}),
			);
		}

		const nodeData = await resolveNodeData(node, nodeTypeDescription);
		if (!nodeData) {
			throw new Error(i18n.baseText('nodeViewV2.showError.failedToCreateNode'));
		}

		historyStore.startRecordingUndo();
		if (options.trackHistory) {
			historyStore.pushCommandToUndo(new AddNodeCommand(nodeData));
		}

		workflowsStore.addNode(nodeData);
		nodeHelpers.matchCredentials(nodeData);

		if (!options.isAutoAdd) {
			createConnectionToLastInteractedWithNode(nodeData, options);
		}

		runAddNodeHooks(nodeData, options);

		historyStore.stopRecordingUndo();

		workflowsStore.setNodePristine(nodeData.name, true);
		uiStore.stateIsDirty = true;

		if (options.openNDV) {
			void nextTick(() => {
				ndvStore.setActiveNodeName(nodeData.name);
			});
		}

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
					type: NodeConnectionType.Main,
					index: 0,
				}),
				target: node.id,
				targetHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Input,
					type: NodeConnectionType.Main,
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
						type: NodeConnectionType.Main,
						index: 0,
					}),
					target: lastInteractedWithNodeConnection.target,
					targetHandle: lastInteractedWithNodeConnection.targetHandle,
				});
			}
		}
	}

	function runAddNodeHooks(nodeData: INodeUi, options: AddNodeOptions) {
		switch (nodeData.type) {
			case STICKY_NODE_TYPE:
				trackAddStickyNoteNode();
				break;
			default:
				void externalHooks.run('nodeView.addNodeButton', { nodeTypeName: nodeData.type });
				trackAddDefaultNode(nodeData, options);
		}
	}

	function trackAddStickyNoteNode() {
		telemetry.trackNodesPanel('nodeView.addSticky', {
			workflow_id: workflowsStore.workflowId,
		});
	}

	function trackAddDefaultNode(nodeData: INodeUi, options: AddNodeOptions) {
		const trackProperties: ITelemetryTrackProperties = {
			node_type: nodeData.type,
			node_version: nodeData.typeVersion,
			is_auto_add: options.isAutoAdd,
			workflow_id: workflowsStore.workflowId,
			drag_and_drop: options.dragAndDrop,
		};

		if (uiStore.lastInteractedWithNode) {
			trackProperties.input_node_type = uiStore.lastInteractedWithNode.type;
		}

		telemetry.trackNodesPanel('nodeView.addNodeButton', trackProperties);
	}

	/**
	 * Resolves the data for a new node
	 */
	async function resolveNodeData(node: AddNodeData, nodeTypeDescription: INodeTypeDescription) {
		const id = node.id ?? uuid();
		const name = node.name ?? (nodeTypeDescription.defaults.name as string);
		const type = nodeTypeDescription.name;
		const typeVersion = resolveNodeVersion(nodeTypeDescription);
		const position = resolveNodePosition(node as INodeUi, nodeTypeDescription);
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

		await loadNodeTypesProperties([{ name: nodeData.type, version: nodeData.typeVersion }]);

		resolveNodeParameters(nodeData);
		resolveNodeCredentials(nodeData, nodeTypeDescription);
		resolveNodeName(nodeData);
		resolveNodeWebhook(nodeData, nodeTypeDescription);

		return nodeData;
	}

	async function loadNodeTypesProperties(nodeInfos: INodeTypeNameVersion[]): Promise<void> {
		const allNodeTypeDescriptions: INodeTypeDescription[] = nodeTypesStore.allNodeTypes;

		const nodesToBeFetched: INodeTypeNameVersion[] = [];
		allNodeTypeDescriptions.forEach((nodeTypeDescription) => {
			const nodeVersions = Array.isArray(nodeTypeDescription.version)
				? nodeTypeDescription.version
				: [nodeTypeDescription.version];
			if (
				!!nodeInfos.find(
					(n) => n.name === nodeTypeDescription.name && nodeVersions.includes(n.version),
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

	function resolveNodeParameters(node: INodeUi) {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		const nodeParameters = NodeHelpers.getNodeParameters(
			nodeType?.properties ?? [],
			node.parameters,
			true,
			false,
			node,
		);

		node.parameters = nodeParameters ?? {};
	}

	function resolveNodeCredentials(node: INodeUi, nodeTypeDescription: INodeTypeDescription) {
		const credentialPerType = nodeTypeDescription.credentials
			?.map((type) => credentialsStore.getUsableCredentialByType(type.name))
			.flat();

		if (credentialPerType?.length === 1) {
			const defaultCredential = credentialPerType[0];

			const selectedCredentials = credentialsStore.getCredentialById(defaultCredential.id);
			const selected = { id: selectedCredentials.id, name: selectedCredentials.name };
			const credentials = {
				[defaultCredential.type]: selected,
			};

			if (nodeTypeDescription.credentials) {
				const authentication = nodeTypeDescription.credentials.find(
					(type) => type.name === defaultCredential.type,
				);

				const authDisplayOptionsHide = authentication?.displayOptions?.hide;
				const authDisplayOptionsShow = authentication?.displayOptions?.show;

				if (!authDisplayOptionsHide) {
					if (!authDisplayOptionsShow) {
						node.credentials = credentials;
					} else if (
						Object.keys(authDisplayOptionsShow).length === 1 &&
						authDisplayOptionsShow.authentication
					) {
						// ignore complex case when there's multiple dependencies
						node.credentials = credentials;

						let parameters: { [key: string]: string } = {};
						for (const displayOption of Object.keys(authDisplayOptionsShow)) {
							if (node.parameters && !node.parameters[displayOption]) {
								parameters = {};
								node.credentials = undefined;
								break;
							}
							const optionValue = authDisplayOptionsShow[displayOption]?.[0];
							if (optionValue && typeof optionValue === 'string') {
								parameters[displayOption] = optionValue;
							}
							node.parameters = {
								...node.parameters,
								...parameters,
							};
						}
					}
				}
			}
		}
	}

	function resolveNodePosition(node: INodeUi, nodeTypeDescription: INodeTypeDescription) {
		if (node.position) {
			return NodeViewUtils.getNewNodePosition(
				canvasStore.getNodesWithPlaceholderNode(),
				node.position,
			);
		}

		const lastInteractedWithNode = uiStore.lastInteractedWithNode;
		const lastInteractedWithNodeConnection = uiStore.lastInteractedWithNodeConnection;
		if (lastInteractedWithNode) {
			const lastSelectedNodeTypeDescription = nodeTypesStore.getNodeType(
				lastInteractedWithNode.type,
				lastInteractedWithNode.typeVersion,
			);
			const lastInteractedWithNodeObject = editableWorkflowObject.value.getNode(
				lastInteractedWithNode.name,
			);

			if (lastInteractedWithNodeConnection) {
				shiftDownstreamNodesPosition(lastInteractedWithNode.name, NodeViewUtils.PUSH_NODES_OFFSET, {
					trackHistory: true,
				});
			}

			// This position is set in `onMouseUp` when pulling connections
			const newNodeInsertPosition = canvasStore.newNodeInsertPosition;
			if (newNodeInsertPosition) {
				canvasStore.newNodeInsertPosition = null;
				return NodeViewUtils.getNewNodePosition(workflowsStore.allNodes, [
					newNodeInsertPosition[0] + NodeViewUtils.GRID_SIZE,
					newNodeInsertPosition[1] - NodeViewUtils.NODE_SIZE / 2,
				]);
			} else {
				let yOffset = 0;

				// Compute the y offset for the new node based on the number of main outputs of the source node
				if (uiStore.lastInteractedWithNodeConnection) {
					const sourceNodeType = nodeTypesStore.getNodeType(
						lastInteractedWithNode.type,
						lastInteractedWithNode.typeVersion,
					);

					if (sourceNodeType) {
						const offsets = [
							[-100, 100],
							[-140, 0, 140],
							[-240, -100, 100, 240],
						];

						const sourceNodeOutputs = NodeHelpers.getNodeOutputs(
							editableWorkflowObject.value,
							lastInteractedWithNode,
							sourceNodeType,
						);
						const sourceNodeOutputTypes = NodeHelpers.getConnectionTypes(sourceNodeOutputs);
						const sourceNodeOutputMainOutputs = sourceNodeOutputTypes.filter(
							(output) => output === NodeConnectionType.Main,
						);

						if (sourceNodeOutputMainOutputs.length > 1) {
							const { index: sourceOutputIndex } = parseCanvasConnectionHandleString(
								uiStore.lastInteractedWithNodeConnection.sourceHandle,
							);
							const offset = offsets[sourceNodeOutputMainOutputs.length - 2];
							yOffset = offset[sourceOutputIndex];
						}
					}
				}

				let outputs: Array<ConnectionTypes | INodeOutputConfiguration> = [];
				try {
					// It fails when the outputs are an expression. As those nodes have
					// normally no outputs by default and the only reason we need the
					// outputs here is to calculate the position, it is fine to assume
					// that they have no outputs and are so treated as a regular node
					// with only "main" outputs.
					outputs = NodeHelpers.getNodeOutputs(
						editableWorkflowObject.value,
						node,
						nodeTypeDescription,
					);
				} catch (e) {}
				const outputTypes = NodeHelpers.getConnectionTypes(outputs);

				// If node has only scoped outputs, position it below the last selected node
				if (lastSelectedNodeTypeDescription) {
					if (
						lastInteractedWithNodeObject &&
						outputTypes.length > 0 &&
						outputTypes.every((outputName) => outputName !== NodeConnectionType.Main)
					) {
						const lastSelectedInputs = NodeHelpers.getNodeInputs(
							editableWorkflowObject.value,
							lastInteractedWithNodeObject,
							lastSelectedNodeTypeDescription,
						);
						const lastSelectedInputTypes = NodeHelpers.getConnectionTypes(lastSelectedInputs);

						const scopedConnectionIndex = (lastSelectedInputTypes || [])
							.filter((input) => input !== NodeConnectionType.Main)
							.findIndex((inputType) => outputs[0] === inputType);

						return NodeViewUtils.getNewNodePosition(
							workflowsStore.allNodes,
							[
								lastInteractedWithNode.position[0] +
									(NodeViewUtils.NODE_SIZE /
										(Math.max(lastSelectedNodeTypeDescription?.inputs?.length ?? 1), 1)) *
										scopedConnectionIndex,
								lastInteractedWithNode.position[1] + NodeViewUtils.PUSH_NODES_OFFSET,
							],
							[100, 0],
						);
					} else {
						// Has only main outputs or no outputs at all
						const inputs = NodeHelpers.getNodeInputs(
							editableWorkflowObject.value,
							lastInteractedWithNode,
							lastSelectedNodeTypeDescription,
						);
						const inputsTypes = NodeHelpers.getConnectionTypes(inputs);

						let pushOffset = NodeViewUtils.PUSH_NODES_OFFSET;
						if (!!inputsTypes.find((input) => input !== NodeConnectionType.Main)) {
							// If the node has scoped inputs, push it down a bit more
							pushOffset += 150;
						}

						// If a node is active then add the new node directly after the current one
						return NodeViewUtils.getNewNodePosition(
							workflowsStore.allNodes,
							[
								lastInteractedWithNode.position[0] + pushOffset,
								lastInteractedWithNode.position[1] + yOffset,
							],
							[100, 0],
						);
					}
				}
			}
		}

		// If added node is a trigger and it's the first one added to the canvas
		// we place it at canvasAddButtonPosition to replace the canvas add button
		const position =
			nodeTypesStore.isTriggerNode(node.type) && triggerNodes.value.length === 0
				? canvasStore.canvasAddButtonPosition
				: // If no node is active find a free spot
					(lastClickPosition.value as XYPosition);

		return NodeViewUtils.getNewNodePosition(workflowsStore.allNodes, position);
	}

	function resolveNodeName(node: INodeUi) {
		const localizedName = i18n.localizeNodeName(node.name, node.type);

		node.name = getUniqueNodeName(localizedName, workflowsStore.canvasNames);
	}

	function resolveNodeWebhook(node: INodeUi, nodeTypeDescription: INodeTypeDescription) {
		if (nodeTypeDescription.webhooks?.length) {
			node.webhookId = uuid();
		}

		// if it's a webhook and the path is empty set the UUID as the default path
		if (
			[WEBHOOK_NODE_TYPE, FORM_TRIGGER_NODE_TYPE].includes(node.type) &&
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
			if (node.position[0] < sourceNode.position[0]) {
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

	function createConnection(connection: Connection, { trackHistory = false } = {}) {
		const sourceNode = workflowsStore.getNodeById(connection.source);
		const targetNode = workflowsStore.getNodeById(connection.target);
		if (!sourceNode || !targetNode) {
			return;
		}

		if (trackHistory) {
			historyStore.pushCommandToUndo(
				new AddConnectionCommand(
					mapCanvasConnectionToLegacyConnection(sourceNode, targetNode, connection),
				),
			);
		}

		const mappedConnection = mapCanvasConnectionToLegacyConnection(
			sourceNode,
			targetNode,
			connection,
		);

		if (!isConnectionAllowed(sourceNode, targetNode, mappedConnection[1].type)) {
			return;
		}

		workflowsStore.addConnection({
			connection: mappedConnection,
		});

		nodeHelpers.updateNodeInputIssues(sourceNode);
		nodeHelpers.updateNodeInputIssues(targetNode);

		uiStore.stateIsDirty = true;
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
			historyStore.pushCommandToUndo(new RemoveConnectionCommand(mappedConnection));

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

	function isConnectionAllowed(
		sourceNode: INodeUi,
		targetNode: INodeUi,
		connectionType: NodeConnectionType,
	): boolean {
		const blocklist = [STICKY_NODE_TYPE];

		if (sourceNode.id === targetNode.id) {
			return false;
		}

		if (blocklist.includes(sourceNode.type) || blocklist.includes(targetNode.type)) {
			return false;
		}

		const targetNodeType = nodeTypesStore.getNodeType(targetNode.type, targetNode.typeVersion);
		if (targetNodeType?.inputs?.length) {
			const workflowNode = editableWorkflowObject.value.getNode(targetNode.name);
			if (!workflowNode) {
				return false;
			}

			let inputs: Array<ConnectionTypes | INodeInputConfiguration> = [];
			if (targetNodeType) {
				inputs =
					NodeHelpers.getNodeInputs(editableWorkflowObject.value, workflowNode, targetNodeType) ||
					[];
			}

			let targetHasConnectionTypeAsInput = false;
			for (const input of inputs) {
				const inputType = typeof input === 'string' ? input : input.type;
				if (inputType === connectionType) {
					if (typeof input === 'object' && 'filter' in input && input.filter?.nodes.length) {
						if (!input.filter.nodes.includes(sourceNode.type)) {
							// this.dropPrevented = true;
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
					}

					targetHasConnectionTypeAsInput = true;
				}
			}

			return targetHasConnectionTypeAsInput;
		}

		return false;
	}

	async function addConnections(connections: CanvasConnectionCreateData[] | CanvasConnection[]) {
		for (const { source, target, data } of connections) {
			createConnection({
				source,
				sourceHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Output,
					type: isValidNodeConnectionType(data?.source.type)
						? data?.source.type
						: NodeConnectionType.Main,
					index: data?.source.index ?? 0,
				}),
				target,
				targetHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Input,
					type: isValidNodeConnectionType(data?.target.type)
						? data?.target.type
						: NodeConnectionType.Main,
					index: data?.target.index ?? 0,
				}),
			});
		}
	}

	/**
	 * Workspace operations
	 */

	function resetWorkspace() {
		// Reset node creator
		nodeCreatorStore.openNodeCreator({ createNodeActive: false });
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

		// Reset actions
		uiStore.removeActiveAction('workflowRunning');
		uiStore.stateIsDirty = false;

		// Reset executions
		executionsStore.activeExecution = null;

		// Reset credentials updates
		nodeHelpers.credentialsUpdated.value = false;
	}

	async function initializeWorkspace(data: IWorkflowDb) {
		// Set workflow data
		await workflowHelpers.initState(data);

		// Add nodes and connections
		await addNodes(data.nodes);
		workflowsStore.setConnections(data.connections);
	}

	/**
	 * Import operations
	 */

	function removeUnknownCredentials(workflow: IWorkflowDataUpdate) {
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
		data: IWorkflowDataUpdate,
	): Promise<IWorkflowDataUpdate> {
		// Because nodes with the same name maybe already exist, it could
		// be needed that they have to be renamed. Also could it be possible
		// that nodes are not allowed to be created because they have a create
		// limit set. So we would then link the new nodes with the already existing ones.
		// In this object all that nodes get saved in the format:
		//   old-name -> new-name
		const nodeNameTable: {
			[key: string]: string;
		} = {};
		const newNodeNames = new Set<string>();

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

			const localized = i18n.localizeNodeName(node.name, node.type);

			newName = getUniqueNodeName(localized, newNodeNames);

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
					if (currentConnections[sourceNode][type][sourceIndex]) {
						for (
							connectionIndex = 0;
							connectionIndex < currentConnections[sourceNode][type][sourceIndex].length;
							connectionIndex++
						) {
							connectionData = currentConnections[sourceNode][type][sourceIndex][connectionIndex];
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
		const tempWorkflow: Workflow = workflowHelpers.getWorkflow(createNodes, newConnections);

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
		historyStore.startRecordingUndo();

		await addNodes(Object.values(tempWorkflow.nodes));
		await addConnections(
			mapLegacyConnectionsToCanvasConnections(
				tempWorkflow.connectionsBySourceNode,
				Object.values(tempWorkflow.nodes),
			),
		);

		historyStore.stopRecordingUndo();
		uiStore.stateIsDirty = true;

		return {
			nodes: Object.values(tempWorkflow.nodes),
			connections: tempWorkflow.connectionsBySourceNode,
		};
	}

	async function importWorkflowData(
		workflowData: IWorkflowDataUpdate,
		source: string,
		importTags = true,
	): Promise<IWorkflowDataUpdate> {
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
						const newName = getUniqueNodeName(nodeType?.displayName ?? node.type, nodeNames);
						node.name = newName;
						nodeNames.add(newName);
					}

					// Generate new webhookId if workflow already contains a node with the same webhookId
					if (node.webhookId && UPDATE_WEBHOOK_ID_NODE_TYPES.includes(node.type)) {
						const isDuplicate = Object.values(workflowHelpers.getCurrentWorkflow().nodes).some(
							(n) => n.webhookId === node.webhookId,
						);
						if (isDuplicate) {
							node.webhookId = uuid();
						}
					}

					// set all new ids when pasting/importing workflows
					if (node.id) {
						const newId = uuid();
						nodeIdMap[newId] = node.id;
						node.id = newId;
					} else {
						node.id = uuid();
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
				NodeViewUtils.getNewNodePosition(editableWorkflow.value.nodes, lastClickPosition.value),
			);

			await addImportedNodesToWorkflow(workflowData);

			if (importTags && settingsStore.areTagsEnabled && Array.isArray(workflowData.tags)) {
				await importWorkflowTags(workflowData);
			}

			return workflowData;
		} catch (error) {
			toast.showError(error, i18n.baseText('nodeView.showError.importWorkflowData.title'));
			return {};
		}
	}

	async function importWorkflowTags(workflowData: IWorkflowDataUpdate) {
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
		setTimeout(() => {
			nodeHelpers.addPinDataConnections(workflowsStore.pinnedWorkflowData);
		});
	}

	async function fetchWorkflowDataFromUrl(url: string): Promise<IWorkflowDataUpdate | undefined> {
		let workflowData: IWorkflowDataUpdate;

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

	function getNodesToSave(nodes: INode[]): IWorkflowData {
		const data = {
			nodes: [] as INodeUi[],
			connections: {} as IConnections,
			pinData: {} as IPinData,
		} satisfies IWorkflowData;

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
		connections: Record<string, IConnection[][]>,
		includeNodeNames: Set<string>,
	): INodeConnections {
		const filteredConnections: INodeConnections = {};

		for (const [type, typeConnections] of Object.entries(connections)) {
			const validConnections = typeConnections
				.map((sourceConnections) =>
					sourceConnections.filter((connection) => includeNodeNames.has(connection.node)),
				)
				.filter((sourceConnections) => sourceConnections.length > 0);

			if (validConnections.length) {
				filteredConnections[type] = validConnections;
			}
		}

		return filteredConnections;
	}

	async function duplicateNodes(ids: string[]) {
		const workflowData = deepCopy(getNodesToSave(workflowsStore.getNodesByIds(ids)));
		const result = await importWorkflowData(workflowData, 'duplicate', false);

		return result.nodes?.map((node) => node.id).filter(isPresent) ?? [];
	}

	async function copyNodes(ids: string[]) {
		const workflowData = deepCopy(getNodesToSave(workflowsStore.getNodesByIds(ids)));

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

	return {
		editableWorkflow,
		editableWorkflowObject,
		triggerNodes,
		addNodes,
		addNode,
		revertAddNode,
		updateNodesPosition,
		updateNodePosition,
		revertUpdateNodePosition,
		setNodeActive,
		setNodeActiveByName,
		setNodeSelected,
		toggleNodesDisabled,
		revertToggleNodeDisabled,
		toggleNodesPinned,
		setNodeParameters,
		renameNode,
		revertRenameNode,
		deleteNode,
		deleteNodes,
		copyNodes,
		cutNodes,
		duplicateNodes,
		revertDeleteNode,
		addConnections,
		createConnection,
		revertCreateConnection,
		deleteConnection,
		revertDeleteConnection,
		isConnectionAllowed,
		importWorkflowData,
		fetchWorkflowDataFromUrl,
		resetWorkspace,
		initializeWorkspace,
	};
}
