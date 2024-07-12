/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import type { CanvasNode } from '@/types';
import { CanvasConnectionMode } from '@/types';
import type {
	AddedNodesAndConnections,
	INodeUi,
	ITag,
	IWorkflowDataUpdate,
	XYPosition,
} from '@/Interface';
import {
	FORM_TRIGGER_NODE_TYPE,
	QUICKSTART_NOTE_NAME,
	STICKY_NODE_TYPE,
	UPDATE_WEBHOOK_ID_NODE_TYPES,
	WEBHOOK_NODE_TYPE,
} from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useHistoryStore } from '@/stores/history.store';
import { useUIStore } from '@/stores/ui.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { useExternalHooks } from '@/composables/useExternalHooks';
import {
	AddNodeCommand,
	MoveNodeCommand,
	RemoveConnectionCommand,
	RemoveNodeCommand,
	RenameNodeCommand,
} from '@/models/history';
import type { Connection } from '@vue-flow/core';
import {
	createCanvasConnectionHandleString,
	getUniqueNodeName,
	getVueFlowConnectorLengths,
	mapCanvasConnectionToLegacyConnection,
	parseCanvasConnectionHandleString,
} from '@/utils/canvasUtilsV2';
import type {
	ConnectionTypes,
	IConnection,
	IConnections,
	INodeConnections,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	INodeTypeDescription,
	INodeTypeNameVersion,
	ITelemetryTrackProperties,
	IWorkflowBase,
	Workflow,
	INode,
} from 'n8n-workflow';
import { NodeConnectionType, NodeHelpers, TelemetryHelpers } from 'n8n-workflow';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import { v4 as uuid } from 'uuid';
import type { Ref } from 'vue';
import { computed } from 'vue';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import type { useRouter } from 'vue-router';
import { useCanvasStore } from '@/stores/canvas.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { usePinnedData } from '@/composables/usePinnedData';
import { useSettingsStore } from '@/stores/settings.store';
import { useTagsStore } from '@/stores/tags.store';
import { useRootStore } from '@/stores/root.store';

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

	const i18n = useI18n();
	const toast = useToast();
	const workflowHelpers = useWorkflowHelpers({ router });
	const nodeHelpers = useNodeHelpers();
	const telemetry = useTelemetry();
	const externalHooks = useExternalHooks();

	const editableWorkflow = computed(() => workflowsStore.workflow);
	const editableWorkflowObject = computed(() => workflowsStore.getCurrentWorkflow());

	const triggerNodes = computed<INodeUi[]>(() => {
		return workflowsStore.workflowTriggerNodes;
	});

	/**
	 * Node operations
	 */

	function updateNodePosition(
		id: string,
		position: CanvasNode['position'],
		{ trackHistory = false, trackBulk = true } = {},
	) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		const oldPosition: XYPosition = [...node.position];
		const newPosition: XYPosition = [position.x, position.y];

		workflowsStore.setNodePositionById(id, newPosition);

		if (trackHistory) {
			historyStore.pushCommandToUndo(new MoveNodeCommand(node.name, oldPosition, newPosition));

			if (trackBulk) {
				historyStore.stopRecordingUndo();
			}
		}
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

	function deleteNode(id: string, { trackHistory = false, trackBulk = true } = {}) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

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

	function toggleNodeDisabled(
		id: string,
		{ trackHistory = true }: { trackHistory?: boolean } = {},
	) {
		const node = workflowsStore.getNodeById(id);
		if (!node) {
			return;
		}

		nodeHelpers.disableNodes([node], trackHistory);
	}

	async function addNodes(
		nodes: AddedNodesAndConnections['nodes'],
		{
			dragAndDrop,
			position,
		}: {
			dragAndDrop?: boolean;
			position?: XYPosition;
		} = {},
	) {
		let currentPosition = position;
		let lastAddedNode: INodeUi | undefined;
		for (const { isAutoAdd, openDetail, ...nodeData } of nodes) {
			try {
				await createNode(
					{
						...nodeData,
						position: nodeData.position ?? currentPosition,
					},
					{
						dragAndDrop,
						openNDV: openDetail ?? false,
						trackHistory: true,
						isAutoAdd,
					},
				);
			} catch (error) {
				toast.showError(error, i18n.baseText('error'));
				continue;
			}

			lastAddedNode = editableWorkflow.value.nodes[editableWorkflow.value.nodes.length - 1];
			currentPosition = [
				lastAddedNode.position[0] + NodeViewUtils.NODE_SIZE * 2 + NodeViewUtils.GRID_SIZE,
				lastAddedNode.position[1],
			];
		}

		// If the last added node has multiple inputs, move them down
		if (!lastAddedNode) {
			return;
		}
		const lastNodeInputs = editableWorkflowObject.value.getParentNodesByDepth(
			lastAddedNode.name,
			1,
		);
		if (lastNodeInputs.length > 1) {
			lastNodeInputs.slice(1).forEach((node, index) => {
				const nodeUi = workflowsStore.getNodeByName(node.name);
				if (!nodeUi) return;

				updateNodePosition(nodeUi.id, {
					x: nodeUi.position[0],
					y: nodeUi.position[1] + 100 * (index + 1),
				});
			});
		}
	}

	async function createNode(node: AddNodeData, options: AddNodeOptions = {}): Promise<INodeUi> {
		const newNodeData = await resolveNodeData(node, options);
		if (!newNodeData) {
			throw new Error(i18n.baseText('nodeViewV2.showError.failedToCreateNode'));
		}

		/**
		 * @TODO Check if maximum node type limit reached
		 */

		newNodeData.name = getUniqueNodeName(newNodeData.name, workflowsStore.canvasNames);

		workflowsStore.addNode(newNodeData);

		nodeHelpers.matchCredentials(newNodeData);

		const lastSelectedNode = uiStore.getLastSelectedNode;
		const lastSelectedNodeConnection = uiStore.lastSelectedNodeConnection;
		const lastSelectedNodeOutputIndex = uiStore.lastSelectedNodeOutputIndex;
		const lastSelectedNodeEndpointUuid = uiStore.lastSelectedNodeEndpointUuid;

		historyStore.startRecordingUndo();
		if (options.trackHistory) {
			historyStore.pushCommandToUndo(new AddNodeCommand(newNodeData));
		}

		const outputIndex = lastSelectedNodeOutputIndex ?? 0;
		const targetEndpoint = lastSelectedNodeEndpointUuid ?? '';

		// Create a connection between the last selected node and the new one
		if (lastSelectedNode && !options.isAutoAdd) {
			// If we have a specific endpoint to connect to
			if (lastSelectedNodeEndpointUuid) {
				const { type: connectionType, mode } = parseCanvasConnectionHandleString(
					lastSelectedNodeEndpointUuid,
				);

				const newNodeId = newNodeData.id;
				const newNodeHandle = `${CanvasConnectionMode.Input}/${connectionType}/0`;
				const lasSelectedNodeId = lastSelectedNode.id;
				const lastSelectedNodeHandle = targetEndpoint;

				if (mode === CanvasConnectionMode.Input) {
					createConnection({
						source: newNodeId,
						sourceHandle: newNodeHandle,
						target: lasSelectedNodeId,
						targetHandle: lastSelectedNodeHandle,
					});
				} else {
					createConnection({
						source: lasSelectedNodeId,
						sourceHandle: lastSelectedNodeHandle,
						target: newNodeId,
						targetHandle: newNodeHandle,
					});
				}
			} else {
				// If a node is last selected then connect between the active and its child ones
				// Connect active node to the newly created one
				createConnection({
					source: lastSelectedNode.id,
					sourceHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Output,
						type: NodeConnectionType.Main,
						index: outputIndex,
					}),
					target: newNodeData.id,
					targetHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Input,
						type: NodeConnectionType.Main,
						index: 0,
					}),
				});
			}

			if (lastSelectedNodeConnection) {
				deleteConnection(lastSelectedNodeConnection, { trackHistory: options.trackHistory });

				const targetNode = workflowsStore.getNodeById(lastSelectedNodeConnection.target);
				if (targetNode) {
					createConnection({
						source: newNodeData.id,
						sourceHandle: createCanvasConnectionHandleString({
							mode: CanvasConnectionMode.Input,
							type: NodeConnectionType.Main,
							index: 0,
						}),
						target: lastSelectedNodeConnection.target,
						targetHandle: lastSelectedNodeConnection.targetHandle,
					});
				}
			}
		}

		historyStore.stopRecordingUndo();

		return newNodeData;
	}

	async function initializeNodeDataWithDefaultCredentials(node: AddNodeData) {
		const nodeTypeDescription = nodeTypesStore.getNodeType(node.type);
		if (!nodeTypeDescription) {
			throw new Error(i18n.baseText('nodeViewV2.showError.failedToCreateNode'));
		}

		let nodeVersion = nodeTypeDescription.defaultVersion;
		if (typeof nodeVersion === 'undefined') {
			nodeVersion = Array.isArray(nodeTypeDescription.version)
				? nodeTypeDescription.version.slice(-1)[0]
				: nodeTypeDescription.version;
		}

		const newNodeData: INodeUi = {
			...node,
			id: node.id ?? uuid(),
			name: node.name ?? (nodeTypeDescription.defaults.name as string),
			type: nodeTypeDescription.name,
			typeVersion: nodeVersion,
			position: node.position ?? [0, 0],
			disabled: node.disabled ?? false,
			parameters: node.parameters ?? {},
		};

		await loadNodeTypesProperties([{ name: newNodeData.type, version: newNodeData.typeVersion }]);

		const nodeType = nodeTypesStore.getNodeType(newNodeData.type, newNodeData.typeVersion);
		const nodeParameters = NodeHelpers.getNodeParameters(
			nodeType?.properties ?? [],
			{},
			true,
			false,
			newNodeData,
		);

		newNodeData.parameters = nodeParameters ?? {};

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
				if (authentication?.displayOptions?.hide) {
					return newNodeData;
				}

				const authDisplayOptions = authentication?.displayOptions?.show;
				if (!authDisplayOptions) {
					newNodeData.credentials = credentials;
					return newNodeData;
				}

				if (Object.keys(authDisplayOptions).length === 1 && authDisplayOptions.authentication) {
					// ignore complex case when there's multiple dependencies
					newNodeData.credentials = credentials;

					let parameters: { [key: string]: string } = {};
					for (const displayOption of Object.keys(authDisplayOptions)) {
						if (nodeParameters && !nodeParameters[displayOption]) {
							parameters = {};
							newNodeData.credentials = undefined;
							break;
						}
						const optionValue = authDisplayOptions[displayOption]?.[0];
						if (optionValue && typeof optionValue === 'string') {
							parameters[displayOption] = optionValue;
						}
						newNodeData.parameters = {
							...newNodeData.parameters,
							...parameters,
						};
					}
				}
			}
		}

		return newNodeData;
	}

	/**
	 * Resolves the data for a new node
	 */
	async function resolveNodeData(node: AddNodeData, options: AddNodeOptions = {}) {
		const nodeTypeDescription: INodeTypeDescription | null = nodeTypesStore.getNodeType(node.type);
		if (nodeTypeDescription === null) {
			toast.showMessage({
				title: i18n.baseText('nodeView.showMessage.addNodeButton.title'),
				message: i18n.baseText('nodeView.showMessage.addNodeButton.message', {
					interpolate: { nodeTypeName: node.type },
				}),
				type: 'error',
			});
			return;
		}

		if (
			nodeTypeDescription.maxNodes !== undefined &&
			workflowHelpers.getNodeTypeCount(node.type) >= nodeTypeDescription.maxNodes
		) {
			showMaxNodeTypeError(nodeTypeDescription);
			return;
		}

		const newNodeData = await initializeNodeDataWithDefaultCredentials(node);

		// When pulling new connection from node or injecting into a connection
		const lastSelectedNode = uiStore.getLastSelectedNode;

		if (node.position) {
			newNodeData.position = NodeViewUtils.getNewNodePosition(
				canvasStore.getNodesWithPlaceholderNode(),
				node.position,
			);
		} else if (lastSelectedNode) {
			if (uiStore.lastSelectedNodeConnection) {
				// set when injecting into a connection
				const [diffX] = getVueFlowConnectorLengths(uiStore.lastSelectedNodeConnection);

				if (diffX <= NodeViewUtils.MAX_X_TO_PUSH_DOWNSTREAM_NODES) {
					pushDownstreamNodes(lastSelectedNode.name, NodeViewUtils.PUSH_NODES_OFFSET, {
						trackHistory: options.trackHistory,
					});
				}
			}

			// This position is set in `onMouseUp` when pulling connections
			if (canvasStore.newNodeInsertPosition) {
				newNodeData.position = NodeViewUtils.getNewNodePosition(workflowsStore.allNodes, [
					canvasStore.newNodeInsertPosition[0] + NodeViewUtils.GRID_SIZE,
					canvasStore.newNodeInsertPosition[1] - NodeViewUtils.NODE_SIZE / 2,
				]);
				canvasStore.newNodeInsertPosition = null;
			} else {
				let yOffset = 0;
				if (uiStore.lastSelectedNodeConnection) {
					const sourceNodeType = nodeTypesStore.getNodeType(
						lastSelectedNode.type,
						lastSelectedNode.typeVersion,
					);

					if (sourceNodeType) {
						const offsets = [
							[-100, 100],
							[-140, 0, 140],
							[-240, -100, 100, 240],
						];

						const sourceNodeOutputs = NodeHelpers.getNodeOutputs(
							editableWorkflowObject.value,
							lastSelectedNode,
							sourceNodeType,
						);
						const sourceNodeOutputTypes = NodeHelpers.getConnectionTypes(sourceNodeOutputs);
						const sourceNodeOutputMainOutputs = sourceNodeOutputTypes.filter(
							(output) => output === NodeConnectionType.Main,
						);

						if (sourceNodeOutputMainOutputs.length > 1) {
							const { index: sourceOutputIndex } = parseCanvasConnectionHandleString(
								uiStore.lastSelectedNodeConnection.sourceHandle,
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
						newNodeData,
						nodeTypeDescription,
					);
				} catch (e) {}
				const outputTypes = NodeHelpers.getConnectionTypes(outputs);
				const lastSelectedNodeType = nodeTypesStore.getNodeType(
					lastSelectedNode.type,
					lastSelectedNode.typeVersion,
				);

				// If node has only scoped outputs, position it below the last selected node
				if (
					outputTypes.length > 0 &&
					outputTypes.every((outputName) => outputName !== NodeConnectionType.Main)
				) {
					const lastSelectedNodeWorkflow = editableWorkflowObject.value.getNode(
						lastSelectedNode.name,
					);
					if (!lastSelectedNodeWorkflow || !lastSelectedNodeType) {
						return;
					}

					const lastSelectedInputs = NodeHelpers.getNodeInputs(
						editableWorkflowObject.value,
						lastSelectedNodeWorkflow,
						lastSelectedNodeType,
					);
					const lastSelectedInputTypes = NodeHelpers.getConnectionTypes(lastSelectedInputs);

					const scopedConnectionIndex = (lastSelectedInputTypes || [])
						.filter((input) => input !== NodeConnectionType.Main)
						.findIndex((inputType) => outputs[0] === inputType);

					newNodeData.position = NodeViewUtils.getNewNodePosition(
						workflowsStore.allNodes,
						[
							lastSelectedNode.position[0] +
								(NodeViewUtils.NODE_SIZE /
									(Math.max(lastSelectedNodeType?.inputs?.length ?? 1), 1)) *
									scopedConnectionIndex,
							lastSelectedNode.position[1] + NodeViewUtils.PUSH_NODES_OFFSET,
						],
						[100, 0],
					);
				} else {
					if (!lastSelectedNodeType) {
						return;
					}

					// Has only main outputs or no outputs at all
					const inputs = NodeHelpers.getNodeInputs(
						editableWorkflowObject.value,
						lastSelectedNode,
						lastSelectedNodeType,
					);
					const inputsTypes = NodeHelpers.getConnectionTypes(inputs);

					let pushOffset = NodeViewUtils.PUSH_NODES_OFFSET;
					if (!!inputsTypes.find((input) => input !== NodeConnectionType.Main)) {
						// If the node has scoped inputs, push it down a bit more
						pushOffset += 150;
					}

					// If a node is active then add the new node directly after the current one
					newNodeData.position = NodeViewUtils.getNewNodePosition(
						workflowsStore.allNodes,
						[lastSelectedNode.position[0] + pushOffset, lastSelectedNode.position[1] + yOffset],
						[100, 0],
					);
				}
			}
		} else {
			// If added node is a trigger and it's the first one added to the canvas
			// we place it at canvasAddButtonPosition to replace the canvas add button
			const position =
				nodeTypesStore.isTriggerNode(node.type) && triggerNodes.value.length === 0
					? canvasStore.canvasAddButtonPosition
					: // If no node is active find a free spot
						(lastClickPosition.value as XYPosition);

			newNodeData.position = NodeViewUtils.getNewNodePosition(workflowsStore.allNodes, position);
		}

		const localizedName = i18n.localizeNodeName(newNodeData.name, newNodeData.type);

		newNodeData.name = getUniqueNodeName(localizedName, workflowsStore.canvasNames);

		if (nodeTypeDescription.webhooks?.length) {
			newNodeData.webhookId = uuid();
		}

		// if it's a webhook and the path is empty set the UUID as the default path
		if (
			[WEBHOOK_NODE_TYPE, FORM_TRIGGER_NODE_TYPE].includes(newNodeData.type) &&
			newNodeData.parameters.path === ''
		) {
			newNodeData.parameters.path = newNodeData.webhookId as string;
		}

		workflowsStore.setNodePristine(newNodeData.name, true);
		uiStore.stateIsDirty = true;

		if (node.type === STICKY_NODE_TYPE) {
			telemetry.trackNodesPanel('nodeView.addSticky', {
				workflow_id: workflowsStore.workflowId,
			});
		} else {
			void externalHooks.run('nodeView.addNodeButton', { nodeTypeName: node.type });
			const trackProperties: ITelemetryTrackProperties = {
				node_type: node.type,
				node_version: newNodeData.typeVersion,
				is_auto_add: options.isAutoAdd,
				workflow_id: workflowsStore.workflowId,
				drag_and_drop: options.dragAndDrop,
			};

			if (lastSelectedNode) {
				trackProperties.input_node_type = lastSelectedNode.type;
			}

			telemetry.trackNodesPanel('nodeView.addNodeButton', trackProperties);
		}

		// Automatically deselect all nodes and select the current one and also active
		// current node. But only if it's added manually by the user (not by undo/redo mechanism)
		// @TODO
		// if (trackHistory) {
		// 	this.deselectAllNodes();
		// 	setTimeout(() => {
		// 		this.nodeSelectedByName(newNodeData.name, showDetail && nodeTypeName !== STICKY_NODE_TYPE);
		// 	});
		// }

		return newNodeData;
	}

	/**
	 * Moves all downstream nodes of a node
	 */
	function pushDownstreamNodes(
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

	function showMaxNodeTypeError(nodeTypeDescription: INodeTypeDescription) {
		const maxNodes = nodeTypeDescription.maxNodes;
		toast.showMessage({
			title: i18n.baseText('nodeView.showMessage.showMaxNodeTypeError.title'),
			message: i18n.baseText('nodeView.showMessage.showMaxNodeTypeError.message', {
				adjustToNumber: maxNodes,
				interpolate: { nodeTypeDataDisplayName: nodeTypeDescription.displayName },
			}),
			type: 'error',
			duration: 0,
		});
	}

	/**
	 * Connection operations
	 */

	function createConnection(connection: Connection) {
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
		if (sourceNode.id === targetNode.id) {
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

	async function addConnections(
		connections: AddedNodesAndConnections['connections'],
		{ offsetIndex }: { offsetIndex: number },
	) {
		for (const { from, to } of connections) {
			const fromNode = editableWorkflow.value.nodes[offsetIndex + from.nodeIndex];
			const toNode = editableWorkflow.value.nodes[offsetIndex + to.nodeIndex];

			createConnection({
				source: fromNode.id,
				sourceHandle: `outputs/${NodeConnectionType.Main}/${from.outputIndex ?? 0}`,
				target: toNode.id,
				targetHandle: `inputs/${NodeConnectionType.Main}/${to.inputIndex ?? 0}`,
			});
		}
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

	async function addNodesToWorkflow(data: IWorkflowDataUpdate): Promise<IWorkflowDataUpdate> {
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
		const currentConnections = data.connections!;
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
		workflowsStore.setConnections(tempWorkflow.connectionsBySourceNode);

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
	): Promise<void> {
		// If it is JSON check if it looks on the first look like data we can use
		if (!workflowData.hasOwnProperty('nodes') || !workflowData.hasOwnProperty('connections')) {
			return;
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

			// By default we automatically deselect all the currently
			// selected nodes and select the new ones
			// this.deselectAllNodes();

			// Fix the node position as it could be totally offscreen
			// and the pasted nodes would so not be directly visible to
			// the user
			workflowHelpers.updateNodePositions(
				workflowData,
				NodeViewUtils.getNewNodePosition(editableWorkflow.value.nodes, lastClickPosition.value),
			);

			await addNodesToWorkflow(workflowData);

			// setTimeout(() => {
			// 	(data?.nodes ?? []).forEach((node: INodeUi) => {
			// 		this.nodeSelectedByName(node.name);
			// 	});
			// });

			if (importTags && settingsStore.areTagsEnabled && Array.isArray(workflowData.tags)) {
				await importWorkflowTags(workflowData);
			}
		} catch (error) {
			toast.showError(error, i18n.baseText('nodeView.showError.importWorkflowData.title'));
		}
	}

	async function importWorkflowTags(workflowData: IWorkflowDataUpdate) {
		const allTags = await tagsStore.fetchAll();
		const tagNames = new Set(allTags.map((tag) => tag.name));

		const workflowTags = workflowData.tags as ITag[];
		const notFound = workflowTags.filter((tag) => !tagNames.has(tag.name));

		const creatingTagPromises: Array<Promise<ITag>> = [];
		for (const tag of notFound) {
			const creationPromise = tagsStore.create(tag.name).then((tag: ITag) => {
				allTags.push(tag);
				return tag;
			});

			creatingTagPromises.push(creationPromise);
		}

		await Promise.all(creatingTagPromises);

		const tagIds = workflowTags.reduce((accu: string[], imported: ITag) => {
			const tag = allTags.find((tag) => tag.name === imported.name);
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

	return {
		editableWorkflow,
		editableWorkflowObject,
		triggerNodes,
		initializeNodeDataWithDefaultCredentials,
		addNodes,
		updateNodePosition,
		setNodeActive,
		setNodeActiveByName,
		setNodeSelected,
		toggleNodeDisabled,
		renameNode,
		revertRenameNode,
		deleteNode,
		revertDeleteNode,
		addConnections,
		createConnection,
		deleteConnection,
		revertDeleteConnection,
		isConnectionAllowed,
		importWorkflowData,
		fetchWorkflowDataFromUrl,
	};
}
