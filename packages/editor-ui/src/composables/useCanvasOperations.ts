/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import type { CanvasElement } from '@/types';
import { CanvasConnectionMode } from '@/types';
import type {
	AddedNodesAndConnections,
	INodeUi,
	INodeUpdatePropertiesInformation,
	XYPosition,
} from '@/Interface';
import {
	FORM_TRIGGER_NODE_TYPE,
	QUICKSTART_NOTE_NAME,
	STICKY_NODE_TYPE,
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
	getUniqueNodeName,
	mapCanvasConnectionToLegacyConnection,
	parseCanvasConnectionHandleString,
} from '@/utils/canvasUtilsV2';
import type {
	ConnectionTypes,
	IConnection,
	INodeInputConfiguration,
	INodeOutputConfiguration,
	INodeTypeDescription,
	INodeTypeNameVersion,
	ITelemetryTrackProperties,
} from 'n8n-workflow';
import { NodeConnectionType, NodeHelpers } from 'n8n-workflow';
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
	const workflowsStore = useWorkflowsStore();
	const credentialsStore = useCredentialsStore();
	const historyStore = useHistoryStore();
	const uiStore = useUIStore();
	const ndvStore = useNDVStore();
	const nodeTypesStore = useNodeTypesStore();
	const canvasStore = useCanvasStore();

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
		position: CanvasElement['position'],
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
					sourceHandle: `outputs/${NodeConnectionType.Main}/${outputIndex}`,
					target: newNodeData.id,
					targetHandle: `inputs/${NodeConnectionType.Main}/0`,
				});
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
			// @TODO Implement settings lastSelectedConnection for new canvas
			const lastSelectedConnection = canvasStore.lastSelectedConnection;
			if (lastSelectedConnection) {
				// set when injecting into a connection
				const [diffX] = NodeViewUtils.getConnectorLengths(lastSelectedConnection);
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
				if (lastSelectedConnection) {
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
							const offset = offsets[sourceNodeOutputMainOutputs.length - 2];
							const sourceOutputIndex = lastSelectedConnection.__meta
								? lastSelectedConnection.__meta.sourceOutputIndex
								: 0;
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
			const oldPosition = node.position;

			if (node.position[0] < sourceNode.position[0]) {
				continue;
			}

			const updateInformation: INodeUpdatePropertiesInformation = {
				name: nodeName,
				properties: {
					position: [node.position[0] + margin, node.position[1]],
				},
			};

			workflowsStore.updateNodeProperties(updateInformation);
			updateNodePosition(node.id, { x: node.position[0], y: node.position[1] });

			if (
				(trackHistory && oldPosition[0] !== updateInformation.properties.position[0]) ||
				oldPosition[1] !== updateInformation.properties.position[1]
			) {
				historyStore.pushCommandToUndo(
					new MoveNodeCommand(nodeName, oldPosition, updateInformation.properties.position),
					trackHistory,
				);
			}
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
	};
}
