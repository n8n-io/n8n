/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import type {
	AddedNode,
	AddedNodeConnection,
	AddedNodesAndConnections,
	INodeUi,
	IWorkflowDb,
	WorkflowDataWithTemplateId,
	XYPosition,
} from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { IUsedCredential } from '@/features/credentials/credentials.types';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import type { IWorkflowTemplate } from '@n8n/rest-api-client/api/templates';
import type { WorkflowData, WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { useDataSchema } from '@/app/composables/useDataSchema';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useI18n } from '@n8n/i18n';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { type PinDataSource, usePinnedData } from '@/app/composables/usePinnedData';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';
import { getExecutionErrorToastConfiguration } from '@/features/execution/executions/executions.utils';
import {
	EnterpriseEditionFeature,
	FORM_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
	STICKY_NODE_TYPE,
	UPDATE_WEBHOOK_ID_NODE_TYPES,
	VIEWS,
	WEBHOOK_NODE_TYPE,
} from '@/app/constants';
import {
	AddConnectionCommand,
	AddNodeCommand,
	MoveNodeCommand,
	RemoveConnectionCommand,
	RemoveNodeCommand,
	RenameNodeCommand,
	ReplaceNodeParametersCommand,
} from '@/app/models/history';
import { useCanvasStore } from '@/app/stores/canvas.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { useHistoryStore } from '@/app/stores/history.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type {
	CanvasConnection,
	CanvasConnectionCreateData,
	CanvasConnectionPort,
	CanvasNode,
	CanvasNodeMoveEvent,
	ViewportBoundaries,
} from '@/features/workflows/canvas/canvas.types';
import { CanvasConnectionMode } from '@/features/workflows/canvas/canvas.types';
import {
	createCanvasConnectionHandleString,
	mapCanvasConnectionToLegacyConnection,
	mapLegacyConnectionsToCanvasConnections,
	mapLegacyConnectionToCanvasConnection,
	parseCanvasConnectionHandleString,
} from '@/features/workflows/canvas/canvas.utils';
import * as NodeViewUtils from '@/app/utils/nodeViewUtils';
import {
	GRID_SIZE,
	CONFIGURABLE_NODE_SIZE,
	CONFIGURATION_NODE_SIZE,
	DEFAULT_NODE_SIZE,
	DEFAULT_VIEWPORT_BOUNDARIES,
	generateOffsets,
	getNodesGroupSize,
	PUSH_NODES_OFFSET,
	doRectsOverlap,
} from '@/app/utils/nodeViewUtils';
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
	INodeFilter,
} from 'n8n-workflow';
import {
	deepCopy,
	NodeConnectionTypes,
	NodeHelpers,
	TelemetryHelpers,
	isCommunityPackageName,
	isHitlToolType,
} from 'n8n-workflow';
import { computed, nextTick, ref } from 'vue';
import { useUniqueNodeName } from '@/app/composables/useUniqueNodeName';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { isPresent, tryToParseNumber } from '@/app/utils/typesUtils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { CanvasLayoutEvent } from '@/features/workflows/canvas/composables/useCanvasLayout';
import { chatEventBus } from '@n8n/chat/event-buses';
import { useLogsStore } from '@/app/stores/logs.store';
import { isChatNode } from '@/app/utils/aiUtils';
import cloneDeep from 'lodash/cloneDeep';
import uniq from 'lodash/uniq';
import { useExperimentalNdvStore } from '@/features/workflows/canvas/experimental/experimentalNdv.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import type { TelemetryNdvSource, TelemetryNdvType } from '@/app/types/telemetry';
import { useRoute, useRouter } from 'vue-router';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { isValidNodeConnectionType } from '@/app/utils/typeGuards';
import { useParentFolder } from '@/features/core/folders/composables/useParentFolder';
import { removePreviewToken } from '@/features/shared/nodeCreator/nodeCreator.utils';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useClipboard } from '@vueuse/core';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

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
	actionName?: string;
};

export function useCanvasOperations() {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
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
	const experimentalNdvStore = useExperimentalNdvStore();
	const templatesStore = useTemplatesStore();
	const focusPanelStore = useFocusPanelStore();

	const i18n = useI18n();
	const toast = useToast();
	const workflowHelpers = useWorkflowHelpers();
	const nodeHelpers = useNodeHelpers();
	const telemetry = useTelemetry();
	const externalHooks = useExternalHooks();
	const clipboard = useClipboard();
	const { uniqueNodeName } = useUniqueNodeName();
	const { fetchAndSetParentFolder } = useParentFolder();

	const router = useRouter();
	const route = useRoute();

	const lastClickPosition = ref<XYPosition>([0, 0]);

	const preventOpeningNDV = !!localStorage.getItem('NodeView.preventOpeningNDV');

	const editableWorkflow = computed<IWorkflowDb>(() => workflowsStore.workflow);
	const editableWorkflowObject = computed(() => workflowsStore.workflowObject as Workflow);

	const triggerNodes = computed<INodeUi[]>(() => {
		return workflowsStore.workflowTriggerNodes;
	});

	/**
	 * Node operations
	 */

	function tidyUp(
		{ result, source, target }: CanvasLayoutEvent,
		{
			trackEvents = true,
			trackHistory = true,
			trackBulk = true,
		}: {
			trackEvents?: boolean;
			trackHistory?: boolean;
			trackBulk?: boolean;
		} = {},
	) {
		updateNodesPosition(
			result.nodes.map(({ id, x, y }) => ({ id, position: { x, y } })),
			{ trackBulk, trackHistory },
		);

		if (trackEvents) {
			trackTidyUp({ result, source, target });
		}
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

		workflowState.setNodePositionById(id, newPosition);

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
		workflowState.setNodeParameters({
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

	/**
	 * Rename a node and update all references (connections, expressions, pinData, etc.)
	 * @returns The actual new name used (after uniquification) if rename succeeded, `false` if it failed or was skipped
	 */
	async function renameNode(
		currentName: string,
		newName: string,
		{ trackHistory = false, trackBulk = true, showErrorToast = true } = {},
	): Promise<string | false> {
		if (currentName === newName) {
			return false;
		}

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		newName = uniqueNodeName(newName);

		// Rename the node and update the connections
		const workflow = workflowsStore.cloneWorkflowObject();
		try {
			workflow.renameNode(currentName, newName);
		} catch (error) {
			if (showErrorToast) {
				toast.showMessage({
					type: 'error',
					title: error.message,
					message: error.description,
				});
			}
			return false;
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
			ndvStore.setActiveNodeName(newName, 'other');
		}

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}

		return newName;
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
		uiStore.markStateDirty();
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
		const workflowObject = workflowsStore.workflowObject;

		const inputNodeNames = replaceInputs
			? uniq(workflowObject.getParentNodes(previousNode.name, 'ALL', 1))
			: [];
		const outputNodeNames = replaceOutputs
			? uniq(workflowObject.getChildNodes(previousNode.name, 'ALL', 1))
			: [];
		const connectionPairs = [
			...workflowObject.getConnectionsBetweenNodes(inputNodeNames, [previousNode.name]),
			...workflowObject.getConnectionsBetweenNodes([previousNode.name], outputNodeNames),
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

			const newSourceIConnection = {
				...pair[0],
				node: pair[0].node === previousNode.name ? newNode.name : pair[0].node,
			};
			const newTargetIConnection = {
				...pair[1],
				node: pair[1].node === previousNode.name ? newNode.name : pair[1].node,
			};

			const newSourceNode = sourceNode.name === previousNode.name ? newNode : sourceNode;
			const newTargetNode = targetNode.name === previousNode.name ? newNode : targetNode;

			if (
				!isConnectionAllowed(
					newSourceNode,
					newTargetNode,
					newSourceIConnection,
					newTargetIConnection,
				)
			)
				continue;

			const newCanvasConnection = mapLegacyConnectionToCanvasConnection(
				newSourceNode,
				newTargetNode,
				[newSourceIConnection, newTargetIConnection],
			);

			createConnection(newCanvasConnection, { trackHistory });
			revalidateNodeInputConnections(newCanvasConnection.target);
			revalidateNodeOutputConnections(newCanvasConnection.source);
		}

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	function setNodeActive(id: string, source: TelemetryNdvSource) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		workflowsStore.setNodePristine(node.name, false);
		setNodeActiveByName(node.name, source);
	}

	function setNodeActiveByName(name: string, source: TelemetryNdvSource) {
		ndvStore.setActiveNodeName(name, source);
	}

	function clearNodeActive() {
		ndvStore.unsetActiveNodeName();
	}

	function setNodeParameters(id: string, parameters: Record<string, unknown>) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		workflowState.setNodeParameters(
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

		// Filter to only pinnable nodes
		const pinnableNodes = nodes.filter((node) => {
			const pinnedDataForNode = usePinnedData(node);
			return pinnedDataForNode.canPinNode(true);
		});
		const nextStatePinned = pinnableNodes.some(
			(node) => !workflowsStore.pinDataByNodeName(node.name),
		);

		for (const node of pinnableNodes) {
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
			nodeTypesStore.getNodeType(type, version) ??
			nodeTypesStore.communityNodeType(type)?.nodeDescription ?? {
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
			const { isAutoAdd, openDetail: openNDV, actionName, positionOffset, ...node } = nodeAddData;

			const rawPosition = node.position ?? insertPosition;
			const position: XYPosition | undefined =
				rawPosition && positionOffset
					? [rawPosition[0] + positionOffset[0], rawPosition[1] + positionOffset[1]]
					: rawPosition;

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
						actionName,
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
			uiStore.markStateDirty();
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
				uiStore.markStateDirty();
			}

			workflowsStore.setNodePristine(nodeData.name, true);
			nodeHelpers.matchCredentials(nodeData);
			nodeHelpers.updateNodeParameterIssues(nodeData);
			nodeHelpers.updateNodeCredentialIssues(nodeData);
			nodeHelpers.updateNodeInputIssues(nodeData);

			const isStickyNode = nodeData.type === STICKY_NODE_TYPE;
			const nextView =
				isStickyNode || !options.openNDV || preventOpeningNDV
					? undefined
					: experimentalNdvStore.isNdvInFocusPanelEnabled &&
							focusPanelStore.focusPanelActive &&
							focusPanelStore.resolvedParameter === undefined
						? 'focus_panel'
						: experimentalNdvStore.isZoomedViewEnabled
							? 'zoomed_view'
							: 'ndv';

			if (options.telemetry) {
				trackAddNode(nodeData, options, nextView);
			}

			if (!isStickyNode) {
				void externalHooks.run('nodeView.addNodeButton', { nodeTypeName: nodeData.type });

				if (nextView === 'focus_panel') {
					// Do nothing. The added node get selected and the details are shown in the focus panel
				} else if (nextView === 'zoomed_view') {
					experimentalNdvStore.setNodeNameToBeFocused(nodeData.name);
				} else if (nextView === 'ndv') {
					ndvStore.setActiveNodeName(nodeData.name, 'added_new_node');
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
		const isNewHitlToolNode = isHitlToolType(node.type);
		const lastInteractedWithNodeId = lastInteractedWithNode.id;
		const lastInteractedWithNodeConnection = uiStore.lastInteractedWithNodeConnection;
		const lastInteractedWithNodeHandle = uiStore.lastInteractedWithNodeHandle;
		if (isNewHitlToolNode && lastInteractedWithNodeConnection) {
			const { type: connectionType } = parseCanvasConnectionHandleString(
				lastInteractedWithNodeHandle,
			);
			const nodeId = node.id;
			const nodeHandle = createCanvasConnectionHandleString({
				mode: CanvasConnectionMode.Input,
				type: connectionType,
				index: 0,
			});
			// create connection from master(e.g. agent) node to hitl node
			const connectionFromHitl: Connection = {
				target: lastInteractedWithNodeConnection.target,
				targetHandle: lastInteractedWithNodeConnection.targetHandle,
				source: nodeId,
				sourceHandle: nodeHandle,
			};
			createConnection(connectionFromHitl);

			// delete existing connection from agent node to tool node
			deleteConnection(lastInteractedWithNodeConnection);

			const connection: Connection = {
				source: lastInteractedWithNodeConnection.source,
				sourceHandle: lastInteractedWithNodeConnection.sourceHandle,
				target: nodeId,
				targetHandle: nodeHandle,
			};
			createConnection(connection);

			return;
		}

		const trackOptions = {
			trackHistory: options.trackHistory,
			trackBulk: false,
		};

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
				createConnection(
					{
						source: nodeId,
						sourceHandle: nodeHandle,
						target: lastInteractedWithNodeId,
						targetHandle: lastInteractedWithNodeHandle,
					},
					trackOptions,
				);
			} else {
				createConnection(
					{
						source: lastInteractedWithNodeId,
						sourceHandle: lastInteractedWithNodeHandle,
						target: nodeId,
						targetHandle: nodeHandle,
					},
					trackOptions,
				);
			}
		} else {
			// If a node is last selected then connect between the active and its child ones
			// Connect active node to the newly created one
			createConnection(
				{
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
				},
				trackOptions,
			);
		}

		if (lastInteractedWithNodeConnection) {
			deleteConnection(lastInteractedWithNodeConnection, trackOptions);

			const targetNode = workflowsStore.getNodeById(lastInteractedWithNodeConnection.target);
			if (targetNode) {
				createConnection(
					{
						source: node.id,
						sourceHandle: createCanvasConnectionHandleString({
							mode: CanvasConnectionMode.Input,
							type: NodeConnectionTypes.Main,
							index: 0,
						}),
						target: lastInteractedWithNodeConnection.target,
						targetHandle: lastInteractedWithNodeConnection.targetHandle,
					},
					trackOptions,
				);
			}
		}
	}

	function trackAddNode(nodeData: INodeUi, options: AddNodeOptions, nextView?: TelemetryNdvType) {
		switch (nodeData.type) {
			case STICKY_NODE_TYPE:
				trackAddStickyNoteNode();
				break;
			default:
				trackAddDefaultNode(nodeData, options, nextView);
		}
	}

	function trackAddStickyNoteNode() {
		telemetry.track('User inserted workflow note', {
			workflow_id: workflowsStore.workflowId,
		});
	}

	function trackAddDefaultNode(
		nodeData: INodeUi,
		options: AddNodeOptions,
		nextView?: TelemetryNdvType,
	) {
		// Extract action-related parameters from node parameters if available
		const nodeParameters = nodeData.parameters;
		const resource =
			typeof nodeParameters?.resource === 'string' ? nodeParameters.resource : undefined;
		const operation =
			typeof nodeParameters?.operation === 'string' ? nodeParameters.operation : undefined;

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
			resource,
			operation,
			action: options.actionName,
			next_view_shown: nextView,
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
		const type = node.type ?? nodeTypeDescription.name;
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

		if (nodeTypesStore.getIsNodeInstalled(nodeData.type)) {
			resolveNodeParameters(nodeData, nodeTypeDescription);
			resolveNodeWebhook(nodeData, nodeTypeDescription);
		}

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

				// When adding a HITL node from clicking the plus button of a node connection
				const isNewHitlToolNode = isHitlToolType(node.type);
				if (
					isNewHitlToolNode &&
					lastInteractedWithNodeConnection &&
					connectionType === NodeConnectionTypes.AiTool
				) {
					// Get the source node (main node) from the connection
					const toolUserNode = workflowsStore.getNodeById(lastInteractedWithNodeConnection.target);
					if (toolUserNode) {
						// Position the HITL node vertically between the source (main) node and target (tool) node
						// X position: same as the tool node, slightly shifted to the left because of the size difference
						// Y position: halfway between source and target nodes
						const sourceY = toolUserNode.position[1];
						const targetY = lastInteractedWithNode.position[1];
						const yDiff = (targetY - sourceY) / 2;
						const middleY = sourceY + yDiff;

						position = [
							lastInteractedWithNode.position[0] - CONFIGURABLE_NODE_SIZE[0] / 2,
							middleY,
						];

						const isTooClose = Math.abs(middleY - targetY) < PUSH_NODES_OFFSET;
						if (isTooClose) {
							// slightly move the tool node vertically
							const verticalOffset = PUSH_NODES_OFFSET / 2;
							updateNodePosition(
								lastInteractedWithNode.id,
								{
									x: lastInteractedWithNode.position[0],
									y:
										lastInteractedWithNode.position[1] +
										(yDiff > 0 ? verticalOffset : -verticalOffset),
								},
								{ trackHistory: true },
							);
						}

						return NodeViewUtils.getNewNodePosition(workflowsStore.allNodes, position, {
							offset: pushOffsets,
							size: nodeSize,
							viewport: options.viewport,
						});
					}
				}

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

					// Calculate actual node size for the new node being inserted
					// Configurable nodes (like AI Agent) have non-main inputs and are wider
					// Use nodeTypeDescription.inputs directly since the node isn't in the workflow yet
					// If inputs is a string (expression), it's a dynamic node like AI Agent which is configurable
					let isNewNodeConfigurable = false;
					if (typeof nodeTypeDescription.inputs === 'string') {
						// Dynamic inputs (expression string) indicates AI/configurable nodes
						isNewNodeConfigurable = true;
					} else if (Array.isArray(nodeTypeDescription.inputs)) {
						const nodeInputTypes = NodeHelpers.getConnectionTypes(nodeTypeDescription.inputs);
						isNewNodeConfigurable =
							nodeInputTypes.filter((input) => input !== NodeConnectionTypes.Main).length > 0;
					}
					const newNodeSize: [number, number] = isNewNodeConfigurable
						? CONFIGURABLE_NODE_SIZE
						: DEFAULT_NODE_SIZE;
					// Calculate shift margin: base offset plus extra width for configurable nodes
					// For standard nodes: PUSH_NODES_OFFSET (208)
					// For configurable nodes: PUSH_NODES_OFFSET + (configurable width - default width)
					const extraWidth = isNewNodeConfigurable
						? CONFIGURABLE_NODE_SIZE[0] - DEFAULT_NODE_SIZE[0]
						: 0;
					const shiftMargin = PUSH_NODES_OFFSET + extraWidth;

					shiftDownstreamNodesPosition(lastInteractedWithNode.name, shiftMargin, {
						trackHistory: true,
						nodeSize: newNodeSize,
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

					// When inserting via edge plus button, keep Y aligned to preserve vertical line
					if (lastInteractedWithNodeConnection) {
						position = [position[0], lastInteractedWithNode.position[1]];
					}
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
	 * Gets the bounding rectangle of a node including its size
	 */
	function getNodeRect(node: INodeUi): { x: number; y: number; width: number; height: number } {
		if (node.type === STICKY_NODE_TYPE) {
			return {
				x: node.position[0],
				y: node.position[1],
				width: (node.parameters.width as number) || DEFAULT_NODE_SIZE[0],
				height: (node.parameters.height as number) || DEFAULT_NODE_SIZE[1],
			};
		}
		return {
			x: node.position[0],
			y: node.position[1],
			width: DEFAULT_NODE_SIZE[0],
			height: DEFAULT_NODE_SIZE[1],
		};
	}

	/**
	 * Check if there's enough space for a new node at the insertion position.
	 * Uses a margin to account for nodes that are touching (edge-to-edge)
	 * which should still be considered as blocking the insertion.
	 */
	function hasSpaceForInsertion(
		insertPosition: XYPosition,
		nodeSize: [number, number],
		nodesToCheck: INodeUi[],
	): boolean {
		// Add a small margin to detect nodes that are touching (edge-to-edge)
		const margin = GRID_SIZE;
		const insertRect = {
			x: insertPosition[0],
			y: insertPosition[1],
			width: nodeSize[0] + margin,
			height: nodeSize[1],
		};

		for (const node of nodesToCheck) {
			if (node.type === STICKY_NODE_TYPE) continue;
			const nodeRect = getNodeRect(node);
			if (doRectsOverlap(insertRect, nodeRect)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Determines which nodes and sticky notes need to be moved or stretched when inserting a new node.
	 *
	 * Algorithm:
	 * 1. Find regular nodes that overlap with or are to the right of insertion area
	 * 2. Add downstream connected nodes
	 * 3. Classify sticky notes based on:
	 *    - Whether they contain the source node (anchored = stretch only)
	 *    - Whether they contain nodes that will move
	 *    - Their position relative to insertion point
	 *
	 * @returns Classification of nodes and stickies with their associated nodes for stretching
	 */
	function getNodesToShift(
		insertPosition: XYPosition,
		sourceNodeName: string,
		nodeSize: [number, number] = DEFAULT_NODE_SIZE,
	): {
		nodesToMove: INodeUi[];
		stickiesToStretch: INodeUi[];
		stickiesToMoveAndStretch: INodeUi[];
		stickyAssociatedNodes: Map<string, INodeUi[]>;
	} {
		const allNodes = Object.values(workflowsStore.nodesByName);
		const insertX = insertPosition[0];
		const insertY = insertPosition[1];
		const yTolerance = DEFAULT_NODE_SIZE[1] * 2; // Nodes within ~2 node heights are considered "similar Y"

		const getNodeCenter = (node: INodeUi) => ({
			x: node.position[0] + DEFAULT_NODE_SIZE[0] / 2,
			y: node.position[1] + DEFAULT_NODE_SIZE[1] / 2,
		});

		const isSimilarY = (node: INodeUi) => Math.abs(node.position[1] - insertY) <= yTolerance;

		const overlapsInsertX = (node: INodeUi) => {
			const nodeRightEdge = node.position[0] + DEFAULT_NODE_SIZE[0];
			return nodeRightEdge > insertX || node.position[0] >= insertX;
		};

		/** Checks if a node is fully contained within a sticky note's bounds */
		const isNodeInsideSticky = (
			node: INodeUi,
			sticky: INodeUi,
			stickyRect: ReturnType<typeof getNodeRect>,
		) => {
			return (
				node.position[0] >= sticky.position[0] &&
				node.position[0] + DEFAULT_NODE_SIZE[0] <= sticky.position[0] + stickyRect.width &&
				node.position[1] >= sticky.position[1] &&
				node.position[1] + DEFAULT_NODE_SIZE[1] <= sticky.position[1] + stickyRect.height
			);
		};

		/** Checks if two centers are within threshold distance (used for node-sticky association) */
		const areCentersClose = (
			nodeCenter: { x: number; y: number },
			stickyCenter: { x: number; y: number },
			threshold: { x: number; y: number },
		) => {
			return (
				Math.abs(nodeCenter.x - stickyCenter.x) <= threshold.x &&
				Math.abs(nodeCenter.y - stickyCenter.y) <= threshold.y
			);
		};

		/** Determines if a node is associated with a sticky (inside it or centers are close) */
		const isNodeAssociatedWithSticky = (
			node: INodeUi,
			sticky: INodeUi,
			stickyRect: ReturnType<typeof getNodeRect>,
			stickyCenter: { x: number; y: number },
			threshold: { x: number; y: number },
		) => {
			return (
				isNodeInsideSticky(node, sticky, stickyRect) ||
				areCentersClose(getNodeCenter(node), stickyCenter, threshold)
			);
		};

		/** Returns all nodes from the given list that are associated with the sticky */
		const getAssociatedNodes = (
			sticky: INodeUi,
			stickyRect: ReturnType<typeof getNodeRect>,
			stickyCenter: { x: number; y: number },
			threshold: { x: number; y: number },
			nodesToCheck: INodeUi[],
		) => {
			return nodesToCheck.filter((node) =>
				isNodeAssociatedWithSticky(node, sticky, stickyRect, stickyCenter, threshold),
			);
		};

		// Step 1: Find initial candidates - nodes that overlap with or are to the right of insertion
		// A node overlaps if its right edge extends into the insertion area
		const initialCandidates = allNodes.filter((node) => {
			if (node.type === STICKY_NODE_TYPE) return false;
			if (node.name === sourceNodeName) return false;
			return isSimilarY(node) && overlapsInsertX(node);
		});

		// Step 2: Add all downstream connected nodes from initial candidates
		const candidateNames = new Set(initialCandidates.map((node) => node.name));
		for (const candidate of initialCandidates) {
			const downstream = workflowHelpers.getConnectedNodes(
				'downstream',
				editableWorkflowObject.value,
				candidate.name,
			);
			downstream
				// Filter the downstream nodes to find candidates that need to be shifted right.
				.filter((name) => {
					const node = workflowsStore.getNodeByName(name);
					if (!node) {
						return false;
					}
					// Check if the current node visually overlaps with, or is entirely to the right of,
					// the new insertion point (insertX).
					return overlapsInsertX(node);
				})
				.forEach((name) => candidateNames.add(name));
		}

		// Step 3: Get all candidate regular nodes (they overlap with or are downstream of insertion)
		const regularNodesToMove = allNodes.filter((node) => {
			if (node.type === STICKY_NODE_TYPE) return false;
			return candidateNames.has(node.name);
		});

		// Step 4: Classify sticky notes behavior
		// Stickies can: move (shift right), stretch (expand width), or both
		// Special case: stickies containing the source node are anchored (stretch only)
		const stickiesToStretch: INodeUi[] = [];
		const stickiesToMove: INodeUi[] = [];
		const stickiesToMoveAndStretch: INodeUi[] = [];
		const stickyAssociatedNodes = new Map<string, INodeUi[]>();
		const stickyNodes = allNodes.filter((node) => node.type === STICKY_NODE_TYPE);

		// Calculate the vertical area affected by insertion
		const affectedMinY = Math.min(insertY, ...regularNodesToMove.map((n) => n.position[1]));
		const affectedMaxY = Math.max(
			insertY + nodeSize[1],
			...regularNodesToMove.map((n) => n.position[1] + DEFAULT_NODE_SIZE[1]),
		);

		const sourceNode = workflowsStore.nodesByName[sourceNodeName];
		const nodeCenterThreshold = {
			x: nodeSize[0] / 2,
			y: nodeSize[1] / 2,
		};

		// Process each sticky to determine its behavior
		for (const sticky of stickyNodes) {
			const stickyRect = getNodeRect(sticky);
			const stickyLeftEdge = sticky.position[0];
			const stickyRightEdge = stickyLeftEdge + stickyRect.width;
			const stickyTop = sticky.position[1];
			const stickyBottom = stickyTop + stickyRect.height;
			const overlapsVertically = !(stickyBottom <= affectedMinY || stickyTop >= affectedMaxY);
			const isInsertionInsideSticky = insertX >= stickyLeftEdge && insertX <= stickyRightEdge;

			const stickyCenter = {
				x: sticky.position[0] + stickyRect.width / 2,
				y: sticky.position[1] + stickyRect.height / 2,
			};

			// Priority 1: Stickies containing the source node are anchored (stretch only)
			const sourceNodeInsideSticky =
				sourceNode &&
				isNodeAssociatedWithSticky(
					sourceNode,
					sticky,
					stickyRect,
					stickyCenter,
					nodeCenterThreshold,
				);

			// a left edge before the insertion position
			if (sourceNodeInsideSticky && isInsertionInsideSticky) {
				const associatedNodes = getAssociatedNodes(
					sticky,
					stickyRect,
					stickyCenter,
					nodeCenterThreshold,
					regularNodesToMove,
				);
				stickyAssociatedNodes.set(sticky.id, associatedNodes);
				stickiesToStretch.push(sticky);
				continue;
			}

			const associatedNodes = getAssociatedNodes(
				sticky,
				stickyRect,
				stickyCenter,
				nodeCenterThreshold,
				regularNodesToMove,
			);

			if (associatedNodes.length > 0) {
				stickyAssociatedNodes.set(sticky.id, associatedNodes);
			}

			const associatedWithMovedNode = associatedNodes.length > 0;

			if (!overlapsVertically) {
				continue;
			}

			if (associatedWithMovedNode) {
				// Sticky has nodes that will move - check if new node will be close enough to the sticky
				const newNodeRightEdge = insertX + nodeSize[0];
				// If the new node's right edge is within 2/3 of PUSH_NODES_OFFSET from the sticky's left edge,
				// stretch the sticky to include the new node
				const isNewNodeCloseToSticky =
					newNodeRightEdge > stickyLeftEdge + (2 * PUSH_NODES_OFFSET) / 3;

				if (isNewNodeCloseToSticky) {
					// New node is close enough to sticky - move AND stretch
					stickiesToMoveAndStretch.push(sticky);
				} else {
					// New node is too far from sticky - just move
					stickiesToMove.push(sticky);
				}
			} else if (isInsertionInsideSticky) {
				// Sticky overlaps insertion but has no moving nodes - just stretch
				stickiesToStretch.push(sticky);
			} else if (stickyLeftEdge >= insertX) {
				// Sticky is entirely to the right - move it
				stickiesToMove.push(sticky);
			}
		}

		// Combine regular nodes and stickies to move
		const nodesToMove = [...regularNodesToMove, ...stickiesToMove, ...stickiesToMoveAndStretch];

		return { nodesToMove, stickiesToStretch, stickiesToMoveAndStretch, stickyAssociatedNodes };
	}

	/**
	 * Stretches a sticky note horizontally to ensure it surrounds the inserted node
	 * and all associated nodes with padding.
	 */
	function stretchStickyNote(
		sticky: INodeUi,
		insertPosition: XYPosition,
		nodeSize: [number, number],
		associatedNodes: INodeUi[],
		{ trackHistory = false }: { trackHistory?: boolean },
	) {
		const padding = 20;
		const stickyRect = getNodeRect(sticky);
		const currentLeft = sticky.position[0];
		const currentRight = currentLeft + stickyRect.width;

		// Start with insertion bounds
		let targetLeft = insertPosition[0] - padding;
		let targetRight = insertPosition[0] + nodeSize[0] + padding;

		// Expand to include all associated nodes (get fresh positions from store as they may have moved)
		for (const node of associatedNodes) {
			const updatedNode = workflowsStore.getNodeById(node.id);
			if (!updatedNode) continue;
			const nodeLeft = updatedNode.position[0] - padding;
			const nodeRight = updatedNode.position[0] + DEFAULT_NODE_SIZE[0] + padding;
			targetLeft = Math.min(targetLeft, nodeLeft);
			targetRight = Math.max(targetRight, nodeRight);
		}

		const newLeft = Math.min(currentLeft, targetLeft);
		const newRight = Math.max(currentRight, targetRight);
		const newWidth = newRight - newLeft;

		const newParameters: INodeParameters = { ...sticky.parameters, width: newWidth };
		replaceNodeParameters(sticky.id, sticky.parameters, newParameters, {
			trackHistory,
			trackBulk: false,
		});

		if (newLeft !== currentLeft) {
			updateNodePosition(sticky.id, { x: newLeft, y: sticky.position[1] }, { trackHistory });
		}
	}

	/**
	 * Moves downstream nodes when inserting a node between existing nodes.
	 * Only moves nodes if there isn't enough space for the new node.
	 * Sticky notes that overlap the insertion area are stretched instead of moved.
	 * Stickies at the insertion point are repositioned behind the new node.
	 */
	function shiftDownstreamNodesPosition(
		sourceNodeName: string,
		margin: number,
		{
			trackHistory = false,
			nodeSize = DEFAULT_NODE_SIZE,
		}: { trackHistory?: boolean; nodeSize?: [number, number] },
	) {
		const sourceNode = workflowsStore.nodesByName[sourceNodeName];
		if (!sourceNode) return;

		// Calculate insertion position (to the right of source node)
		// Use PUSH_NODES_OFFSET to match the actual position where nodes are placed
		const insertPosition: XYPosition = [
			sourceNode.position[0] + PUSH_NODES_OFFSET,
			sourceNode.position[1],
		];

		// Get all nodes except source and stickies
		const nodesToCheck = Object.values(workflowsStore.nodesByName).filter(
			(n) => n.name !== sourceNodeName && n.type !== STICKY_NODE_TYPE,
		);

		// Check if there's enough space - if so, don't move anything
		if (hasSpaceForInsertion(insertPosition, nodeSize, nodesToCheck)) {
			return;
		}

		// Get nodes to shift and stickies to stretch
		const { nodesToMove, stickiesToStretch, stickiesToMoveAndStretch, stickyAssociatedNodes } =
			getNodesToShift(insertPosition, sourceNodeName, nodeSize);

		// Move regular nodes and stickies to the right
		for (const node of nodesToMove) {
			updateNodePosition(
				node.id,
				{
					x: node.position[0] + margin,
					y: node.position[1],
				},
				{ trackHistory },
			);
		}

		// Stretch stickies that moved and also need to encompass the new node
		for (const sticky of stickiesToMoveAndStretch) {
			const updatedSticky = workflowsStore.getNodeById(sticky.id);
			if (!updatedSticky) continue;
			const associatedNodes = stickyAssociatedNodes.get(sticky.id) ?? [];
			stretchStickyNote(updatedSticky, insertPosition, nodeSize, associatedNodes, { trackHistory });
		}

		// Stretch sticky notes that span the insertion area
		for (const sticky of stickiesToStretch) {
			const associatedNodes = stickyAssociatedNodes.get(sticky.id) ?? [];
			stretchStickyNote(sticky, insertPosition, nodeSize, associatedNodes, { trackHistory });
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
			uiStore.markStateDirty();
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

		void nextTick(() => {
			nodeHelpers.updateNodeInputIssues(sourceNode);
			nodeHelpers.updateNodeInputIssues(targetNode);
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

		const checkIsNotInstalledCommunityNode = (node: INodeUi) =>
			isCommunityPackageName(node.type) && !useNodeTypesStore().getIsNodeInstalled(node.type);

		const isSourceNotInstalled = checkIsNotInstalledCommunityNode(sourceNode);
		const isTargetNotInstalled = checkIsNotInstalledCommunityNode(targetNode);

		const getNodeType = (node: INodeUi) => {
			return (
				nodeTypesStore.getNodeType(node.type, node.typeVersion) ??
				nodeTypesStore.communityNodeType(node.type)?.nodeDescription
			);
		};

		const filterConnectionsByType = (
			connections: Array<NodeConnectionType | INodeInputConfiguration | INodeOutputConfiguration>,
			type: NodeConnectionType,
		) =>
			connections.filter((connection) => {
				const connectionType = typeof connection === 'string' ? connection : connection.type;
				return connectionType === type;
			});

		const getConnectionFilter = (
			connection?: NodeConnectionType | INodeInputConfiguration | INodeOutputConfiguration,
		) => {
			if (connection && typeof connection === 'object' && 'filter' in connection) {
				return connection.filter;
			}

			return undefined;
		};

		if (sourceConnection.type !== targetConnection.type) {
			return false;
		}

		if (blocklist.includes(sourceNode.type) || blocklist.includes(targetNode.type)) {
			return false;
		}

		const sourceNodeType = getNodeType(sourceNode);
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

		const sourceOutputsOfType = filterConnectionsByType(sourceNodeOutputs, sourceConnection.type);
		const sourceNodeHasOutputConnectionOfType = sourceOutputsOfType.length > 0;

		const sourceNodeHasOutputConnectionPortOfType =
			sourceConnection.index < sourceOutputsOfType.length;
		const sourceConnectionDefinition = sourceNodeHasOutputConnectionPortOfType
			? sourceOutputsOfType[sourceConnection.index]
			: undefined;
		const sourceConnectionFilter = getConnectionFilter(sourceConnectionDefinition);

		const isMissingOutputConnection =
			!sourceNodeHasOutputConnectionOfType || !sourceNodeHasOutputConnectionPortOfType;

		if (isMissingOutputConnection && !isSourceNotInstalled) {
			return false;
		}

		const targetNodeType = getNodeType(targetNode);
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

		const targetInputsOfType = filterConnectionsByType(targetNodeInputs, targetConnection.type);
		const targetNodeHasInputConnectionOfType = targetInputsOfType.length > 0;
		const targetNodeHasInputConnectionPortOfType =
			targetConnection.index < targetInputsOfType.length;

		const targetConnectionDefinition = targetNodeHasInputConnectionPortOfType
			? targetInputsOfType[targetConnection.index]
			: undefined;
		const targetConnectionFilter = getConnectionFilter(targetConnectionDefinition);

		function isConnectionFiltered(filter: INodeFilter | undefined, nodeType: string): boolean {
			const isNotIncluded = !!filter?.nodes?.length && !filter.nodes.includes(nodeType);
			const isExcluded = !!filter?.excludedNodes?.length && filter.excludedNodes.includes(nodeType);
			return isNotIncluded || isExcluded;
		}

		const isFilteredByTarget = isConnectionFiltered(targetConnectionFilter, sourceNode.type);
		const isFilteredBySource = isConnectionFiltered(sourceConnectionFilter, targetNode.type);

		if (isFilteredByTarget || isFilteredBySource) {
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

		const isMissingInputConnection =
			!targetNodeHasInputConnectionOfType || !targetNodeHasInputConnectionPortOfType;
		if (isMissingInputConnection && !isTargetNotInstalled) {
			return false;
		}

		return true;
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
			uiStore.markStateDirty();
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
		workflowState.resetState();
		workflowsStore.currentWorkflowExecutions = [];
		workflowState.setActiveExecutionId(undefined);
		workflowsStore.lastSuccessfulExecution = null;

		// Reset actions
		uiStore.resetLastInteractedWith();
		uiStore.markStateClean();

		// Reset executions
		executionsStore.activeExecution = null;

		// Reset credentials updates
		nodeHelpers.credentialsUpdated.value = false;
	}

	async function initializeWorkspace(data: IWorkflowDb) {
		const { workflowDocumentStore } = await workflowHelpers.initState(data, useWorkflowState());
		data.nodes.forEach((node) => {
			const nodeTypeDescription = requireNodeTypeDescription(node.type, node.typeVersion);
			const isInstalledNode = nodeTypesStore.getIsNodeInstalled(node.type);
			nodeHelpers.matchCredentials(node);
			// skip this step because nodeTypeDescription is missing for unknown nodes
			if (isInstalledNode) {
				resolveNodeParameters(node, nodeTypeDescription);
				resolveNodeWebhook(node, nodeTypeDescription);
			}
		});

		workflowsStore.setNodes(data.nodes);
		workflowsStore.setConnections(data.connections);
		workflowState.setWorkflowProperty('createdAt', data.createdAt);
		workflowState.setWorkflowProperty('updatedAt', data.updatedAt);

		return { workflowDocumentStore };
	}

	const initializeUnknownNodes = (nodes: INode[]) => {
		nodes.forEach((node) => {
			// we need to fetch installed node, so remove preview token
			const nodeTypeDescription = requireNodeTypeDescription(
				removePreviewToken(node.type),
				node.typeVersion,
			);
			nodeHelpers.matchCredentials(node);
			resolveNodeParameters(node, nodeTypeDescription);
			resolveNodeWebhook(node, nodeTypeDescription);
			const nodeIndex = workflowsStore.workflow.nodes.findIndex((n) => {
				return n.name === node.name;
			});
			// make sure that preview node type is always removed
			workflowState.updateNodeAtIndex(nodeIndex, { ...node, type: removePreviewToken(node.type) });
		});
	};

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
		{
			trackBulk = true,
			trackHistory = false,
			viewport = DEFAULT_VIEWPORT_BOUNDARIES,
			setStateDirty = true,
		} = {},
	): Promise<WorkflowDataUpdate> {
		// Because nodes with the same name maybe already exist, it could
		// be needed that they have to be renamed. Also could it be possible
		// that nodes are not allowed to be created because they have a create
		// limit set. So we would then link the new nodes with the already existing ones.
		// In this object all that nodes get saved in the format:
		//   old-name -> new-name
		const nodeNameTable: {
			[key: string]: string | undefined;
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
		const tempWorkflow: Workflow = workflowsStore.createWorkflowObject(
			createNodes,
			newConnections,
			true,
		);

		// createWorkflowObject strips out unknown parameters, bring them back for not installed nodes
		for (const nodeName of Object.keys(tempWorkflow.nodes)) {
			const node = tempWorkflow.nodes[nodeName];
			const isInstalledNode = nodeTypesStore.getIsNodeInstalled(node.type);
			if (!isInstalledNode) {
				const originalParameters = createNodes.find((n) => n.name === nodeName)?.parameters;
				node.parameters = originalParameters ?? node.parameters;
			}
		}
		// Rename all the nodes of which the name changed
		for (oldName in nodeNameTable) {
			const nameToChangeTo = nodeNameTable[oldName];
			if (!nameToChangeTo || oldName === nameToChangeTo) {
				// Name did not change so skip
				continue;
			}
			tempWorkflow.renameNode(oldName, nameToChangeTo);
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

				const node = tempWorkflow.nodes[nodeNameTable[nodeName] ?? nodeName];
				if (node) {
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
		}

		// Add the nodes with the changed node names, expressions and connections
		if (trackBulk && trackHistory) {
			historyStore.startRecordingUndo();
		}

		await addNodes(Object.values(tempWorkflow.nodes), {
			trackBulk: false,
			trackHistory,
			viewport,
			keepPristine: true,
		});
		await addConnections(
			mapLegacyConnectionsToCanvasConnections(
				tempWorkflow.connectionsBySourceNode,
				Object.values(tempWorkflow.nodes),
			),
			{ trackBulk: false, trackHistory, keepPristine: true },
		);

		if (trackBulk && trackHistory) {
			historyStore.stopRecordingUndo();
		}

		if (setStateDirty) {
			uiStore.markStateDirty();
		} else {
			uiStore.markStateClean();
		}

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
			trackEvents = true,
			setStateDirty = true,
		}: {
			importTags?: boolean;
			trackBulk?: boolean;
			trackHistory?: boolean;
			regenerateIds?: boolean;
			viewport?: ViewportBoundaries;
			trackEvents?: boolean;
			setStateDirty?: boolean;
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

					// Generate new webhookId
					if (node.webhookId && UPDATE_WEBHOOK_ID_NODE_TYPES.includes(node.type)) {
						if (node.webhookId) {
							nodeHelpers.assignWebhookId(node);

							if (node.parameters.path) {
								node.parameters.path = node.webhookId;
							} else if ((node.parameters.options as IDataObject)?.path) {
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

			try {
				if (trackEvents) {
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
				}
			} catch {
				// If telemetry fails, don't throw an error
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
				setStateDirty,
			});

			if (importTags && settingsStore.areTagsEnabled && Array.isArray(workflowData.tags)) {
				await importWorkflowTags(workflowData);
			}

			if (workflowData.name) {
				workflowState.setWorkflowName({ newName: workflowData.name, setStateDirty });
			}

			return workflowData;
		} catch (error) {
			console.error(error); // leaving to help make debugging future issues easier
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

		const workflowDocumentId = createWorkflowDocumentId(workflowsStore.workflowId);
		const workflowDocumentStore = useWorkflowDocumentStore(workflowDocumentId);
		workflowDocumentStore.addTags(tagIds);
	}

	async function fetchWorkflowDataFromUrl(url: string): Promise<WorkflowDataUpdate | undefined> {
		let workflowData: WorkflowDataUpdate;

		const projectId = projectsStore.currentProjectId ?? projectsStore.personalProject?.id;
		if (!projectId) {
			// We should never reach this point because the project should be selected before
			throw new Error('No project selected');
			return;
		}

		canvasStore.startLoading();
		try {
			workflowData = await workflowsStore.getWorkflowFromUrl(url, projectId);
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

		await initializeWorkspace(data.workflowData);

		workflowState.setWorkflowExecutionData(data);

		if (!['manual', 'evaluation'].includes(data.mode)) {
			workflowState.setWorkflowPinData({});
		}

		if (nodeId) {
			const node = workflowsStore.getNodeById(nodeId);
			if (node) {
				ndvStore.setActiveNodeName(node.name, 'other');
			} else {
				toast.showError(
					new Error(`Node with id "${nodeId}" could not be found!`),
					i18n.baseText('nodeView.showError.openExecution.node'),
				);
			}
		}

		uiStore.markStateClean();

		return data;
	}

	function startChat(source?: 'node' | 'main') {
		if (!workflowsStore.allNodes.some(isChatNode)) {
			return;
		}

		const workflowObject = workflowsStore.workflowObject; // @TODO Check if we actually need workflowObject here

		logsStore.toggleOpen(true);

		const payload = {
			workflow_id: workflowObject.id,
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
		await addNodes(convertedNodes ?? [], { keepPristine: true });
		await workflowState.getNewWorkflowDataAndMakeShareable(name, projectsStore.currentProjectId);
		workflowState.addToWorkflowMetadata({ templateId: `${id}` });
	}

	function tryToOpenSubworkflowInNewTab(nodeId: string): boolean {
		const node = workflowsStore.getNodeById(nodeId);
		if (!node) return false;
		const subWorkflowId = NodeHelpers.getSubworkflowId(node);
		if (!subWorkflowId) return false;
		window.open(`${rootStore.baseUrl}workflow/${subWorkflowId}`, '_blank');
		return true;
	}

	function replaceNode(
		previousId: string,
		newId: string,
		{ trackHistory = true, trackBulk = true } = {},
	) {
		const previousNode = workflowsStore.getNodeById(previousId);
		const newNode = workflowsStore.getNodeById(newId);

		if (!previousNode || !newNode) return;

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		const [x, y] = previousNode.position;
		updateNodePosition(newId, { x, y }, { trackHistory });
		replaceNodeConnections(previousId, newId, {
			trackBulk: false,
			trackHistory,
		});
		deleteNode(previousId, { trackHistory, trackBulk: false });

		uiStore.markStateDirty();

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	async function addNodesAndConnections(
		nodes: AddedNode[],
		addedConnections: AddedNodeConnection[],
		{
			trackBulk = true,
			trackHistory = true,
			...options
		}: AddNodesOptions & {
			replaceNodeId?: string;
			trackHistory?: boolean;
			trackBulk?: boolean;
		},
	) {
		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		const addedNodes = await addNodes(nodes, {
			...options,
			trackHistory,
			trackBulk: false,
			telemetry: true,
		});

		const offsetIndex = editableWorkflow.value.nodes.length - nodes.length;
		const connections: CanvasConnectionCreateData[] = addedConnections.map(({ from, to }) => {
			const fromNode = editableWorkflow.value.nodes[offsetIndex + from.nodeIndex];
			const toNode = editableWorkflow.value.nodes[offsetIndex + to.nodeIndex];
			const type = from.type ?? to.type ?? NodeConnectionTypes.Main;

			return {
				source: fromNode.id,
				sourceHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Output,
					type: isValidNodeConnectionType(type) ? type : NodeConnectionTypes.Main,
					index: from.outputIndex ?? 0,
				}),
				target: toNode.id,
				targetHandle: createCanvasConnectionHandleString({
					mode: CanvasConnectionMode.Input,
					type: isValidNodeConnectionType(type) ? type : NodeConnectionTypes.Main,
					index: to.inputIndex ?? 0,
				}),
				data: {
					source: {
						index: from.outputIndex ?? 0,
						type,
					},
					target: {
						index: to.inputIndex ?? 0,
						type,
					},
				},
			};
		});

		await addConnections(connections, { trackHistory, trackBulk: false });

		uiStore.resetLastInteractedWith();

		if (addedNodes.length > 0 && options.replaceNodeId) {
			const lastAddedNodeId = addedNodes[addedNodes.length - 1].id;
			replaceNode(options.replaceNodeId, lastAddedNodeId, {
				trackHistory,
				trackBulk: false,
			});
		}

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}

		return { addedNodes };
	}

	function fitView() {
		setTimeout(() => canvasEventBus.emit('fitView'));
	}

	function trackOpenWorkflowTemplate(templateId: string) {
		telemetry.track('User inserted workflow template', {
			source: 'workflow',
			template_id: tryToParseNumber(templateId),
			wf_template_repo_session_id: templatesStore.previousSessionId,
		});
	}

	async function openWorkflowTemplate(templateId: string) {
		resetWorkspace();

		canvasStore.startLoading();
		canvasStore.setLoadingText(i18n.baseText('nodeView.loadingTemplate'));

		workflowsStore.currentWorkflowExecutions = [];
		executionsStore.activeExecution = null;

		let data: IWorkflowTemplate | undefined;
		try {
			void externalHooks.run('template.requested', { templateId });

			data = await templatesStore.getFixedWorkflowTemplate(templateId);
			if (!data) {
				throw new Error(
					i18n.baseText('nodeView.workflowTemplateWithIdCouldNotBeFound', {
						interpolate: { templateId },
					}),
				);
			}
		} catch (error) {
			toast.showError(error, i18n.baseText('nodeView.couldntImportWorkflow'));
			await router.replace({ name: VIEWS.NEW_WORKFLOW });
			return;
		}

		trackOpenWorkflowTemplate(templateId);

		uiStore.isBlankRedirect = true;
		await router.replace({ name: VIEWS.NEW_WORKFLOW, query: { templateId } });

		await importTemplate({ id: templateId, name: data.name, workflow: data.workflow });

		// Set the workflow ID from the route params (auto-generated by router)
		if (typeof route.params.name === 'string') {
			workflowState.setWorkflowId(route.params.name);
		}

		canvasStore.stopLoading();

		void externalHooks.run('template.open', {
			templateId,
			templateName: data.name,
			workflow: data.workflow,
		});

		fitView();
	}

	async function openWorkflowTemplateFromJSON(workflow: WorkflowDataWithTemplateId) {
		if (!workflow.nodes || !workflow.connections) {
			toast.showError(
				new Error(i18n.baseText('nodeView.couldntLoadWorkflow.invalidWorkflowObject')),
				i18n.baseText('nodeView.couldntImportWorkflow'),
			);
			await router.replace({ name: VIEWS.NEW_WORKFLOW });
			return;
		}
		resetWorkspace();

		canvasStore.startLoading();
		canvasStore.setLoadingText(i18n.baseText('nodeView.loadingTemplate'));

		workflowsStore.currentWorkflowExecutions = [];
		executionsStore.activeExecution = null;

		uiStore.isBlankRedirect = true;
		const templateId = workflow.meta.templateId;
		const parentFolderId = route.query.parentFolderId as string | undefined;

		await projectsStore.refreshCurrentProject();
		await fetchAndSetParentFolder(parentFolderId);

		await router.replace({
			name: VIEWS.NEW_WORKFLOW,
			query: { templateId, parentFolderId, projectId: projectsStore.currentProjectId },
		});

		await importTemplate({
			id: templateId,
			name: workflow.name,
			workflow,
		});

		canvasStore.stopLoading();

		fitView();
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
		getNodesToShift,
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
		initializeUnknownNodes,
		replaceNode,
		addNodesAndConnections,
		fitView,
		openWorkflowTemplate,
		openWorkflowTemplateFromJSON,
	};
}
