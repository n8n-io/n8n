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
	IUpdateInformation,
	IWorkflowDataUpdate,
	ToggleNodeCreatorOptions,
	XYPosition,
} from '@/Interface';
import type { Connection } from '@vue-flow/core';
import type { CanvasElement } from '@/types';
import { EnterpriseEditionFeature, VIEWS } from '@/constants';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import type { ExecutionSummary, IConnection } from 'n8n-workflow';
import type { NodeConnectionType } from 'n8n-workflow';
import { useToast } from '@/composables/useToast';
import { useSettingsStore } from '@/stores/settings.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useRootStore } from '@/stores/root.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { historyBus } from '@/models/history';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useExecutionsStore } from '@/stores/executions.store';
import { useCanvasStore } from '@/stores/canvas.store';
import useCanvasMouseSelect from '@/composables/useCanvasMouseSelect';

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
const sourceControlStore = useSourceControlStore();
const nodeCreatorStore = useNodeCreatorStore();
const settingsStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const environmentsStore = useEnvironmentsStore();
const externalSecretsStore = useExternalSecretsStore();
const rootStore = useRootStore();
const collaborationStore = useCollaborationStore();
const executionsStore = useExecutionsStore();
const canvasStore = useCanvasStore();

const lastClickPosition = ref<XYPosition>([450, 450]);

const { runWorkflow } = useRunWorkflow({ router });
const {
	updateNodePosition,
	renameNode,
	revertRenameNode,
	setNodeActive,
	setNodeSelected,
	deleteNode,
	revertDeleteNode,
	addNodes,
	createConnection,
	deleteConnection,
	revertDeleteConnection,
	setNodeActiveByName,
	addConnections,
	editableWorkflow,
	editableWorkflowObject,
	triggerNodes,
} = useCanvasOperations({ router, lastClickPosition });

const { getMousePositionWithinNodeView } = useCanvasMouseSelect();

const isLoading = ref(true);
const readOnlyNotification = ref<null | { visible: boolean }>(null);

const isProductionExecutionPreview = ref(false);
const isExecutionPreview = ref(false);

const canOpenNDV = ref(true);
const hideNodeIssues = ref(false);

const workflowId = computed<string>(() => route.params.workflowId as string);
const workflow = computed(() => workflowsStore.workflowsById[workflowId.value]);

const isDemoRoute = computed(() => route.name === VIEWS.DEMO);
const isReadOnlyRoute = computed(() => route?.meta?.readOnlyCanvas === true);
const isReadOnlyEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});

const isCanvasAddButtonVisible = computed(() => {
	return (
		triggerNodes.value.length > 0 &&
		!isLoading.value &&
		!isDemoRoute.value &&
		!isReadOnlyEnvironment.value
	);
});

/**
 * Initialization
 */

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

	workflowsStore.initializeEditableWorkflow(workflowId.value);

	void externalHooks.run('workflow.open', {
		workflowId: workflowsStore.workflow.id,
		workflowName: workflowsStore.workflow.name,
	});
	collaborationStore.notifyWorkflowOpened(workflowsStore.workflow.id);

	const selectedExecution = executionsStore.activeExecution;
	if (selectedExecution?.workflowId !== workflowsStore.workflow.id) {
		executionsStore.activeExecution = null;
		workflowsStore.currentWorkflowExecutions = [];
	} else {
		executionsStore.activeExecution = selectedExecution;
	}

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

/**
 * Nodes
 */

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

function onSetNodeSelected(id?: string) {
	setNodeSelected(id);
}

function onRenameNode(parameterData: IUpdateInformation) {
	// The name changed. Do not forget to change the connections as well
	if (parameterData.name === 'name' && parameterData.oldValue) {
		void renameNode(parameterData.oldValue as string, parameterData.value as string);
	}
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

/**
 * Connections
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

/**
 * Import / Export
 */

async function importWorkflowExact(_workflow: IWorkflowDataUpdate) {
	// @TODO
}

/**
 * Node creator
 */

async function onAddNodesAndConnections(
	{ nodes, connections }: AddedNodesAndConnections,
	dragAndDrop = false,
	position?: XYPosition,
) {
	if (!checkIfEditingIsAllowed()) {
		return;
	}

	await addNodes(nodes, { dragAndDrop, position });
	await addConnections(connections, {
		offsetIndex: editableWorkflow.value.nodes.length - nodes.length,
	});
}

async function onSwitchActiveNode(nodeName: string) {
	setNodeActiveByName(nodeName);
}

async function onOpenConnectionNodeCreator(node: string, connectionType: NodeConnectionType) {
	nodeCreatorStore.openSelectiveNodeCreator({ node, connectionType });
}

function onToggleNodeCreator(options: ToggleNodeCreatorOptions) {
	nodeCreatorStore.openNodeCreator(options);
}

/**
 * Executions
 */

async function onRunWorkflow() {
	await runWorkflow({});
}

async function openExecution(_executionId: string) {
	// @TODO
}

/**
 * History events
 */

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

/**
 * Post message events
 */

function addPostMessageEventBindings() {
	window.addEventListener('message', onPostMessageReceived);
}

function removePostMessageEventBindings() {
	window.removeEventListener('message', onPostMessageReceived);
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
				toast.showError(e, i18n.baseText('openWorkflow.workflowImportError'));
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

/**
 * Permission checks
 */

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

/**
 * Mouse events
 */

function onMouseDown(e: MouseEvent | TouchEvent) {
	// @TODO The function below uses the zoom level of the old canvas, update it to use the new one
	// Save the location of the mouse click
	lastClickPosition.value = getMousePositionWithinNodeView(e);
}

function onMouseUp(e: MouseEvent | TouchEvent) {
	canvasStore.newNodeInsertPosition = getMousePositionWithinNodeView(e);
}

/**
 * Lifecycle
 */

onMounted(() => {
	void initialize();
});
</script>

<template>
	<WorkflowCanvas
		v-if="editableWorkflow && editableWorkflowObject"
		:workflow="editableWorkflow"
		:workflow-object="editableWorkflowObject"
		@update:node:position="onUpdateNodePosition"
		@update:node:active="onSetNodeActive"
		@update:node:selected="onSetNodeSelected"
		@delete:node="onDeleteNode"
		@create:connection="onCreateConnection"
		@delete:connection="onDeleteConnection"
		@mousedown="onMouseDown"
		@mouseup="onMouseUp"
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
				@add-nodes="onAddNodesAndConnections"
			/>
		</Suspense>
		<Suspense>
			<NodeDetailsView
				:read-only="isReadOnlyRoute || isReadOnlyEnvironment"
				:is-production-execution-preview="isProductionExecutionPreview"
				:renaming="false"
				@value-changed="onRenameNode"
				@switch-selected-node="onSwitchActiveNode"
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
