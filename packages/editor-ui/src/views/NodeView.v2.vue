<script setup lang="ts">
import {
	computed,
	defineAsyncComponent,
	nextTick,
	onActivated,
	onBeforeMount,
	onDeactivated,
	onMounted,
	ref,
	useCssModule,
	watch,
	h,
	onBeforeUnmount,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import CanvasRunWorkflowButton from '@/components/canvas/elements/buttons/CanvasRunWorkflowButton.vue';
import { useI18n } from '@/composables/useI18n';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useGlobalLinkActions } from '@/composables/useGlobalLinkActions';
import type {
	AddedNodesAndConnections,
	IExecutionResponse,
	INodeUi,
	IUpdateInformation,
	IWorkflowDataUpdate,
	IWorkflowDb,
	IWorkflowTemplate,
	NodeCreatorOpenSource,
	ToggleNodeCreatorOptions,
	XYPosition,
} from '@/Interface';
import type {
	Connection,
	ViewportTransform,
	XYPosition as VueFlowXYPosition,
} from '@vue-flow/core';
import type {
	CanvasConnectionCreateData,
	CanvasEventBusEvents,
	CanvasNode,
	CanvasNodeMoveEvent,
	ConnectStartEvent,
} from '@/types';
import { CanvasNodeRenderType, CanvasConnectionMode } from '@/types';
import {
	CHAT_TRIGGER_NODE_TYPE,
	DRAG_EVENT_DATA_KEY,
	EnterpriseEditionFeature,
	MAIN_HEADER_TABS,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
	MODAL_CONFIRM,
	NEW_WORKFLOW_ID,
	NODE_CREATOR_OPEN_SOURCES,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	START_NODE_TYPE,
	STICKY_NODE_TYPE,
	VALID_WORKFLOW_IMPORT_URL_REGEX,
	VIEWS,
} from '@/constants';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { TelemetryHelpers, NodeConnectionType, jsonParse } from 'n8n-workflow';
import type { IDataObject, ExecutionSummary, IConnection, IWorkflowBase } from 'n8n-workflow';
import { useToast } from '@/composables/useToast';
import { useSettingsStore } from '@/stores/settings.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useRootStore } from '@/stores/root.store';
import { historyBus } from '@/models/history';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useExecutionsStore } from '@/stores/executions.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { useMessage } from '@/composables/useMessage';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { useHistoryStore } from '@/stores/history.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useExecutionDebugging } from '@/composables/useExecutionDebugging';
import { useUsersStore } from '@/stores/users.store';
import { sourceControlEventBus } from '@/event-bus/source-control';
import { useTagsStore } from '@/stores/tags.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useNDVStore } from '@/stores/ndv.store';
import { getNodeViewTab } from '@/utils/canvasUtils';
import CanvasStopCurrentExecutionButton from '@/components/canvas/elements/buttons/CanvasStopCurrentExecutionButton.vue';
import CanvasStopWaitingForWebhookButton from '@/components/canvas/elements/buttons/CanvasStopWaitingForWebhookButton.vue';
import CanvasClearExecutionDataButton from '@/components/canvas/elements/buttons/CanvasClearExecutionDataButton.vue';
import { nodeViewEventBus } from '@/event-bus';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import { tryToParseNumber } from '@/utils/typesUtils';
import { useTemplatesStore } from '@/stores/templates.store';
import { createEventBus } from 'n8n-design-system';
import type { PinDataSource } from '@/composables/usePinnedData';
import { useClipboard } from '@/composables/useClipboard';
import { useBeforeUnload } from '@/composables/useBeforeUnload';
import { getResourcePermissions } from '@/permissions';
import NodeViewUnfinishedWorkflowMessage from '@/components/NodeViewUnfinishedWorkflowMessage.vue';
import { createCanvasConnectionHandleString } from '@/utils/canvasUtilsV2';
import { isValidNodeConnectionType } from '@/utils/typeGuards';

const LazyNodeCreation = defineAsyncComponent(
	async () => await import('@/components/Node/NodeCreation.vue'),
);

const LazyNodeDetailsView = defineAsyncComponent(
	async () => await import('@/components/NodeDetailsView.vue'),
);

const $style = useCssModule();
const router = useRouter();
const route = useRoute();
const i18n = useI18n();
const telemetry = useTelemetry();
const externalHooks = useExternalHooks();
const toast = useToast();
const message = useMessage();
const documentTitle = useDocumentTitle();
const workflowHelpers = useWorkflowHelpers({ router });
const nodeHelpers = useNodeHelpers();

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
const executionsStore = useExecutionsStore();
const canvasStore = useCanvasStore();
const npsSurveyStore = useNpsSurveyStore();
const historyStore = useHistoryStore();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();
const tagsStore = useTagsStore();
const pushConnectionStore = usePushConnectionStore();
const ndvStore = useNDVStore();
const templatesStore = useTemplatesStore();

const canvasEventBus = createEventBus<CanvasEventBusEvents>();

const { addBeforeUnloadEventBindings, removeBeforeUnloadEventBindings } = useBeforeUnload({
	route,
});
const { registerCustomAction, unregisterCustomAction } = useGlobalLinkActions();
const { runWorkflow, stopCurrentExecution, stopWaitingForWebhook } = useRunWorkflow({ router });
const {
	updateNodePosition,
	updateNodesPosition,
	revertUpdateNodePosition,
	renameNode,
	revertRenameNode,
	setNodeActive,
	setNodeSelected,
	toggleNodesDisabled,
	revertToggleNodeDisabled,
	toggleNodesPinned,
	setNodeParameters,
	deleteNode,
	deleteNodes,
	copyNodes,
	cutNodes,
	duplicateNodes,
	revertDeleteNode,
	addNodes,
	revertAddNode,
	createConnection,
	revertCreateConnection,
	deleteConnection,
	revertDeleteConnection,
	setNodeActiveByName,
	addConnections,
	importWorkflowData,
	fetchWorkflowDataFromUrl,
	resetWorkspace,
	initializeWorkspace,
	openExecution,
	editableWorkflow,
	editableWorkflowObject,
	lastClickPosition,
} = useCanvasOperations({ router });
const { applyExecutionData } = useExecutionDebugging();
useClipboard({ onPaste: onClipboardPaste });

const isLoading = ref(true);
const isBlankRedirect = ref(false);
const readOnlyNotification = ref<null | { visible: boolean }>(null);

const isProductionExecutionPreview = ref(false);
const isExecutionPreview = ref(false);

const canOpenNDV = ref(true);
const hideNodeIssues = ref(false);

const initializedWorkflowId = ref<string | undefined>();
const workflowId = computed(() => {
	const workflowIdParam = route.params.name as string;
	return [PLACEHOLDER_EMPTY_WORKFLOW_ID, NEW_WORKFLOW_ID].includes(workflowIdParam)
		? undefined
		: workflowIdParam;
});

const isNewWorkflowRoute = computed(() => route.name === VIEWS.NEW_WORKFLOW || !workflowId.value);
const isWorkflowRoute = computed(() => !!route?.meta?.nodeView || isDemoRoute.value);
const isDemoRoute = computed(() => route.name === VIEWS.DEMO);
const isReadOnlyRoute = computed(() => !!route?.meta?.readOnlyCanvas);
const isReadOnlyEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});

const isCanvasReadOnly = computed(() => {
	return (
		isDemoRoute.value ||
		isReadOnlyEnvironment.value ||
		!(workflowPermissions.value.update ?? projectPermissions.value.workflow.update)
	);
});

const fallbackNodes = computed<INodeUi[]>(() =>
	isLoading.value || isCanvasReadOnly.value
		? []
		: [
				{
					id: CanvasNodeRenderType.AddNodes,
					name: CanvasNodeRenderType.AddNodes,
					type: CanvasNodeRenderType.AddNodes,
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
);

const showFallbackNodes = computed(() => triggerNodes.value.length === 0);

const keyBindingsEnabled = computed(() => {
	return !ndvStore.activeNode && uiStore.activeModals.length === 0;
});

const isChatOpen = computed(() => workflowsStore.isChatPanelOpen);

/**
 * Initialization
 */

async function initializeData() {
	const loadPromises = (() => {
		if (settingsStore.isPreviewMode && isDemoRoute.value) return [];

		const promises: Array<Promise<unknown>> = [
			workflowsStore.fetchActiveWorkflows(),
			credentialsStore.fetchAllCredentials(),
			credentialsStore.fetchCredentialTypes(true),
		];

		if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Variables]) {
			promises.push(environmentsStore.fetchAllVariables());
		}

		if (settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.ExternalSecrets]) {
			promises.push(externalSecretsStore.fetchAllSecrets());
		}

		return promises;
	})();

	if (nodeTypesStore.allNodeTypes.length === 0) {
		loadPromises.push(nodeTypesStore.getNodeTypes());
	}

	try {
		await Promise.all(loadPromises);
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('nodeView.showError.mounted1.title'),
			i18n.baseText('nodeView.showError.mounted1.message') + ':',
		);
		return;
	}
}

async function initializeRoute(force = false) {
	// In case the workflow got saved we do not have to run init
	// as only the route changed but all the needed data is already loaded
	if (route.params.action === 'workflowSave') {
		uiStore.stateIsDirty = false;
		return;
	}

	const isAlreadyInitialized =
		!force &&
		initializedWorkflowId.value &&
		[NEW_WORKFLOW_ID, workflowId.value].includes(initializedWorkflowId.value);

	// This function is called on route change as well, so we need to do the following:
	// - if the redirect is blank, then do nothing
	// - if the route is the template import view, then open the template
	// - if the user is leaving the current view without saving the changes, then show a confirmation modal
	if (isBlankRedirect.value) {
		isBlankRedirect.value = false;
	} else if (route.name === VIEWS.TEMPLATE_IMPORT) {
		const templateId = route.params.id;
		await openWorkflowTemplate(templateId.toString());
	} else if (isWorkflowRoute.value) {
		if (!isAlreadyInitialized) {
			historyStore.reset();

			// If there is no workflow id, treat it as a new workflow
			if (isNewWorkflowRoute.value || !workflowId.value) {
				if (route.meta?.nodeView === true) {
					await initializeWorkspaceForNewWorkflow();
				}
				return;
			}

			await initializeWorkspaceForExistingWorkflow(workflowId.value);

			await loadCredentials();

			void nextTick(() => {
				nodeHelpers.updateNodesInputIssues();
				nodeHelpers.updateNodesCredentialsIssues();
				nodeHelpers.updateNodesParameterIssues();
			});
		}

		if (route.name === VIEWS.EXECUTION_DEBUG) {
			await initializeDebugMode();
		}
	}
}

async function initializeWorkspaceForNewWorkflow() {
	resetWorkspace();

	await workflowsStore.getNewWorkflowData(undefined, projectsStore.currentProjectId);
	workflowsStore.makeNewWorkflowShareable();

	uiStore.nodeViewInitialized = true;
	initializedWorkflowId.value = NEW_WORKFLOW_ID;
}

async function initializeWorkspaceForExistingWorkflow(id: string) {
	try {
		const workflowData = await workflowsStore.fetchWorkflow(id);

		openWorkflow(workflowData);

		if (workflowData.meta?.onboardingId) {
			trackOpenWorkflowFromOnboardingTemplate();
		}

		await projectsStore.setProjectNavActiveIdByWorkflowHomeProject(
			editableWorkflow.value.homeProject,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('openWorkflow.workflowNotFoundError'));

		void router.push({
			name: VIEWS.NEW_WORKFLOW,
		});
	} finally {
		uiStore.nodeViewInitialized = true;
		initializedWorkflowId.value = workflowId.value;
	}
}

/**
 * Workflow
 */

function openWorkflow(data: IWorkflowDb) {
	resetWorkspace();
	workflowHelpers.setDocumentTitle(data.name, 'IDLE');

	initializeWorkspace(data);

	void externalHooks.run('workflow.open', {
		workflowId: data.id,
		workflowName: data.name,
	});

	// @TODO Check why this is needed when working on executions
	// const selectedExecution = executionsStore.activeExecution;
	// if (selectedExecution?.workflowId !== data.id) {
	// 	executionsStore.activeExecution = null;
	// 	workflowsStore.currentWorkflowExecutions = [];
	// } else {
	// 	executionsStore.activeExecution = selectedExecution;
	// }

	fitView();
}

function trackOpenWorkflowFromOnboardingTemplate() {
	telemetry.track(
		`User opened workflow from onboarding template with ID ${editableWorkflow.value.meta?.onboardingId}`,
		{
			workflow_id: workflowId.value,
		},
		{
			withPostHog: true,
		},
	);
}

/**
 * Templates
 */

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

	isBlankRedirect.value = true;
	await router.replace({ name: VIEWS.NEW_WORKFLOW, query: { templateId } });

	const convertedNodes = data.workflow.nodes.map(workflowsStore.convertTemplateNodeToNodeUi);

	workflowsStore.setConnections(data.workflow.connections);
	await addNodes(convertedNodes);
	await workflowsStore.getNewWorkflowData(data.name, projectsStore.currentProjectId);
	workflowsStore.addToWorkflowMetadata({ templateId });

	uiStore.stateIsDirty = true;

	canvasStore.stopLoading();

	void externalHooks.run('template.open', {
		templateId,
		templateName: data.name,
		workflow: data.workflow,
	});

	fitView();
}

function trackOpenWorkflowTemplate(templateId: string) {
	telemetry.track(
		'User inserted workflow template',
		{
			source: 'workflow',
			template_id: tryToParseNumber(templateId),
			wf_template_repo_session_id: templatesStore.previousSessionId,
		},
		{
			withPostHog: true,
		},
	);
}

/**
 * Nodes
 */

const triggerNodes = computed(() => {
	return editableWorkflow.value.nodes.filter(
		(node) => node.type === START_NODE_TYPE || nodeTypesStore.isTriggerNode(node.type),
	);
});

const containsTriggerNodes = computed(() => triggerNodes.value.length > 0);

const allTriggerNodesDisabled = computed(() => {
	const disabledTriggerNodes = triggerNodes.value.filter((node) => node.disabled);
	return disabledTriggerNodes.length === triggerNodes.value.length;
});

function onUpdateNodesPosition(events: CanvasNodeMoveEvent[]) {
	updateNodesPosition(events, { trackHistory: true });
}

function onUpdateNodePosition(id: string, position: CanvasNode['position']) {
	updateNodePosition(id, position, { trackHistory: true });
}

function onRevertNodePosition({ nodeName, position }: { nodeName: string; position: XYPosition }) {
	revertUpdateNodePosition(nodeName, { x: position[0], y: position[1] });
}

function onDeleteNode(id: string) {
	deleteNode(id, { trackHistory: true });
}

function onDeleteNodes(ids: string[]) {
	deleteNodes(ids);
}

function onRevertDeleteNode({ node }: { node: INodeUi }) {
	revertDeleteNode(node);
}

function onToggleNodeDisabled(id: string) {
	if (!checkIfEditingIsAllowed()) {
		return;
	}

	toggleNodesDisabled([id]);
}

function onRevertToggleNodeDisabled({ nodeName }: { nodeName: string }) {
	revertToggleNodeDisabled(nodeName);
}

function onToggleNodesDisabled(ids: string[]) {
	if (!checkIfEditingIsAllowed()) {
		return;
	}

	toggleNodesDisabled(ids);
}

function onSetNodeActive(id: string) {
	setNodeActive(id);
}

function onSetNodeSelected(id?: string) {
	setNodeSelected(id);
}

async function onCopyNodes(ids: string[]) {
	await copyNodes(ids);

	toast.showMessage({ title: i18n.baseText('generic.copiedToClipboard'), type: 'success' });
}

async function onClipboardPaste(plainTextData: string): Promise<void> {
	if (
		getNodeViewTab(route) !== MAIN_HEADER_TABS.WORKFLOW ||
		!keyBindingsEnabled.value ||
		!checkIfEditingIsAllowed()
	) {
		return;
	}

	let workflowData: IWorkflowDataUpdate | null | undefined = null;

	// Check if it is an URL which could contain workflow data
	if (plainTextData.match(VALID_WORKFLOW_IMPORT_URL_REGEX)) {
		const importConfirm = await message.confirm(
			i18n.baseText('nodeView.confirmMessage.onClipboardPasteEvent.message', {
				interpolate: { plainTextData },
			}),
			i18n.baseText('nodeView.confirmMessage.onClipboardPasteEvent.headline'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText(
					'nodeView.confirmMessage.onClipboardPasteEvent.confirmButtonText',
				),
				cancelButtonText: i18n.baseText(
					'nodeView.confirmMessage.onClipboardPasteEvent.cancelButtonText',
				),
			},
		);

		if (importConfirm !== MODAL_CONFIRM) {
			return;
		}

		workflowData = await fetchWorkflowDataFromUrl(plainTextData);
	} else {
		// Pasted data is possible workflow data
		workflowData = jsonParse<IWorkflowDataUpdate | null>(plainTextData, { fallbackValue: null });
	}

	if (!workflowData) {
		return;
	}

	const result = await importWorkflowData(workflowData, 'paste', false);
	selectNodes(result.nodes?.map((node) => node.id) ?? []);
}

async function onCutNodes(ids: string[]) {
	if (isCanvasReadOnly.value) {
		await copyNodes(ids);
	} else {
		await cutNodes(ids);
	}
}

async function onDuplicateNodes(ids: string[]) {
	if (!checkIfEditingIsAllowed()) {
		return;
	}

	const newIds = await duplicateNodes(ids);

	selectNodes(newIds);
}

function onPinNodes(ids: string[], source: PinDataSource) {
	if (!checkIfEditingIsAllowed()) {
		return;
	}

	toggleNodesPinned(ids, source);
}

async function onSaveWorkflow() {
	const saved = await workflowHelpers.saveCurrentWorkflow();
	if (saved) {
		canvasEventBus.emit('saved:workflow');
	}
}

function addWorkflowSavedEventBindings() {
	canvasEventBus.on('saved:workflow', npsSurveyStore.fetchPromptsData);
	canvasEventBus.on('saved:workflow', onSaveFromWithinNDV);
}

function removeWorkflowSavedEventBindings() {
	canvasEventBus.off('saved:workflow', npsSurveyStore.fetchPromptsData);
	canvasEventBus.off('saved:workflow', onSaveFromWithinNDV);
	canvasEventBus.off('saved:workflow', onSaveFromWithinExecutionDebug);
}

async function onSaveFromWithinNDV() {
	if (ndvStore.activeNodeName) {
		toast.showMessage({
			title: i18n.baseText('generic.workflowSaved'),
			type: 'success',
		});
	}
}

async function onCreateWorkflow() {
	await router.push({ name: VIEWS.NEW_WORKFLOW });
}

function onRenameNode(parameterData: IUpdateInformation) {
	if (parameterData.name === 'name' && parameterData.oldValue) {
		void renameNode(parameterData.oldValue as string, parameterData.value as string);
	}
}

async function onOpenRenameNodeModal(id: string) {
	const currentName = workflowsStore.getNodeById(id)?.name ?? '';
	try {
		const promptResponsePromise = message.prompt(
			i18n.baseText('nodeView.prompt.newName') + ':',
			i18n.baseText('nodeView.prompt.renameNode') + `: ${currentName}`,
			{
				customClass: 'rename-prompt',
				confirmButtonText: i18n.baseText('nodeView.prompt.rename'),
				cancelButtonText: i18n.baseText('nodeView.prompt.cancel'),
				inputErrorMessage: i18n.baseText('nodeView.prompt.invalidName'),
				inputValue: currentName,
				inputValidator: (value: string) => {
					if (!value.trim()) {
						return i18n.baseText('nodeView.prompt.invalidName');
					}
					return true;
				},
			},
		);

		// Wait till input is displayed
		await nextTick();

		// Focus and select input content
		const nameInput = document.querySelector<HTMLInputElement>('.rename-prompt .el-input__inner');
		nameInput?.focus();
		nameInput?.select();

		const promptResponse = await promptResponsePromise;

		if (promptResponse.action === MODAL_CONFIRM) {
			await renameNode(currentName, promptResponse.value, { trackHistory: true });
		}
	} catch (e) {}
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

function onUpdateNodeParameters(id: string, parameters: Record<string, unknown>) {
	setNodeParameters(id, parameters);
}

function onClickNodeAdd(source: string, sourceHandle: string) {
	nodeCreatorStore.openNodeCreatorForConnectingNode({
		connection: {
			source,
			sourceHandle,
		},
		eventSource: NODE_CREATOR_OPEN_SOURCES.PLUS_ENDPOINT,
	});
}

/**
 * Credentials
 */

async function loadCredentials() {
	let options: { workflowId: string } | { projectId: string };

	if (editableWorkflow.value) {
		options = { workflowId: editableWorkflow.value.id };
	} else {
		const queryParam =
			typeof route.query?.projectId === 'string' ? route.query?.projectId : undefined;
		const projectId = queryParam ?? projectsStore.personalProject?.id;
		if (projectId === undefined) {
			throw new Error(
				'Could not find projectId in the query nor could I find the personal project in the project store',
			);
		}

		options = { projectId };
	}

	await credentialsStore.fetchAllCredentialsForWorkflow(options);
}

/**
 * Connections
 */

function onCreateConnection(connection: Connection) {
	createConnection(connection, { trackHistory: true });
}

function onRevertCreateConnection({ connection }: { connection: [IConnection, IConnection] }) {
	revertCreateConnection(connection);
}

function onCreateConnectionCancelled(
	event: ConnectStartEvent,
	position: VueFlowXYPosition,
	mouseEvent?: MouseEvent,
) {
	const preventDefault = (mouseEvent?.target as HTMLElement).classList?.contains('clickable');
	if (preventDefault) {
		return;
	}

	uiStore.lastInteractedWithNodeId = event.nodeId;
	uiStore.lastInteractedWithNodeHandle = event.handleId;
	uiStore.lastCancelledConnectionPosition = [position.x, position.y];

	setTimeout(() => {
		if (!event.nodeId) return;

		nodeCreatorStore.openNodeCreatorForConnectingNode({
			connection: {
				source: event.nodeId,
				sourceHandle: event.handleId,
			},
			eventSource: NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_DROP,
		});
	});
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

async function importWorkflowExact({ workflow: workflowData }: { workflow: IWorkflowDataUpdate }) {
	if (!workflowData.nodes || !workflowData.connections) {
		throw new Error('Invalid workflow object');
	}

	resetWorkspace();

	await initializeData();

	initializeWorkspace({
		...workflowData,
		nodes: NodeViewUtils.getFixedNodesList<INodeUi>(workflowData.nodes),
	} as IWorkflowDb);

	fitView();
}

async function onImportWorkflowDataEvent(data: IDataObject) {
	const workflowData = data.data as IWorkflowDataUpdate;
	await importWorkflowData(workflowData, 'file');

	fitView();
	selectNodes(workflowData.nodes?.map((node) => node.id) ?? []);
}

async function onImportWorkflowUrlEvent(data: IDataObject) {
	const workflowData = await fetchWorkflowDataFromUrl(data.url as string);
	if (!workflowData) {
		return;
	}

	await importWorkflowData(workflowData, 'url');

	fitView();
	selectNodes(workflowData.nodes?.map((node) => node.id) ?? []);
}

function addImportEventBindings() {
	nodeViewEventBus.on('importWorkflowData', onImportWorkflowDataEvent);
	nodeViewEventBus.on('importWorkflowUrl', onImportWorkflowUrlEvent);
}

function removeImportEventBindings() {
	nodeViewEventBus.off('importWorkflowData', onImportWorkflowDataEvent);
	nodeViewEventBus.off('importWorkflowUrl', onImportWorkflowUrlEvent);
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

	const addedNodes = await addNodes(nodes, {
		dragAndDrop,
		position,
		trackHistory: true,
		telemetry: true,
	});

	const offsetIndex = editableWorkflow.value.nodes.length - nodes.length;
	const mappedConnections: CanvasConnectionCreateData[] = connections.map(({ from, to }) => {
		const fromNode = editableWorkflow.value.nodes[offsetIndex + from.nodeIndex];
		const toNode = editableWorkflow.value.nodes[offsetIndex + to.nodeIndex];
		const type = from.type ?? to.type ?? NodeConnectionType.Main;

		return {
			source: fromNode.id,
			sourceHandle: createCanvasConnectionHandleString({
				mode: CanvasConnectionMode.Output,
				type: isValidNodeConnectionType(type) ? type : NodeConnectionType.Main,
				index: from.outputIndex ?? 0,
			}),
			target: toNode.id,
			targetHandle: createCanvasConnectionHandleString({
				mode: CanvasConnectionMode.Input,
				type: isValidNodeConnectionType(type) ? type : NodeConnectionType.Main,
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

	await addConnections(mappedConnections);

	uiStore.resetLastInteractedWith();

	if (addedNodes.length > 0) {
		selectNodes([addedNodes[addedNodes.length - 1].id]);
	}
}

async function onRevertAddNode({ node }: { node: INodeUi }) {
	await revertAddNode(node.name);
}

async function onSwitchActiveNode(nodeName: string) {
	setNodeActiveByName(nodeName);
}

async function onOpenSelectiveNodeCreator(node: string, connectionType: NodeConnectionType) {
	nodeCreatorStore.openSelectiveNodeCreator({ node, connectionType });
}

async function onOpenNodeCreatorForTriggerNodes(source: NodeCreatorOpenSource) {
	nodeCreatorStore.openNodeCreatorForTriggerNodes(source);
}

function onOpenNodeCreatorFromCanvas(source: NodeCreatorOpenSource) {
	onToggleNodeCreator({ createNodeActive: true, source });
}

function onToggleNodeCreator(options: ToggleNodeCreatorOptions) {
	nodeCreatorStore.setNodeCreatorState(options);

	if (!options.createNodeActive && !options.hasAddedNodes) {
		uiStore.resetLastInteractedWith();
	}
}

function onCreateSticky() {
	void onAddNodesAndConnections({ nodes: [{ type: STICKY_NODE_TYPE }], connections: [] });
}

function onClickConnectionAdd(connection: Connection) {
	nodeCreatorStore.openNodeCreatorForConnectingNode({
		connection,
		eventSource: NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
	});
}

/**
 * Permissions
 */

const workflowPermissions = computed(() => {
	return workflowId.value
		? getResourcePermissions(workflowsStore.getWorkflowById(workflowId.value)?.scopes).workflow
		: {};
});

const projectPermissions = computed(() => {
	const project = route.query?.projectId
		? projectsStore.myProjects.find((p) => p.id === route.query.projectId)
		: (projectsStore.currentProject ?? projectsStore.personalProject);
	return getResourcePermissions(project?.scopes);
});

/**
 * Executions
 */

const isStoppingExecution = ref(false);

const isWorkflowRunning = computed(() => workflowsStore.isWorkflowRunning);
const isExecutionWaitingForWebhook = computed(() => workflowsStore.executionWaitingForWebhook);

const isExecutionDisabled = computed(() => {
	if (
		containsChatTriggerNodes.value &&
		isOnlyChatTriggerNodeActive.value &&
		!chatTriggerNodePinnedData.value
	) {
		return true;
	}

	return !containsTriggerNodes.value || allTriggerNodesDisabled.value;
});

const isRunWorkflowButtonVisible = computed(() => !isOnlyChatTriggerNodeActive.value);
const isStopExecutionButtonVisible = computed(
	() => isWorkflowRunning.value && !isExecutionWaitingForWebhook.value,
);
const isStopWaitingForWebhookButtonVisible = computed(
	() => isWorkflowRunning.value && isExecutionWaitingForWebhook.value,
);
const isClearExecutionButtonVisible = computed(
	() =>
		!isReadOnlyRoute.value &&
		!isReadOnlyEnvironment.value &&
		!isWorkflowRunning.value &&
		!allTriggerNodesDisabled.value &&
		workflowExecutionData.value,
);

const workflowExecutionData = computed(() => workflowsStore.workflowExecutionData);

async function onRunWorkflow() {
	trackRunWorkflow();

	void runWorkflow({});
}

function trackRunWorkflow() {
	void workflowHelpers.getWorkflowDataToSave().then((workflowData) => {
		const telemetryPayload = {
			workflow_id: workflowId.value,
			node_graph_string: JSON.stringify(
				TelemetryHelpers.generateNodesGraph(
					workflowData as IWorkflowBase,
					workflowHelpers.getNodeTypes(),
					{ isCloudDeployment: settingsStore.isCloudDeployment },
				).nodeGraph,
			),
		};
		telemetry.track('User clicked execute workflow button', telemetryPayload);
		void externalHooks.run('nodeView.onRunWorkflow', telemetryPayload);
	});
}

async function onRunWorkflowToNode(id: string) {
	const node = workflowsStore.getNodeById(id);
	if (!node) return;

	trackRunWorkflowToNode(node);

	void runWorkflow({ destinationNode: node.name, source: 'Node.executeNode' });
}

function trackRunWorkflowToNode(node: INodeUi) {
	const telemetryPayload = {
		node_type: node.type,
		workflow_id: workflowsStore.workflowId,
		source: 'canvas',
		push_ref: ndvStore.pushRef,
	};

	telemetry.track('User clicked execute node button', telemetryPayload);
	void externalHooks.run('nodeView.onRunNode', telemetryPayload);
}

async function onOpenExecution(executionId: string) {
	canvasStore.startLoading();

	resetWorkspace();
	await initializeData();

	const data = await openExecution(executionId);
	if (!data) {
		return;
	}

	canvasStore.stopLoading();
	fitView();

	canvasEventBus.emit('open:execution', data);

	void externalHooks.run('execution.open', {
		workflowId: data.workflowData.id,
		workflowName: data.workflowData.name,
		executionId,
	});

	telemetry.track('User opened read-only execution', {
		workflow_id: data.workflowData.id,
		execution_mode: data.mode,
		execution_finished: data.finished,
	});
}

function onExecutionOpenedWithError(data: IExecutionResponse) {
	if (!data.finished && data.data?.resultData?.error) {
		// Check if any node contains an error
		let nodeErrorFound = false;
		if (data.data.resultData.runData) {
			const runData = data.data.resultData.runData;
			errorCheck: for (const nodeName of Object.keys(runData)) {
				for (const taskData of runData[nodeName]) {
					if (taskData.error) {
						nodeErrorFound = true;
						break errorCheck;
					}
				}
			}
		}

		if (
			!nodeErrorFound &&
			(data.data.resultData.error.stack ?? data.data.resultData.error.message)
		) {
			// Display some more information for now in console to make debugging easier
			console.error(`Execution ${data.id} error:`);
			console.error(data.data.resultData.error.stack);
			toast.showMessage({
				title: i18n.baseText('nodeView.showError.workflowError'),
				message: data.data.resultData.error.message,
				type: 'error',
				duration: 0,
			});
		}
	}
}

function onExecutionOpenedWithWaitTill(data: IExecutionResponse) {
	if ((data as ExecutionSummary).waitTill) {
		toast.showMessage({
			title: i18n.baseText('nodeView.thisExecutionHasntFinishedYet'),
			message: h(NodeViewUnfinishedWorkflowMessage),
			type: 'warning',
			duration: 0,
		});
	}
}

function addExecutionOpenedEventBindings() {
	canvasEventBus.on('open:execution', onExecutionOpenedWithError);
	canvasEventBus.on('open:execution', onExecutionOpenedWithWaitTill);
}

function removeExecutionOpenedEventBindings() {
	canvasEventBus.off('open:execution', onExecutionOpenedWithError);
	canvasEventBus.off('open:execution', onExecutionOpenedWithWaitTill);
}

async function onStopExecution() {
	isStoppingExecution.value = true;
	await stopCurrentExecution();
	isStoppingExecution.value = false;
}

async function onStopWaitingForWebhook() {
	await stopWaitingForWebhook();
}

async function onClearExecutionData() {
	workflowsStore.workflowExecutionData = null;
	nodeHelpers.updateNodesExecutionIssues();
}

function onRunWorkflowButtonMouseEnter() {
	nodeViewEventBus.emit('runWorkflowButton:mouseenter');
}

function onRunWorkflowButtonMouseLeave() {
	nodeViewEventBus.emit('runWorkflowButton:mouseleave');
}

/**
 * Chat
 */

const chatTriggerNode = computed(() => {
	return editableWorkflow.value.nodes.find((node) => node.type === CHAT_TRIGGER_NODE_TYPE);
});

const containsChatTriggerNodes = computed(() => {
	return (
		!isExecutionWaitingForWebhook.value &&
		!!editableWorkflow.value.nodes.find(
			(node) =>
				[MANUAL_CHAT_TRIGGER_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE].includes(node.type) &&
				node.disabled !== true,
		)
	);
});

const isOnlyChatTriggerNodeActive = computed(() => {
	return triggerNodes.value.every((node) => node.disabled || node.type === CHAT_TRIGGER_NODE_TYPE);
});

const chatTriggerNodePinnedData = computed(() => {
	if (!chatTriggerNode.value) return null;

	return workflowsStore.pinDataByNodeName(chatTriggerNode.value.name);
});

async function onOpenChat() {
	workflowsStore.setPanelOpen('chat', !workflowsStore.isChatPanelOpen);

	const payload = {
		workflow_id: workflowId.value,
	};

	void externalHooks.run('nodeView.onOpenChat', payload);
	telemetry.track('User clicked chat open button', payload);
}

/**
 * History events
 */

function addUndoRedoEventBindings() {
	historyBus.on('nodeMove', onRevertNodePosition);
	historyBus.on('revertAddNode', onRevertAddNode);
	historyBus.on('revertRemoveNode', onRevertDeleteNode);
	historyBus.on('revertAddConnection', onRevertCreateConnection);
	historyBus.on('revertRemoveConnection', onRevertDeleteConnection);
	historyBus.on('revertRenameNode', onRevertRenameNode);
	historyBus.on('enableNodeToggle', onRevertToggleNodeDisabled);
}

function removeUndoRedoEventBindings() {
	historyBus.off('nodeMove', onRevertNodePosition);
	historyBus.off('revertAddNode', onRevertAddNode);
	historyBus.off('revertRemoveNode', onRevertDeleteNode);
	historyBus.off('revertAddConnection', onRevertCreateConnection);
	historyBus.off('revertRemoveConnection', onRevertDeleteConnection);
	historyBus.off('revertRenameNode', onRevertRenameNode);
	historyBus.off('enableNodeToggle', onRevertToggleNodeDisabled);
}

/**
 * Source control
 */

async function onSourceControlPull() {
	try {
		await Promise.all([
			environmentsStore.fetchAllVariables(),
			tagsStore.fetchAll(),
			loadCredentials(),
		]);

		if (workflowId.value && !uiStore.stateIsDirty) {
			const workflowData = await workflowsStore.fetchWorkflow(workflowId.value);
			if (workflowData) {
				workflowHelpers.setDocumentTitle(workflowData.name, 'IDLE');
				openWorkflow(workflowData);
			}
		}
	} catch (error) {
		console.error(error);
	}
}

function addSourceControlEventBindings() {
	sourceControlEventBus.on('pull', onSourceControlPull);
}

function removeSourceControlEventBindings() {
	sourceControlEventBus.off('pull', onSourceControlPull);
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

function emitPostMessageReady() {
	if (window.parent) {
		window.parent.postMessage(
			JSON.stringify({ command: 'n8nReady', version: rootStore.versionCli }),
			'*',
		);
	}
}

async function onPostMessageReceived(messageEvent: MessageEvent) {
	if (
		!messageEvent ||
		typeof messageEvent.data !== 'string' ||
		!messageEvent.data?.includes?.('"command"')
	) {
		return;
	}
	try {
		const json = JSON.parse(messageEvent.data);
		if (json && json.command === 'openWorkflow') {
			try {
				await importWorkflowExact(json);
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

				await onOpenExecution(json.executionId);
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
	if (!initializedWorkflowId.value) {
		return true;
	}

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
		}) as unknown as { visible: boolean };

		return false;
	}

	return true;
}

function checkIfRouteIsAllowed() {
	if (
		isReadOnlyEnvironment.value &&
		[VIEWS.NEW_WORKFLOW, VIEWS.TEMPLATE_IMPORT].find((view) => view === route.name)
	) {
		void nextTick(async () => {
			resetWorkspace();
			uiStore.stateIsDirty = false;

			await router.replace({ name: VIEWS.HOMEPAGE });
		});
	}
}

/**
 * Debug mode
 */

async function initializeDebugMode() {
	workflowHelpers.setDocumentTitle(workflowsStore.workflowName, 'DEBUG');

	if (!workflowsStore.isInDebugMode) {
		await applyExecutionData(route.params.executionId as string);
		workflowsStore.isInDebugMode = true;
	}

	canvasEventBus.on('saved:workflow', onSaveFromWithinExecutionDebug);
}

async function onSaveFromWithinExecutionDebug() {
	if (route.name !== VIEWS.EXECUTION_DEBUG) return;

	await router.replace({
		name: VIEWS.WORKFLOW,
		params: { name: workflowId.value },
	});
}

/**
 * Canvas
 */

const viewportTransform = ref<ViewportTransform>({ x: 0, y: 0, zoom: 1 });

function onViewportChange(event: ViewportTransform) {
	viewportTransform.value = event;
	uiStore.nodeViewOffsetPosition = [event.x, event.y];
}

function fitView() {
	setTimeout(() => canvasEventBus.emit('fitView'));
}

function selectNodes(ids: string[]) {
	setTimeout(() => canvasEventBus.emit('nodes:select', { ids }));
}

/**
 * Mouse events
 */

function onClickPane(position: CanvasNode['position']) {
	lastClickPosition.value = [position.x, position.y];
	nodeCreatorStore.isCreateNodeActive = false;
	setNodeSelected();
}

/**
 * Drag and Drop events
 */

async function onDragAndDrop(position: VueFlowXYPosition, event: DragEvent) {
	if (!event.dataTransfer) {
		return;
	}

	const dropData = jsonParse<AddedNodesAndConnections>(
		event.dataTransfer.getData(DRAG_EVENT_DATA_KEY),
	);

	if (dropData) {
		const insertNodePosition: XYPosition = [position.x, position.y];

		await onAddNodesAndConnections(dropData, true, insertNodePosition);

		onToggleNodeCreator({ createNodeActive: false, hasAddedNodes: true });
	}
}

/**
 * Custom Actions
 */

function registerCustomActions() {
	registerCustomAction({
		key: 'openNodeDetail',
		action: ({ node }: { node: string }) => {
			setNodeActiveByName(node);
		},
	});

	registerCustomAction({
		key: 'openSelectiveNodeCreator',
		action: ({
			connectiontype: connectionType,
			node,
		}: {
			connectiontype: NodeConnectionType;
			node: string;
		}) => {
			void onOpenSelectiveNodeCreator(node, connectionType);
		},
	});

	registerCustomAction({
		key: 'showNodeCreator',
		action: () => {
			ndvStore.activeNodeName = null;

			void nextTick(() => {
				void onOpenNodeCreatorForTriggerNodes(NODE_CREATOR_OPEN_SOURCES.TAB);
			});
		},
	});
}

function unregisterCustomActions() {
	unregisterCustomAction('openNodeDetail');
	unregisterCustomAction('openSelectiveNodeCreator');
	unregisterCustomAction('showNodeCreator');
}

function showAddFirstStepIfEnabled() {
	if (uiStore.addFirstStepOnLoad) {
		void onOpenNodeCreatorForTriggerNodes(NODE_CREATOR_OPEN_SOURCES.TRIGGER_PLACEHOLDER_BUTTON);
		uiStore.addFirstStepOnLoad = false;
	}
}

/**
 * Routing
 */

watch(
	() => route.name,
	async (newRouteName, oldRouteName) => {
		// it's navigating from and existing workflow to a new workflow
		const force = newRouteName === VIEWS.NEW_WORKFLOW && oldRouteName === VIEWS.WORKFLOW;
		await initializeRoute(force);
	},
);

/**
 * Lifecycle
 */

onBeforeMount(() => {
	if (!isDemoRoute.value) {
		pushConnectionStore.pushConnect();
	}

	addPostMessageEventBindings();
});

onMounted(() => {
	canvasStore.startLoading();

	documentTitle.reset();
	resetWorkspace();

	void initializeData().then(() => {
		void initializeRoute()
			.then(() => {
				// Once view is initialized, pick up all toast notifications
				// waiting in the store and display them
				toast.showNotificationForViews([VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW]);
			})
			.finally(() => {
				isLoading.value = false;
				canvasStore.stopLoading();

				void externalHooks.run('nodeView.mount').catch(() => {});

				emitPostMessageReady();
			});

		void usersStore.showPersonalizationSurvey();

		checkIfRouteIsAllowed();
	});

	addSourceControlEventBindings();
	addWorkflowSavedEventBindings();
	addBeforeUnloadEventBindings();
	addImportEventBindings();
	addExecutionOpenedEventBindings();
	registerCustomActions();
});

onActivated(async () => {
	addUndoRedoEventBindings();
	showAddFirstStepIfEnabled();
});

onDeactivated(() => {
	removeUndoRedoEventBindings();
});

onBeforeUnmount(() => {
	removeSourceControlEventBindings();
	removePostMessageEventBindings();
	removeWorkflowSavedEventBindings();
	removeBeforeUnloadEventBindings();
	removeImportEventBindings();
	removeExecutionOpenedEventBindings();
	unregisterCustomActions();
	if (!isDemoRoute.value) {
		pushConnectionStore.pushDisconnect();
	}
});
</script>

<template>
	<WorkflowCanvas
		v-if="editableWorkflow && editableWorkflowObject && !isLoading"
		:id="editableWorkflow.id"
		:workflow="editableWorkflow"
		:workflow-object="editableWorkflowObject"
		:fallback-nodes="fallbackNodes"
		:show-fallback-nodes="showFallbackNodes"
		:event-bus="canvasEventBus"
		:read-only="isCanvasReadOnly"
		:executing="isWorkflowRunning"
		:show-bug-reporting-button="!isDemoRoute || !!executionsStore.activeExecution"
		:key-bindings="keyBindingsEnabled"
		@update:nodes:position="onUpdateNodesPosition"
		@update:node:position="onUpdateNodePosition"
		@update:node:active="onSetNodeActive"
		@update:node:selected="onSetNodeSelected"
		@update:node:enabled="onToggleNodeDisabled"
		@update:node:name="onOpenRenameNodeModal"
		@update:node:parameters="onUpdateNodeParameters"
		@click:node:add="onClickNodeAdd"
		@run:node="onRunWorkflowToNode"
		@delete:node="onDeleteNode"
		@create:connection="onCreateConnection"
		@create:connection:cancelled="onCreateConnectionCancelled"
		@delete:connection="onDeleteConnection"
		@click:connection:add="onClickConnectionAdd"
		@click:pane="onClickPane"
		@create:node="onOpenNodeCreatorFromCanvas"
		@create:sticky="onCreateSticky"
		@delete:nodes="onDeleteNodes"
		@update:nodes:enabled="onToggleNodesDisabled"
		@update:nodes:pin="onPinNodes"
		@duplicate:nodes="onDuplicateNodes"
		@copy:nodes="onCopyNodes"
		@cut:nodes="onCutNodes"
		@run:workflow="onRunWorkflow"
		@save:workflow="onSaveWorkflow"
		@create:workflow="onCreateWorkflow"
		@viewport-change="onViewportChange"
		@drag-and-drop="onDragAndDrop"
	>
		<div v-if="!isCanvasReadOnly" :class="$style.executionButtons">
			<CanvasRunWorkflowButton
				v-if="isRunWorkflowButtonVisible"
				:waiting-for-webhook="isExecutionWaitingForWebhook"
				:disabled="isExecutionDisabled"
				:executing="isWorkflowRunning"
				@mouseenter="onRunWorkflowButtonMouseEnter"
				@mouseleave="onRunWorkflowButtonMouseLeave"
				@click="onRunWorkflow"
			/>
			<CanvasChatButton
				v-if="containsChatTriggerNodes"
				:type="isChatOpen ? 'tertiary' : 'primary'"
				:label="isChatOpen ? i18n.baseText('chat.hide') : i18n.baseText('chat.window.title')"
				@click="onOpenChat"
			/>
			<CanvasStopCurrentExecutionButton
				v-if="isStopExecutionButtonVisible"
				:stopping="isStoppingExecution"
				@click="onStopExecution"
			/>
			<CanvasStopWaitingForWebhookButton
				v-if="isStopWaitingForWebhookButtonVisible"
				@click="onStopWaitingForWebhook"
			/>
			<CanvasClearExecutionDataButton
				v-if="isClearExecutionButtonVisible"
				@click="onClearExecutionData"
			/>
		</div>
		<Suspense>
			<LazyNodeCreation
				v-if="!isCanvasReadOnly"
				:create-node-active="nodeCreatorStore.isCreateNodeActive"
				:node-view-scale="viewportTransform.zoom"
				@toggle-node-creator="onToggleNodeCreator"
				@add-nodes="onAddNodesAndConnections"
			/>
		</Suspense>
		<Suspense>
			<LazyNodeDetailsView
				:workflow-object="editableWorkflowObject"
				:read-only="isCanvasReadOnly"
				:is-production-execution-preview="isProductionExecutionPreview"
				:renaming="false"
				@value-changed="onRenameNode"
				@stop-execution="onStopExecution"
				@switch-selected-node="onSwitchActiveNode"
				@open-connection-node-creator="onOpenSelectiveNodeCreator"
				@save-keyboard-shortcut="onSaveWorkflow"
			/>
			<!--
				:renaming="renamingActive"
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
