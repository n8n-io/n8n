<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, useCssModule } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import CanvasExecuteWorkflowButton from '@/components/canvas/elements/buttons/CanvasExecuteWorkflowButton.vue';
import { useI18n } from '@/composables/useI18n';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import type {
	AddedNodesAndConnections,
	INodeUi,
	ITag,
	ToggleNodeCreatorOptions,
	XYPosition,
} from '@/Interface';
import useWorkflowsEEStore from '@/stores/workflows.ee.store';
import { useTagsStore } from '@/stores/tags.store';
import type { Connection } from '@vue-flow/core';
import type { CanvasElement } from '@/types';
import {
	EnterpriseEditionFeature,
	AI_NODE_CREATOR_VIEW,
	REGULAR_NODE_CREATOR_VIEW,
	TRIGGER_NODE_CREATOR_VIEW,
	VIEWS,
} from '@/constants';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { useExternalHooks } from '@/composables/useExternalHooks';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import type { IConnection, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { useToast } from '@/composables/useToast';
import { v4 as uuid } from 'uuid';
import { useSettingsStore } from '@/stores/settings.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { getUniqueNodeName } from '@/utils/canvasUtilsV2';
import { historyBus } from '@/models/history';
import { useCanvasOperations } from '@/composables/useCanvasOperations';

const NodeCreation = defineAsyncComponent(
	async () => await import('@/components/Node/NodeCreation.vue'),
);

const $style = useCssModule();

const router = useRouter();
const route = useRoute();
const i18n = useI18n();
const telemetry = useTelemetry();
const externalHooks = useExternalHooks();
const toast = useToast();

const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const workflowsEEStore = useWorkflowsEEStore();
const tagsStore = useTagsStore();
const sourceControlStore = useSourceControlStore();
const nodeCreatorStore = useNodeCreatorStore();
const settingsStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const environmentsStore = useEnvironmentsStore();
const externalSecretsStore = useExternalSecretsStore();
const rootStore = useRootStore();
const collaborationStore = useCollaborationStore();

const { runWorkflow } = useRunWorkflow({ router });
const {
	updateNodePosition,
	deleteNode,
	revertDeleteNode,
	createConnection,
	deleteConnection,
	revertDeleteConnection,
} = useCanvasOperations();

const isLoading = ref(true);
const readOnlyNotification = ref<null | { visible: boolean }>(null);

const workflowId = computed<string>(() => route.params.workflowId as string);
const workflow = computed(() => workflowsStore.workflowsById[workflowId.value]);

const editableWorkflow = computed(() => workflowsStore.workflow);
const editableWorkflowObject = computed(() => workflowsStore.getCurrentWorkflow());

const isDemoRoute = computed(() => route.name === VIEWS.DEMO);
const isReadOnlyRoute = computed(() => route?.meta?.readOnlyCanvas === true);
const isReadOnlyEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});

const triggerNodes = computed<INodeUi[]>(() => {
	return workflowsStore.workflowTriggerNodes;
});

const isCanvasAddButtonVisible = computed(() => {
	return (
		triggerNodes.value.length > 0 &&
		!isLoading.value &&
		!isDemoRoute.value &&
		!isReadOnlyEnvironment.value
	);
});

onMounted(() => {
	void initialize();
});

async function initialize() {
	isLoading.value = true;

	const loadPromises: Array<Promise<unknown>> = [
		nodeTypesStore.getNodeTypes(),
		workflowsStore.fetchWorkflow(workflowId.value),
	];

	if (!settingsStore.isPreviewMode && !isDemoRoute.value) {
		loadPromises.push(
			workflowsStore.fetchActiveWorkflows(),
			credentialsStore.fetchAllCredentials(),
			credentialsStore.fetchCredentialTypes(true),
		);

		if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Variables)) {
			loadPromises.push(environmentsStore.fetchAllVariables());
		}

		if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.ExternalSecrets)) {
			loadPromises.push(externalSecretsStore.fetchAllSecrets());
		}
	}

	try {
		await Promise.all(loadPromises);
	} catch (error) {
		return toast.showError(
			error,
			i18n.baseText('nodeView.showError.mounted1.title'),
			i18n.baseText('nodeView.showError.mounted1.message') + ':',
		);
	}

	initializeEditableWorkflow(workflowId.value);

	addUndoRedoEventBindings();

	if (window.parent) {
		window.parent.postMessage(
			JSON.stringify({ command: 'n8nReady', version: rootStore.versionCli }),
			'*',
		);
	}

	isLoading.value = false;
}

onBeforeUnmount(() => {
	removeUndoRedoEventBindings();
});

function addUndoRedoEventBindings() {
	// historyBus.on('nodeMove', onMoveNode);
	// historyBus.on('revertAddNode', onRevertAddNode);
	historyBus.on('revertRemoveNode', onRevertDeleteNode);
	// historyBus.on('revertAddConnection', onRevertAddConnection);
	historyBus.on('revertRemoveConnection', onRevertDeleteConnection);
	// historyBus.on('revertRenameNode', onRevertNameChange);
	// historyBus.on('enableNodeToggle', onRevertEnableToggle);
}

function removeUndoRedoEventBindings() {
	// historyBus.off('nodeMove', onMoveNode);
	// historyBus.off('revertAddNode', onRevertAddNode);
	historyBus.off('revertRemoveNode', onRevertDeleteNode);
	// historyBus.off('revertAddConnection', onRevertAddConnection);
	historyBus.off('revertRemoveConnection', onRevertDeleteConnection);
	// historyBus.off('revertRenameNode', onRevertNameChange);
	// historyBus.off('enableNodeToggle', onRevertEnableToggle);
}

// @TODO Maybe move this to the store
function initializeEditableWorkflow(id: string) {
	const targetWorkflow = workflowsStore.workflowsById[id];

	workflowsStore.addWorkflow(targetWorkflow);
	workflowsStore.setWorkflow(targetWorkflow);
	workflowsStore.setActive(targetWorkflow.active || false);
	workflowsStore.setWorkflowId(targetWorkflow.id);
	workflowsStore.setWorkflowName({ newName: targetWorkflow.name, setStateDirty: false });
	workflowsStore.setWorkflowSettings(targetWorkflow.settings ?? {});
	workflowsStore.setWorkflowPinData(targetWorkflow.pinData ?? {});
	workflowsStore.setWorkflowVersionId(targetWorkflow.versionId);
	workflowsStore.setWorkflowMetadata(targetWorkflow.meta);
	if (targetWorkflow.usedCredentials) {
		workflowsStore.setUsedCredentials(targetWorkflow.usedCredentials);
	}

	const tags = (targetWorkflow.tags ?? []) as ITag[];
	const tagIds = tags.map((tag) => tag.id);
	workflowsStore.setWorkflowTagIds(tagIds || []);
	tagsStore.upsertTags(tags);

	// @TODO Figure out a better way to handle this. Maybe show a message on why the state becomes dirty
	// if (!this.credentialsUpdated) {
	// 	this.uiStore.stateIsDirty = false;
	// }

	void externalHooks.run('workflow.open', {
		workflowId: workflow.value.id,
		workflowName: workflow.value.name,
	});

	// @TODO Figure out a better way to handle this
	// if (selectedExecution?.workflowId !== workflow.id) {
	// 	this.executionsStore.activeExecution = null;
	// 	workflowsStore.currentWorkflowExecutions = [];
	// } else {
	// 	this.executionsStore.activeExecution = selectedExecution;
	// }

	collaborationStore.notifyWorkflowOpened(workflow.value.id);
}

async function onRunWorkflow() {
	await runWorkflow({});
}

function onUpdateNodePosition(id: string, position: CanvasElement['position']) {
	updateNodePosition(id, position, { trackHistory: true });
}

function onDeleteNode(id: string) {
	deleteNode(id, { trackHistory: true });
}

function onRevertDeleteNode({ node }: { node: INodeUi }) {
	revertDeleteNode(node);
}

/**
 * Map new node connection format to the old one and add it to the store
 *
 * @param connection
 */
function onCreateConnection(connection: Connection) {
	createConnection(connection);
}

function onDeleteConnection(connection: Connection) {
	deleteConnection(connection, { trackHistory: true });
}

function onRevertDeleteConnection({ connection }: { connection: [IConnection, IConnection] }) {
	revertDeleteConnection(connection);
}

function onToggleNodeCreator({
	source,
	createNodeActive,
	nodeCreatorView,
}: ToggleNodeCreatorOptions) {
	if (createNodeActive === uiStore.isCreateNodeActive) {
		return;
	}

	if (!nodeCreatorView) {
		nodeCreatorView =
			triggerNodes.value.length > 0 ? REGULAR_NODE_CREATOR_VIEW : TRIGGER_NODE_CREATOR_VIEW;
	}
	// Default to the trigger tab in node creator if there's no trigger node yet
	nodeCreatorStore.setSelectedView(nodeCreatorView);

	let mode;
	switch (nodeCreatorStore.selectedView) {
		case AI_NODE_CREATOR_VIEW:
			mode = 'ai';
			break;
		case REGULAR_NODE_CREATOR_VIEW:
			mode = 'regular';
			break;
		default:
			mode = 'regular';
	}

	uiStore.isCreateNodeActive = createNodeActive;
	if (createNodeActive && source) {
		nodeCreatorStore.setOpenSource(source);
	}

	void externalHooks.run('nodeView.createNodeActiveChanged', {
		source,
		mode,
		createNodeActive,
	});

	telemetry.trackNodesPanel('nodeView.createNodeActiveChanged', {
		source,
		mode,
		createNodeActive,
		workflow_id: workflowId.value,
	});
}

async function onAddNodes(
	{ nodes, connections }: AddedNodesAndConnections,
	dragAndDrop = false,
	position?: XYPosition,
) {
	let currentPosition = position;
	for (const { type, name, position: nodePosition, isAutoAdd, openDetail } of nodes) {
		try {
			await onNodeCreate(
				{
					name,
					type,
					position: nodePosition ?? currentPosition,
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

		const lastAddedNode = editableWorkflow.value.nodes[editableWorkflow.value.nodes.length - 1];
		currentPosition = [
			lastAddedNode.position[0] + NodeViewUtils.NODE_SIZE * 2 + NodeViewUtils.GRID_SIZE,
			lastAddedNode.position[1],
		];
	}

	const newNodesOffset = editableWorkflow.value.nodes.length - nodes.length;
	for (const { from, to } of connections) {
		const fromNode = editableWorkflow.value.nodes[newNodesOffset + from.nodeIndex];
		const toNode = editableWorkflow.value.nodes[newNodesOffset + to.nodeIndex];

		onCreateConnection({
			source: fromNode.id,
			sourceHandle: `outputs/${NodeConnectionType.Main}/${from.outputIndex ?? 0}`,
			target: toNode.id,
			targetHandle: `inputs/${NodeConnectionType.Main}/${to.inputIndex ?? 0}`,
		});
	}

	// @TODO Implement this
	// const lastAddedNode = editableWorkflow.value.nodes[editableWorkflow.value.nodes.length - 1];
	// const workflow = editableWorkflowObject.value;
	// const lastNodeInputs = workflow.getParentNodesByDepth(lastAddedNode.name, 1);
	//
	// // If the last added node has multiple inputs, move them down
	// if (lastNodeInputs.length > 1) {
	// 	lastNodeInputs.slice(1).forEach((node, index) => {
	// 		const nodeUi = workflowsStore.getNodeByName(node.name);
	// 		if (!nodeUi) return;
	//
	// 		// onMoveNode({
	// 		// 	nodeName: nodeUi.name,
	// 		// 	position: [nodeUi.position[0], nodeUi.position[1] + 100 * (index + 1)],
	// 		// });
	// 	});
	// }
}

type AddNodeData = {
	name?: string;
	type: string;
	position?: XYPosition;
};

type AddNodeOptions = {
	dragAndDrop?: boolean;
	openNDV?: boolean;
	trackHistory?: boolean;
	isAutoAdd?: boolean;
};

async function onNodeCreate(node: AddNodeData, _options: AddNodeOptions = {}): Promise<INodeUi> {
	if (!checkIfEditingIsAllowed()) {
		throw new Error(i18n.baseText('nodeViewV2.showError.editingNotAllowed'));
	}

	const newNodeData = await createNodeWithDefaultCredentials(node);
	if (!newNodeData) {
		throw new Error(i18n.baseText('nodeViewV2.showError.failedToCreateNode'));
	}

	/**
	 * @TODO Check if maximum node type limit reached
	 */

	newNodeData.name = getUniqueNodeName(newNodeData.name, workflowsStore.canvasNames);

	workflowsStore.addNode(newNodeData);

	// @TODO Figure out why this is needed and if we can do better...
	// this.matchCredentials(node);

	// const lastSelectedNode = uiStore.getLastSelectedNode;
	// const lastSelectedNodeOutputIndex = uiStore.lastSelectedNodeOutputIndex;
	// const lastSelectedNodeEndpointUuid = uiStore.lastSelectedNodeEndpointUuid;
	// const lastSelectedConnection = canvasStore.lastSelectedConnection;
	//
	// historyStore.startRecordingUndo();
	//
	// const newNodeData = await injectNode(
	// 	nodeTypeName,
	// 	options,
	// 	showDetail,
	// 	trackHistory,
	// 	isAutoAdd,
	// );
	// if (!newNodeData) {
	// 	return;
	// }
	//
	// const outputIndex = lastSelectedNodeOutputIndex || 0;
	// const targetEndpoint = lastSelectedNodeEndpointUuid || '';
	//
	// // Handle connection of scoped_endpoint types
	// if (lastSelectedNodeEndpointUuid && !isAutoAdd) {
	// 	const lastSelectedEndpoint = this.instance.getEndpoint(lastSelectedNodeEndpointUuid);
	// 	if (
	// 		lastSelectedEndpoint &&
	// 		this.checkNodeConnectionAllowed(
	// 			lastSelectedNode,
	// 			newNodeData,
	// 			lastSelectedEndpoint.scope as NodeConnectionType,
	// 		)
	// 	) {
	// 		const connectionType = lastSelectedEndpoint.scope as ConnectionTypes;
	// 		const newNodeElement = this.instance.getManagedElement(newNodeData.id);
	// 		const newNodeConnections = this.instance.getEndpoints(newNodeElement);
	// 		const viableConnection = newNodeConnections.find((conn) => {
	// 			return (
	// 				conn.scope === connectionType &&
	// 				lastSelectedEndpoint.parameters.connection !== conn.parameters.connection
	// 			);
	// 		});
	//
	// 		this.instance?.connect({
	// 			uuids: [targetEndpoint, viableConnection?.uuid || ''],
	// 			detachable: !this.isReadOnlyRoute && !this.readOnlyEnv,
	// 		});
	// 		this.historyStore.stopRecordingUndo();
	// 		return;
	// 	}
	// }
	// If a node is last selected then connect between the active and its child ones
	// if (lastSelectedNode && !isAutoAdd) {
	// 	await this.$nextTick();
	//
	// 	if (lastSelectedConnection?.__meta) {
	// 		this.__deleteJSPlumbConnection(lastSelectedConnection, trackHistory);
	//
	// 		const targetNodeName = lastSelectedConnection.__meta.targetNodeName;
	// 		const targetOutputIndex = lastSelectedConnection.__meta.targetOutputIndex;
	// 		this.connectTwoNodes(
	// 			newNodeData.name,
	// 			0,
	// 			targetNodeName,
	// 			targetOutputIndex,
	// 			NodeConnectionType.Main,
	// 		);
	// 	}
	//
	// 	// Connect active node to the newly created one
	// 	this.connectTwoNodes(
	// 		lastSelectedNode.name,
	// 		outputIndex,
	// 		newNodeData.name,
	// 		0,
	// 		NodeConnectionType.Main,
	// 	);
	// }
	// this.historyStore.stopRecordingUndo();

	return newNodeData;
}

async function createNodeWithDefaultCredentials(node: Partial<INodeUi>) {
	const nodeTypeDescription = nodeTypesStore.getNodeType(
		node.type as string,
	) as INodeTypeDescription;

	let nodeVersion = nodeTypeDescription.defaultVersion;
	if (nodeVersion === undefined) {
		nodeVersion = Array.isArray(nodeTypeDescription.version)
			? nodeTypeDescription.version.slice(-1)[0]
			: nodeTypeDescription.version;
	}

	const newNodeData: INodeUi = {
		id: uuid(),
		name: node.name ?? (nodeTypeDescription.defaults.name as string),
		type: nodeTypeDescription.name,
		typeVersion: nodeVersion,
		position: node.position ?? [0, 0],
		parameters: {},
	};

	/**
	 * @TODO Implement this
	 */

	// // Load the default parameter values because only values which differ
	// // from the defaults get saved
	// if (nodeType !== null) {
	// 	let nodeParameters = null;
	// 	try {
	// 		nodeParameters = NodeHelpers.getNodeParameters(
	// 			nodeType.properties,
	// 			node.parameters,
	// 			true,
	// 			false,
	// 			node,
	// 		);
	// 	} catch (e) {
	// 		console.error(
	// 			this.$locale.baseText('nodeView.thereWasAProblemLoadingTheNodeParametersOfNode') +
	// 			`: "${node.name}"`,
	// 		);
	// 		console.error(e);
	// 	}
	// 	node.parameters = nodeParameters !== null ? nodeParameters : {};
	//
	// 	// if it's a webhook and the path is empty set the UUID as the default path
	// 	if (
	// 		[WEBHOOK_NODE_TYPE, FORM_TRIGGER_NODE_TYPE].includes(node.type) &&
	// 		node.parameters.path === ''
	// 	) {
	// 		node.parameters.path = node.webhookId as string;
	// 	}
	// }
	// const credentialPerType = nodeTypeData.credentials
	// 	?.map((type) => credentialsStore.getUsableCredentialByType(type.name))
	// 	.flat();
	//
	// if (credentialPerType && credentialPerType.length === 1) {
	// 	const defaultCredential = credentialPerType[0];
	//
	// 	const selectedCredentials = credentialsStore.getCredentialById(defaultCredential.id);
	// 	const selected = { id: selectedCredentials.id, name: selectedCredentials.name };
	// 	const credentials = {
	// 		[defaultCredential.type]: selected,
	// 	};
	//
	// 	await loadNodesProperties(
	// 		[newNodeData].map((node) => ({ name: node.type, version: node.typeVersion })),
	// 	);
	//
	// 	const nodeType = nodeTypesStore.getNodeType(newNodeData.type, newNodeData.typeVersion);
	// 	const nodeParameters = NodeHelpers.getNodeParameters(
	// 		nodeType?.properties ?? [],
	// 		{},
	// 		true,
	// 		false,
	// 		newNodeData,
	// 	);
	//
	// 	if (nodeTypeData.credentials) {
	// 		const authentication = nodeTypeData.credentials.find(
	// 			(type) => type.name === defaultCredential.type,
	// 		);
	// 		if (authentication?.displayOptions?.hide) {
	// 			return newNodeData;
	// 		}
	//
	// 		const authDisplayOptions = authentication?.displayOptions?.show;
	// 		if (!authDisplayOptions) {
	// 			newNodeData.credentials = credentials;
	// 			return newNodeData;
	// 		}
	//
	// 		if (Object.keys(authDisplayOptions).length === 1 && authDisplayOptions.authentication) {
	// 			// ignore complex case when there's multiple dependencies
	// 			newNodeData.credentials = credentials;
	//
	// 			let parameters: { [key: string]: string } = {};
	// 			for (const displayOption of Object.keys(authDisplayOptions)) {
	// 				if (nodeParameters && !nodeParameters[displayOption]) {
	// 					parameters = {};
	// 					newNodeData.credentials = undefined;
	// 					break;
	// 				}
	// 				const optionValue = authDisplayOptions[displayOption]?.[0];
	// 				if (optionValue && typeof optionValue === 'string') {
	// 					parameters[displayOption] = optionValue;
	// 				}
	// 				newNodeData.parameters = {
	// 					...newNodeData.parameters,
	// 					...parameters,
	// 				};
	// 			}
	// 		}
	// 	}
	// }

	return newNodeData;
}

/**
 * @TODO Implement if needed
 */
// async loadNodesProperties(nodeInfos: INodeTypeNameVersion[]): Promise<void> {
// 	const allNodes: INodeTypeDescription[] = this.nodeTypesStore.allNodeTypes;
//
// const nodesToBeFetched: INodeTypeNameVersion[] = [];
// allNodes.forEach((node) => {
// 	const nodeVersions = Array.isArray(node.version) ? node.version : [node.version];
// 	if (
// 		!!nodeInfos.find((n) => n.name === node.name && nodeVersions.includes(n.version)) &&
// 		!node.hasOwnProperty('properties')
// 	) {
// 		nodesToBeFetched.push({
// 			name: node.name,
// 			version: Array.isArray(node.version) ? node.version.slice(-1)[0] : node.version,
// 		});
// 	}
// });
//
// if (nodesToBeFetched.length > 0) {
// 	// Only call API if node information is actually missing
// 	this.canvasStore.startLoading();
// 	await this.nodeTypesStore.getNodesInformation(nodesToBeFetched);
// 	this.canvasStore.stopLoading();
// }
// }

/**
 * @TODO Probably not needed and can be merged into addNode
 */
async function injectNode(
	_nodeTypeName: string,
	_options: AddNodeOptions = {},
	_showDetail = true,
	_trackHistory = false,
	_isAutoAdd = false,
) {
	// const nodeTypeData: INodeTypeDescription | null =
	// 	this.nodeTypesStore.getNodeType(nodeTypeName);
	//
	// if (nodeTypeData === null) {
	// 	this.showMessage({
	// 		title: this.$locale.baseText('nodeView.showMessage.addNodeButton.title'),
	// 		message: this.$locale.baseText('nodeView.showMessage.addNodeButton.message', {
	// 			interpolate: { nodeTypeName },
	// 		}),
	// 		type: 'error',
	// 	});
	// 	return;
	// }
	//
	// if (
	// 	nodeTypeData.maxNodes !== undefined &&
	// 	this.workflowHelpers.getNodeTypeCount(nodeTypeName) >= nodeTypeData.maxNodes
	// ) {
	// 	this.showMaxNodeTypeError(nodeTypeData);
	// 	return;
	// }
	//
	// const newNodeData = await this.getNewNodeWithDefaultCredential(nodeTypeData, {
	// 	name: options.name,
	// });
	//
	// // when pulling new connection from node or injecting into a connection
	// const lastSelectedNode = this.lastSelectedNode;
	//
	// if (options.position) {
	// 	newNodeData.position = NodeViewUtils.getNewNodePosition(
	// 		this.canvasStore.getNodesWithPlaceholderNode(),
	// 		options.position,
	// 	);
	// } else if (lastSelectedNode) {
	// 	const lastSelectedConnection = this.canvasStore.lastSelectedConnection;
	// 	if (lastSelectedConnection) {
	// 		// set when injecting into a connection
	// 		const [diffX] = NodeViewUtils.getConnectorLengths(lastSelectedConnection);
	// 		if (diffX <= NodeViewUtils.MAX_X_TO_PUSH_DOWNSTREAM_NODES) {
	// 			this.pushDownstreamNodes(
	// 				lastSelectedNode.name,
	// 				NodeViewUtils.PUSH_NODES_OFFSET,
	// 				trackHistory,
	// 			);
	// 		}
	// 	}
	//
	// 	// set when pulling connections
	// 	if (this.canvasStore.newNodeInsertPosition) {
	// 		newNodeData.position = NodeViewUtils.getNewNodePosition(this.nodes, [
	// 			this.canvasStore.newNodeInsertPosition[0] + NodeViewUtils.GRID_SIZE,
	// 			this.canvasStore.newNodeInsertPosition[1] - NodeViewUtils.NODE_SIZE / 2,
	// 		]);
	// 		this.canvasStore.newNodeInsertPosition = null;
	// 	} else {
	// 		let yOffset = 0;
	// 		const workflow = this.workflowHelpers.getCurrentWorkflow();
	//
	// 		if (lastSelectedConnection) {
	// 			const sourceNodeType = this.nodeTypesStore.getNodeType(
	// 				lastSelectedNode.type,
	// 				lastSelectedNode.typeVersion,
	// 			);
	//
	// 			if (sourceNodeType) {
	// 				const offsets = [
	// 					[-100, 100],
	// 					[-140, 0, 140],
	// 					[-240, -100, 100, 240],
	// 				];
	//
	// 				const sourceNodeOutputs = NodeHelpers.getNodeOutputs(
	// 					workflow,
	// 					lastSelectedNode,
	// 					sourceNodeType,
	// 				);
	// 				const sourceNodeOutputTypes = NodeHelpers.getConnectionTypes(sourceNodeOutputs);
	//
	// 				const sourceNodeOutputMainOutputs = sourceNodeOutputTypes.filter(
	// 					(output) => output === NodeConnectionType.Main,
	// 				);
	//
	// 				if (sourceNodeOutputMainOutputs.length > 1) {
	// 					const offset = offsets[sourceNodeOutputMainOutputs.length - 2];
	// 					const sourceOutputIndex = lastSelectedConnection.__meta
	// 						? lastSelectedConnection.__meta.sourceOutputIndex
	// 						: 0;
	// 					yOffset = offset[sourceOutputIndex];
	// 				}
	// 			}
	// 		}
	//
	// 		let outputs: Array<ConnectionTypes | INodeOutputConfiguration> = [];
	// 		try {
	// 			// It fails when the outputs are an expression. As those nodes have
	// 			// normally no outputs by default and the only reason we need the
	// 			// outputs here is to calculate the position, it is fine to assume
	// 			// that they have no outputs and are so treated as a regular node
	// 			// with only "main" outputs.
	// 			outputs = NodeHelpers.getNodeOutputs(workflow, newNodeData, nodeTypeData);
	// 		} catch (e) {}
	// 		const outputTypes = NodeHelpers.getConnectionTypes(outputs);
	// 		const lastSelectedNodeType = this.nodeTypesStore.getNodeType(
	// 			lastSelectedNode.type,
	// 			lastSelectedNode.typeVersion,
	// 		);
	//
	// 		// If node has only scoped outputs, position it below the last selected node
	// 		if (
	// 			outputTypes.length > 0 &&
	// 			outputTypes.every((outputName) => outputName !== NodeConnectionType.Main)
	// 		) {
	// 			const lastSelectedNodeWorkflow = workflow.getNode(lastSelectedNode.name);
	// 			const lastSelectedInputs = NodeHelpers.getNodeInputs(
	// 				workflow,
	// 				lastSelectedNodeWorkflow,
	// 				lastSelectedNodeType,
	// 			);
	// 			const lastSelectedInputTypes = NodeHelpers.getConnectionTypes(lastSelectedInputs);
	//
	// 			const scopedConnectionIndex = (lastSelectedInputTypes || [])
	// 				.filter((input) => input !== NodeConnectionType.Main)
	// 				.findIndex((inputType) => outputs[0] === inputType);
	//
	// 			newNodeData.position = NodeViewUtils.getNewNodePosition(
	// 				this.nodes,
	// 				[
	// 					lastSelectedNode.position[0] +
	// 					(NodeViewUtils.NODE_SIZE /
	// 						(Math.max(lastSelectedNodeType?.inputs?.length ?? 1), 1)) *
	// 					scopedConnectionIndex,
	// 					lastSelectedNode.position[1] + NodeViewUtils.PUSH_NODES_OFFSET,
	// 				],
	// 				[100, 0],
	// 			);
	// 		} else {
	// 			// Has only main outputs or no outputs at all
	// 			const inputs = NodeHelpers.getNodeInputs(
	// 				workflow,
	// 				lastSelectedNode,
	// 				lastSelectedNodeType,
	// 			);
	// 			const inputsTypes = NodeHelpers.getConnectionTypes(inputs);
	//
	// 			let pushOffset = NodeViewUtils.PUSH_NODES_OFFSET;
	// 			if (!!inputsTypes.find((input) => input !== NodeConnectionType.Main)) {
	// 				// If the node has scoped inputs, push it down a bit more
	// 				pushOffset += 150;
	// 			}
	//
	// 			// If a node is active then add the new node directly after the current one
	// 			newNodeData.position = NodeViewUtils.getNewNodePosition(
	// 				this.nodes,
	// 				[lastSelectedNode.position[0] + pushOffset, lastSelectedNode.position[1] + yOffset],
	// 				[100, 0],
	// 			);
	// 		}
	// 	}
	// } else {
	// 	// If added node is a trigger and it's the first one added to the canvas
	// 	// we place it at canvasAddButtonPosition to replace the canvas add button
	// 	const position =
	// 		this.nodeTypesStore.isTriggerNode(nodeTypeName) && !this.containsTrigger
	// 			? this.canvasStore.canvasAddButtonPosition
	// 			: // If no node is active find a free spot
	// 			(this.lastClickPosition as XYPosition);
	//
	// 	newNodeData.position = NodeViewUtils.getNewNodePosition(this.nodes, position);
	// }
	//
	// const localizedName = this.locale.localizeNodeName(newNodeData.name, newNodeData.type);
	//
	// newNodeData.name = this.uniqueNodeName(localizedName);
	//
	// if (nodeTypeData.webhooks?.length) {
	// 	newNodeData.webhookId = uuid();
	// }
	//
	// await this.addNodes([newNodeData], undefined, trackHistory);
	// this.workflowsStore.setNodePristine(newNodeData.name, true);
	//
	// this.uiStore.stateIsDirty = true;
	//
	// if (nodeTypeName === STICKY_NODE_TYPE) {
	// 	this.$telemetry.trackNodesPanel('nodeView.addSticky', {
	// 		workflow_id: this.workflowsStore.workflowId,
	// 	});
	// } else {
	// 	void this.externalHooks.run('nodeView.addNodeButton', { nodeTypeName });
	// 	useSegment().trackAddedTrigger(nodeTypeName);
	// 	const trackProperties: ITelemetryTrackProperties = {
	// 		node_type: nodeTypeName,
	// 		node_version: newNodeData.typeVersion,
	// 		is_auto_add: isAutoAdd,
	// 		workflow_id: this.workflowsStore.workflowId,
	// 		drag_and_drop: options.dragAndDrop,
	// 	};
	//
	// 	if (lastSelectedNode) {
	// 		trackProperties.input_node_type = lastSelectedNode.type;
	// 	}
	//
	// 	this.$telemetry.trackNodesPanel('nodeView.addNodeButton', trackProperties);
	// }
	//
	// // Automatically deselect all nodes and select the current one and also active
	// // current node. But only if it's added manually by the user (not by undo/redo mechanism)
	// if (trackHistory) {
	// 	this.deselectAllNodes();
	// 	setTimeout(() => {
	// 		this.nodeSelectedByName(
	// 			newNodeData.name,
	// 			showDetail && nodeTypeName !== STICKY_NODE_TYPE,
	// 		);
	// 	});
	// }
	//
	// return newNodeData;
}

function checkIfEditingIsAllowed(): boolean {
	if (readOnlyNotification.value?.visible) {
		return false;
	}

	if (isReadOnlyRoute.value || isReadOnlyEnvironment.value) {
		const messageContext = isReadOnlyRoute.value ? 'executions' : 'workflows';
		readOnlyNotification.value = toast.showMessage({
			title: i18n.baseText(
				isReadOnlyEnvironment.value
					? `readOnlyEnv.showMessage.${messageContext}.title`
					: 'readOnly.showMessage.executions.title',
			),
			message: i18n.baseText(
				isReadOnlyEnvironment.value
					? `readOnlyEnv.showMessage.${messageContext}.message`
					: 'readOnly.showMessage.executions.message',
			),
			type: 'info',
			dangerouslyUseHTMLString: true,
		}) as unknown as { visible: boolean };

		return false;
	}

	return true;
}
</script>

<template>
	<WorkflowCanvas
		v-if="editableWorkflow && editableWorkflowObject"
		:workflow="editableWorkflow"
		:workflow-object="editableWorkflowObject"
		@update:node:position="onUpdateNodePosition"
		@delete:node="onDeleteNode"
		@create:connection="onCreateConnection"
		@delete:connection="onDeleteConnection"
	>
		<div :class="$style.executionButtons">
			<CanvasExecuteWorkflowButton @click="onRunWorkflow" />
		</div>
		<Suspense>
			<NodeCreation
				v-if="!isReadOnlyRoute && !isReadOnlyEnvironment"
				:create-node-active="uiStore.isCreateNodeActive"
				:node-view-scale="1"
				@toggle-node-creator="onToggleNodeCreator"
				@add-nodes="onAddNodes"
			/>
		</Suspense>
	</WorkflowCanvas>
</template>

<style lang="scss" module>
.executionButtons {
	position: absolute;
	display: flex;
	justify-content: center;
	align-items: center;
	left: 50%;
	transform: translateX(-50%);
	bottom: var(--spacing-l);
	width: auto;

	@media (max-width: $breakpoint-2xs) {
		bottom: 150px;
	}

	button {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-left: 0.625rem;

		&:first-child {
			margin: 0;
		}
	}
}
</style>
