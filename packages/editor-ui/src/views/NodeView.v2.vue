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
	IUpdateInformation,
	IWorkflowDataUpdate,
	ToggleNodeCreatorOptions,
	XYPosition,
} from '@/Interface';
import { useTagsStore } from '@/stores/tags.store';
import type { Connection } from '@vue-flow/core';
import type { CanvasElement } from '@/types';
import { EnterpriseEditionFeature, VIEWS } from '@/constants';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import type { ExecutionSummary, IConnection, INodeTypeDescription } from 'n8n-workflow/Interfaces';
import { NodeConnectionType } from 'n8n-workflow/Interfaces';
import { useToast } from '@/composables/useToast';
import { v4 as uuid } from 'uuid';
import { useSettingsStore } from '@/stores/settings.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useRootStore } from '@/stores/root.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { getUniqueNodeName } from '@/utils/canvasUtilsV2';
import { historyBus } from '@/models/history';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useExecutionsStore } from '@/stores/executions.store';

const NodeCreation = defineAsyncComponent(
	async () => await import('@/components/Node/NodeCreation.vue'),
);

const NodeDetailsView = defineAsyncComponent(
	async () => await import('@/components/NodeDetailsView.vue'),
);

const $style = useCssModule();

const router = useRouter();
const route = useRoute();
const i18n = useI18n();
const externalHooks = useExternalHooks();
const toast = useToast();

const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const tagsStore = useTagsStore();
const sourceControlStore = useSourceControlStore();
const nodeCreatorStore = useNodeCreatorStore();
const settingsStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const environmentsStore = useEnvironmentsStore();
const externalSecretsStore = useExternalSecretsStore();
const rootStore = useRootStore();
const collaborationStore = useCollaborationStore();
const executionsStore = useExecutionsStore();

const { runWorkflow } = useRunWorkflow({ router });
const {
	updateNodePosition,
	renameNode,
	revertRenameNode,
	setNodeActive,
	deleteNode,
	revertDeleteNode,
	createConnection,
	deleteConnection,
	revertDeleteConnection,
	setNodeActiveByName,
} = useCanvasOperations();

const isLoading = ref(true);
const readOnlyNotification = ref<null | { visible: boolean }>(null);

const isProductionExecutionPreview = ref(false);
const isExecutionPreview = ref(false);

const canOpenNDV = ref(true);
const hideNodeIssues = ref(false);

const workflowId = computed<string>(() => route.params.workflowId as string);
const workflow = computed(() => workflowsStore.workflowsById[workflowId.value]);

const editableWorkflow = computed(() => workflowsStore.workflow);
const editableWorkflowObject = computed(() => workflowsStore.getCurrentWorkflow());

const isDemoRoute = computed(() => route.name === VIEWS.DEMO);
const isReadOnlyRoute = computed(() => route?.meta?.readOnlyCanvas === true);
const isReadOnlyEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
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
	addPostMessageEventBindings();

	if (window.parent) {
		window.parent.postMessage(
			JSON.stringify({ command: 'n8nReady', version: rootStore.versionCli }),
			'*',
		);
	}

	isLoading.value = false;
}

onBeforeUnmount(() => {
	removePostMessageEventBindings();
	removeUndoRedoEventBindings();
});

function addUndoRedoEventBindings() {
	// historyBus.on('nodeMove', onMoveNode);
	// historyBus.on('revertAddNode', onRevertAddNode);
	historyBus.on('revertRemoveNode', onRevertDeleteNode);
	// historyBus.on('revertAddConnection', onRevertAddConnection);
	historyBus.on('revertRemoveConnection', onRevertDeleteConnection);
	historyBus.on('revertRenameNode', onRevertRenameNode);
	// historyBus.on('enableNodeToggle', onRevertEnableToggle);
}

function removeUndoRedoEventBindings() {
	// historyBus.off('nodeMove', onMoveNode);
	// historyBus.off('revertAddNode', onRevertAddNode);
	historyBus.off('revertRemoveNode', onRevertDeleteNode);
	// historyBus.off('revertAddConnection', onRevertAddConnection);
	historyBus.off('revertRemoveConnection', onRevertDeleteConnection);
	historyBus.off('revertRenameNode', onRevertRenameNode);
	// historyBus.off('enableNodeToggle', onRevertEnableToggle);
}

function addPostMessageEventBindings() {
	window.addEventListener('message', onPostMessageReceived);
}

function removePostMessageEventBindings() {
	window.removeEventListener('message', onPostMessageReceived);
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

function onSetNodeActive(id: string) {
	setNodeActive(id);
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

	const lastAddedNode = editableWorkflow.value.nodes[editableWorkflow.value.nodes.length - 1];
	const lastNodeInputs = editableWorkflowObject.value.getParentNodesByDepth(lastAddedNode.name, 1);

	// If the last added node has multiple inputs, move them down
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

	return newNodeData;
}

async function createNodeWithDefaultCredentials(node: Partial<INodeUi>) {
	const nodeTypeDescription = nodeTypesStore.getNodeType(
		node.type as string,
	) as INodeTypeDescription;

	let nodeVersion = nodeTypeDescription.defaultVersion;
	if (typeof nodeVersion === 'undefined') {
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

	return newNodeData;
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

async function onPostMessageReceived(message: MessageEvent) {
	if (!message || typeof message.data !== 'string' || !message.data?.includes?.('"command"')) {
		return;
	}
	try {
		const json = JSON.parse(message.data);
		if (json && json.command === 'openWorkflow') {
			try {
				await importWorkflowExact(json.data);
				canOpenNDV.value = json.canOpenNDV ?? true;
				hideNodeIssues.value = json.hideNodeIssues ?? false;
				isExecutionPreview.value = false;
			} catch (e) {
				if (window.top) {
					window.top.postMessage(
						JSON.stringify({
							command: 'error',
							message: i18n.baseText('openWorkflow.workflowImportError'),
						}),
						'*',
					);
				}
				toast.showMessage({
					title: i18n.baseText('openWorkflow.workflowImportError'),
					message: (e as Error).message,
					type: 'error',
				});
			}
		} else if (json && json.command === 'openExecution') {
			try {
				// If this NodeView is used in preview mode (in iframe) it will not have access to the main app store
				// so everything it needs has to be sent using post messages and passed down to child components
				isProductionExecutionPreview.value = json.executionMode !== 'manual';

				await openExecution(json.executionId);
				canOpenNDV.value = json.canOpenNDV ?? true;
				hideNodeIssues.value = json.hideNodeIssues ?? false;
				isExecutionPreview.value = true;
			} catch (e) {
				if (window.top) {
					window.top.postMessage(
						JSON.stringify({
							command: 'error',
							message: i18n.baseText('nodeView.showError.openExecution.title'),
						}),
						'*',
					);
				}
				toast.showMessage({
					title: i18n.baseText('nodeView.showError.openExecution.title'),
					message: (e as Error).message,
					type: 'error',
				});
			}
		} else if (json?.command === 'setActiveExecution') {
			executionsStore.activeExecution = (await executionsStore.fetchExecution(
				json.executionId,
			)) as ExecutionSummary;
		}
	} catch (e) {}
}

async function onSwitchSelectedNode(nodeName: string) {
	setNodeActiveByName(nodeName);
}

async function onOpenConnectionNodeCreator(node: string, connectionType: NodeConnectionType) {
	nodeCreatorStore.openSelectiveNodeCreator({ node, connectionType });
}

function onToggleNodeCreator(options: ToggleNodeCreatorOptions) {
	nodeCreatorStore.openNodeCreator(options);
}

async function openExecution(_executionId: string) {
	// @TODO
}

async function importWorkflowExact(_workflow: IWorkflowDataUpdate) {
	// @TODO
}

async function onRevertRenameNode({
	currentName,
	newName,
}: {
	currentName: string;
	newName: string;
}) {
	await revertRenameNode(currentName, newName);
}

function onUpdateNodeValue(parameterData: IUpdateInformation) {
	if (parameterData.name === 'name' && parameterData.oldValue) {
		// The name changed so we have to take care that
		// the connections get changed.
		void renameNode(parameterData.oldValue as string, parameterData.value as string);
	}
}
</script>

<template>
	<WorkflowCanvas
		v-if="editableWorkflow && editableWorkflowObject"
		:workflow="editableWorkflow"
		:workflow-object="editableWorkflowObject"
		@update:node:position="onUpdateNodePosition"
		@update:node:active="onSetNodeActive"
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
		<Suspense>
			<NodeDetailsView
				:read-only="isReadOnlyRoute || isReadOnlyEnvironment"
				:is-production-execution-preview="isProductionExecutionPreview"
				:renaming="false"
				@value-changed="onUpdateNodeValue"
				@switch-selected-node="onSwitchSelectedNode"
				@open-connection-node-creator="onOpenConnectionNodeCreator"
			/>
			<!--
				:renaming="renamingActive"
				@stop-execution="stopExecution"
				@save-keyboard-shortcut="onSaveKeyboardShortcut"
			-->
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
