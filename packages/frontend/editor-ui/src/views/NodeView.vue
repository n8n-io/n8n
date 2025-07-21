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
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas.vue';
import FocusPanel from '@/components/FocusPanel.vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import CanvasRunWorkflowButton from '@/components/canvas/elements/buttons/CanvasRunWorkflowButton.vue';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useGlobalLinkActions } from '@/composables/useGlobalLinkActions';
import type {
	AddedNodesAndConnections,
	IExecutionResponse,
	INodeUi,
	IWorkflowDb,
	NodeCreatorOpenSource,
	NodeFilterType,
	ToggleNodeCreatorOptions,
	WorkflowDataWithTemplateId,
	XYPosition,
} from '@/Interface';
import type { IWorkflowTemplate } from '@n8n/rest-api-client/api/templates';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import type {
	Connection,
	Dimensions,
	ViewportTransform,
	XYPosition as VueFlowXYPosition,
} from '@vue-flow/core';
import type {
	CanvasConnectionCreateData,
	CanvasNode,
	CanvasNodeMoveEvent,
	ConnectStartEvent,
	ViewportBoundaries,
} from '@/types';
import { CanvasNodeRenderType, CanvasConnectionMode } from '@/types';
import {
	CHAT_TRIGGER_NODE_TYPE,
	DRAG_EVENT_DATA_KEY,
	EnterpriseEditionFeature,
	FOCUS_PANEL_EXPERIMENT,
	FROM_AI_PARAMETERS_MODAL_KEY,
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
	NDV_UI_OVERHAUL_EXPERIMENT,
	WORKFLOW_SETTINGS_MODAL_KEY,
} from '@/constants';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import {
	NodeConnectionTypes,
	jsonParse,
	EVALUATION_TRIGGER_NODE_TYPE,
	EVALUATION_NODE_TYPE,
} from 'n8n-workflow';
import type {
	NodeConnectionType,
	IDataObject,
	ExecutionSummary,
	IConnection,
	INodeParameters,
} from 'n8n-workflow';
import { useToast } from '@/composables/useToast';
import { useSettingsStore } from '@/stores/settings.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import useEnvironmentsStore from '@/stores/environments.ee.store';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useRootStore } from '@n8n/stores/useRootStore';
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
import { getBounds, getNodesWithNormalizedPosition, getNodeViewTab } from '@/utils/nodeViewUtils';
import CanvasStopCurrentExecutionButton from '@/components/canvas/elements/buttons/CanvasStopCurrentExecutionButton.vue';
import CanvasStopWaitingForWebhookButton from '@/components/canvas/elements/buttons/CanvasStopWaitingForWebhookButton.vue';
import { nodeViewEventBus } from '@/event-bus';
import { tryToParseNumber } from '@/utils/typesUtils';
import { useTemplatesStore } from '@/stores/templates.store';
import { N8nCallout } from '@n8n/design-system';
import type { PinDataSource } from '@/composables/usePinnedData';
import { useClipboard } from '@/composables/useClipboard';
import { useBeforeUnload } from '@/composables/useBeforeUnload';
import { getResourcePermissions } from '@n8n/permissions';
import NodeViewUnfinishedWorkflowMessage from '@/components/NodeViewUnfinishedWorkflowMessage.vue';
import { createCanvasConnectionHandleString } from '@/utils/canvasUtils';
import { isValidNodeConnectionType } from '@/utils/typeGuards';
import { getEasyAiWorkflowJson, getRagStarterWorkflowJson } from '@/utils/easyAiWorkflowUtils';
import type { CanvasLayoutEvent } from '@/composables/useCanvasLayout';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';
import { useBuilderStore } from '@/stores/builder.store';
import { useFoldersStore } from '@/stores/folders.store';
import { usePostHog } from '@/stores/posthog.store';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useWorkflowExtraction } from '@/composables/useWorkflowExtraction';
import { useAgentRequestStore } from '@n8n/stores/useAgentRequestStore';
import { needsAgentInput } from '@/utils/nodes/nodeTransforms';
import { useLogsStore } from '@/stores/logs.store';
import { canvasEventBus } from '@/event-bus/canvas';
import CanvasChatButton from '@/components/canvas/elements/buttons/CanvasChatButton.vue';
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { useAITemplatesStarterCollectionStore } from '@/experiments/aiTemplatesStarterCollection/stores/aiTemplatesStarterCollection.store';

defineOptions({
	name: 'NodeView',
});

const LazyNodeCreation = defineAsyncComponent(
	async () => await import('@/components/Node/NodeCreation.vue'),
);

const LazyNodeDetailsView = defineAsyncComponent(
	async () => await import('@/components/NodeDetailsView.vue'),
);
const LazyNodeDetailsViewV2 = defineAsyncComponent(
	async () => await import('@/components/NodeDetailsViewV2.vue'),
);

const LazySetupWorkflowCredentialsButton = defineAsyncComponent(
	async () =>
		await import('@/components/SetupWorkflowCredentialsButton/SetupWorkflowCredentialsButton.vue'),
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
const workflowHelpers = useWorkflowHelpers();
const workflowSaving = useWorkflowSaving({ router });
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
const focusPanelStore = useFocusPanelStore();
const templatesStore = useTemplatesStore();
const builderStore = useBuilderStore();
const foldersStore = useFoldersStore();
const posthogStore = usePostHog();
const agentRequestStore = useAgentRequestStore();
const logsStore = useLogsStore();
const aiTemplatesStarterCollectionStore = useAITemplatesStarterCollectionStore();

const { addBeforeUnloadEventBindings, removeBeforeUnloadEventBindings } = useBeforeUnload({
	route,
});
const { registerCustomAction, unregisterCustomAction } = useGlobalLinkActions();
const { runWorkflow, runEntireWorkflow, stopCurrentExecution, stopWaitingForWebhook } =
	useRunWorkflow({ router });
const {
	updateNodePosition,
	updateNodesPosition,
	tidyUp,
	revertUpdateNodePosition,
	renameNode,
	revertRenameNode,
	revertReplaceNodeParameters,
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
	importTemplate,
	revertAddNode,
	createConnection,
	revertCreateConnection,
	deleteConnection,
	revertDeleteConnection,
	revalidateNodeInputConnections,
	revalidateNodeOutputConnections,
	setNodeActiveByName,
	clearNodeActive,
	addConnections,
	tryToOpenSubworkflowInNewTab,
	importWorkflowData,
	fetchWorkflowDataFromUrl,
	resetWorkspace,
	initializeWorkspace,
	openExecution,
	editableWorkflow,
	editableWorkflowObject,
	lastClickPosition,
	startChat,
} = useCanvasOperations();
const { extractWorkflow } = useWorkflowExtraction();
const { applyExecutionData } = useExecutionDebugging();
useClipboard({ onPaste: onClipboardPaste });

const isFocusPanelFeatureEnabled = computed(() => {
	return usePostHog().getVariant(FOCUS_PANEL_EXPERIMENT.name) === FOCUS_PANEL_EXPERIMENT.variant;
});

const isLoading = ref(true);
const isBlankRedirect = ref(false);
const readOnlyNotification = ref<null | { visible: boolean }>(null);

const isProductionExecutionPreview = ref(false);
const isExecutionPreview = ref(false);

const canOpenNDV = ref(true);
const hideNodeIssues = ref(false);
const fallbackNodes = ref<INodeUi[]>([]);

const initializedWorkflowId = ref<string | undefined>();
const workflowId = computed(() => {
	const workflowIdParam = route.params.name as string;
	return [PLACEHOLDER_EMPTY_WORKFLOW_ID, NEW_WORKFLOW_ID].includes(workflowIdParam)
		? undefined
		: workflowIdParam;
});
const routeNodeId = computed(() => route.params.nodeId as string | undefined);

const isNewWorkflowRoute = computed(() => route.name === VIEWS.NEW_WORKFLOW || !workflowId.value);
const isWorkflowRoute = computed(() => !!route?.meta?.nodeView || isDemoRoute.value);
const isDemoRoute = computed(() => route.name === VIEWS.DEMO);
const isReadOnlyRoute = computed(() => !!route?.meta?.readOnlyCanvas);
const isReadOnlyEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});
const isNDVV2 = computed(() =>
	posthogStore.isVariantEnabled(
		NDV_UI_OVERHAUL_EXPERIMENT.name,
		NDV_UI_OVERHAUL_EXPERIMENT.variant,
	),
);

const isCanvasReadOnly = computed(() => {
	return (
		isDemoRoute.value ||
		isReadOnlyEnvironment.value ||
		!(workflowPermissions.value.update ?? projectPermissions.value.workflow.update) ||
		editableWorkflow.value.isArchived
	);
});

const showFallbackNodes = computed(() => triggerNodes.value.length === 0);

const keyBindingsEnabled = computed(() => {
	return !ndvStore.activeNode && uiStore.activeModals.length === 0;
});

const isLogsPanelOpen = computed(() => logsStore.isOpen);

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

	if (route.query.action === 'workflowSave') {
		uiStore.stateIsDirty = false;
		// Remove the action from the query
		await router.replace({
			query: { ...route.query, action: undefined },
		});
		return;
	}

	// Open node panel if the route has a corresponding action
	if (route.query.action === 'addEvaluationTrigger') {
		nodeCreatorStore.openNodeCreatorForTriggerNodes(
			NODE_CREATOR_OPEN_SOURCES.ADD_EVALUATION_TRIGGER_BUTTON,
		);
	} else if (route.query.action === 'addEvaluationNode') {
		nodeCreatorStore.openNodeCreatorForActions(
			EVALUATION_NODE_TYPE,
			NODE_CREATOR_OPEN_SOURCES.ADD_EVALUATION_NODE_BUTTON,
		);
	} else if (route.query.action === 'executeEvaluation') {
		if (evaluationTriggerNode.value) {
			void runEntireWorkflow('node', evaluationTriggerNode.value.name);
		}
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
		const loadWorkflowFromJSON = route.query.fromJson === 'true';

		if (loadWorkflowFromJSON) {
			const easyAiWorkflowJson = getEasyAiWorkflowJson();
			const ragStarterWorkflowJson = getRagStarterWorkflowJson();

			switch (templateId) {
				case easyAiWorkflowJson.meta.templateId:
					await openTemplateFromWorkflowJSON(easyAiWorkflowJson);
					break;
				case ragStarterWorkflowJson.meta.templateId:
					await openTemplateFromWorkflowJSON(ragStarterWorkflowJson);
					break;
				default:
					toast.showError(
						new Error(i18n.baseText('nodeView.couldntLoadWorkflow.invalidWorkflowObject')),
						i18n.baseText('nodeView.couldntImportWorkflow'),
					);
					await router.replace({ name: VIEWS.NEW_WORKFLOW });
			}
		} else {
			await openWorkflowTemplate(templateId.toString());
		}
	} else if (isWorkflowRoute.value) {
		if (!isAlreadyInitialized) {
			historyStore.reset();

			if (!isDemoRoute.value) {
				await loadCredentials();
			}

			// If there is no workflow id, treat it as a new workflow
			if (isNewWorkflowRoute.value || !workflowId.value) {
				if (route.meta?.nodeView === true) {
					await initializeWorkspaceForNewWorkflow();
				}
				return;
			}

			await initializeWorkspaceForExistingWorkflow(workflowId.value);

			void nextTick(() => {
				updateNodesIssues();
			});
		}

		if (route.name === VIEWS.EXECUTION_DEBUG) {
			await initializeDebugMode();
		}
	}
}

async function initializeWorkspaceForNewWorkflow() {
	resetWorkspace();

	const parentFolderId = route.query.parentFolderId as string | undefined;

	await workflowsStore.getNewWorkflowDataAndMakeShareable(
		undefined,
		projectsStore.currentProjectId,
		parentFolderId,
	);

	if (projectsStore.currentProjectId) {
		await fetchAndSetProject(projectsStore.currentProjectId);
	}
	await fetchAndSetParentFolder(parentFolderId);

	uiStore.nodeViewInitialized = true;
	initializedWorkflowId.value = NEW_WORKFLOW_ID;
}

// These two methods load home project and parent folder data if they are not already loaded
// This happens when user lands straight on the new workflow page and we have nothing in the store
async function fetchAndSetParentFolder(folderId?: string) {
	if (folderId) {
		let parentFolder = foldersStore.getCachedFolder(folderId);
		if (!parentFolder && projectsStore.currentProjectId) {
			await foldersStore.getFolderPath(projectsStore.currentProjectId, folderId);
			parentFolder = foldersStore.getCachedFolder(folderId);
		}
		if (parentFolder) {
			workflowsStore.setParentFolder({
				...parentFolder,
				parentFolderId: parentFolder.parentFolder ?? null,
			});
		}
	}
}

async function fetchAndSetProject(projectId: string) {
	if (!projectsStore.currentProject) {
		const project = await projectsStore.fetchProject(projectId);
		projectsStore.setCurrentProject(project);
	}
}

async function initializeWorkspaceForExistingWorkflow(id: string) {
	try {
		const workflowData = await workflowsStore.fetchWorkflow(id);

		openWorkflow(workflowData);

		if (workflowData.parentFolder) {
			workflowsStore.setParentFolder(workflowData.parentFolder);
		}

		if (workflowData.meta?.onboardingId) {
			trackOpenWorkflowFromOnboardingTemplate();
		}

		if (workflowData.meta?.templateId?.startsWith('035_template_onboarding')) {
			aiTemplatesStarterCollectionStore.trackUserOpenedWorkflow(
				workflowData.meta.templateId.split('-').pop() ?? '',
			);
		}

		await projectsStore.setProjectNavActiveIdByWorkflowHomeProject(workflowData.homeProject);
	} catch (error) {
		if (error.httpStatusCode === 404) {
			return await router.replace({
				name: VIEWS.ENTITY_NOT_FOUND,
				params: { entityType: 'workflow' },
			});
		}
		if (error.httpStatusCode === 403) {
			return await router.replace({
				name: VIEWS.ENTITY_UNAUTHORIZED,
				params: { entityType: 'workflow' },
			});
		}

		toast.showError(error, i18n.baseText('openWorkflow.workflowNotFoundError'));
		void router.push({
			name: VIEWS.NEW_WORKFLOW,
		});
	} finally {
		uiStore.nodeViewInitialized = true;
		initializedWorkflowId.value = workflowId.value;
	}
}

function updateNodesIssues() {
	nodeHelpers.updateNodesInputIssues();
	nodeHelpers.updateNodesCredentialsIssues();
	nodeHelpers.updateNodesParameterIssues();
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
	);
}

/**
 * Templates
 */

async function openTemplateFromWorkflowJSON(workflow: WorkflowDataWithTemplateId) {
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

	isBlankRedirect.value = true;
	const templateId = workflow.meta.templateId;
	const parentFolderId = route.query.parentFolderId as string | undefined;
	await router.replace({
		name: VIEWS.NEW_WORKFLOW,
		query: { templateId, parentFolderId },
	});

	await importTemplate({ id: templateId, name: workflow.name, workflow });

	uiStore.stateIsDirty = true;

	canvasStore.stopLoading();

	fitView();
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

	isBlankRedirect.value = true;
	await router.replace({ name: VIEWS.NEW_WORKFLOW, query: { templateId } });

	await importTemplate({ id: templateId, name: data.name, workflow: data.workflow });

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
	telemetry.track('User inserted workflow template', {
		source: 'workflow',
		template_id: tryToParseNumber(templateId),
		wf_template_repo_session_id: templatesStore.previousSessionId,
	});
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

function onTidyUp(event: CanvasLayoutEvent) {
	tidyUp(event);
}

function onExtractWorkflow(nodeIds: string[]) {
	void extractWorkflow(nodeIds);
}

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
	const matchedFallbackNode = fallbackNodes.value.findIndex((node) => node.id === id);
	if (matchedFallbackNode >= 0) {
		fallbackNodes.value.splice(matchedFallbackNode, 1);
	} else {
		deleteNode(id, { trackHistory: true });
	}
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

function onClickNode(_id: string, event: VueFlowXYPosition) {
	lastClickPosition.value = [event.x, event.y];
	closeNodeCreator();
}

function onSetNodeActivated(id: string, event?: MouseEvent) {
	// Handle Ctrl/Cmd + Double Click case
	if (event?.metaKey || event?.ctrlKey) {
		const didOpen = tryToOpenSubworkflowInNewTab(id);
		if (didOpen) {
			return;
		}
	}

	setNodeActive(id);
}

function onOpenSubWorkflow(id: string) {
	tryToOpenSubworkflowInNewTab(id);
}

function onSetNodeDeactivated() {
	clearNodeActive();
}

function onSetNodeSelected(id?: string) {
	closeNodeCreator();
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

	let workflowData: WorkflowDataUpdate | null | undefined = null;

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
		workflowData = jsonParse<WorkflowDataUpdate | null>(plainTextData, { fallbackValue: null });
	}

	if (!workflowData) {
		return;
	}

	const result = await importWorkflowData(workflowData, 'paste', {
		importTags: false,
		viewport: viewportBoundaries.value,
	});
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

	const newIds = await duplicateNodes(ids, {
		viewport: viewportBoundaries.value,
	});

	selectNodes(newIds);
}

function onPinNodes(ids: string[], source: PinDataSource) {
	if (!checkIfEditingIsAllowed()) {
		return;
	}

	toggleNodesPinned(ids, source);
}

async function onSaveWorkflow() {
	const workflowIsSaved = !uiStore.stateIsDirty && !workflowsStore.isNewWorkflow;
	const workflowIsArchived = workflowsStore.workflow.isArchived;

	if (workflowIsSaved || workflowIsArchived) {
		return;
	}
	const saved = await workflowSaving.saveCurrentWorkflow();
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

function onRenameNode(name: string) {
	if (ndvStore.activeNode?.name) {
		void renameNode(ndvStore.activeNode.name, name);
	}
}

async function onOpenRenameNodeModal(id: string) {
	const currentName = workflowsStore.getNodeById(id)?.name ?? '';

	const activeElement = document.activeElement;

	if (activeElement && activeElement.tagName === 'INPUT') {
		// If an input is focused, do not open the rename modal
		return;
	}

	if (!keyBindingsEnabled.value || document.querySelector('.rename-prompt')) return;

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

async function onRevertReplaceNodeParameters({
	nodeId,
	currentProperties,
	newProperties,
}: {
	nodeId: string;
	currentProperties: INodeParameters;
	newProperties: INodeParameters;
}) {
	await revertReplaceNodeParameters(nodeId, currentProperties, newProperties);
}

function onUpdateNodeParameters(id: string, parameters: Record<string, unknown>) {
	setNodeParameters(id, parameters);
}

function onUpdateNodeInputs(id: string) {
	revalidateNodeInputConnections(id);
}

function onUpdateNodeOutputs(id: string) {
	revalidateNodeOutputConnections(id);
}

function onClickNodeAdd(source: string, sourceHandle: string) {
	if (isFocusPanelFeatureEnabled.value && focusPanelStore.focusPanelActive) {
		focusPanelStore.hideFocusPanel();
	}

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

	if (workflowId.value) {
		options = { workflowId: workflowId.value };
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

async function importWorkflowExact({ workflow: workflowData }: { workflow: WorkflowDataUpdate }) {
	if (!workflowData.nodes || !workflowData.connections) {
		throw new Error('Invalid workflow object');
	}

	resetWorkspace();

	await initializeData();

	initializeWorkspace({
		...workflowData,
		nodes: getNodesWithNormalizedPosition<INodeUi>(workflowData.nodes),
	} as IWorkflowDb);

	fitView();
}

async function onImportWorkflowDataEvent(data: IDataObject) {
	const workflowData = data.data as WorkflowDataUpdate;
	await importWorkflowData(workflowData, 'file', {
		viewport: viewportBoundaries.value,
		regenerateIds: data.regenerateIds === true || data.regenerateIds === undefined,
	});

	fitView();
	selectNodes(workflowData.nodes?.map((node) => node.id) ?? []);
	if (data.tidyUp) {
		const nodesIdsToTidyUp = data.nodesIdsToTidyUp as string[];
		setTimeout(() => {
			canvasEventBus.emit('tidyUp', {
				source: 'import-workflow-data',
				nodeIdsFilter: nodesIdsToTidyUp,
			});
		}, 0);
	}
}

async function onImportWorkflowUrlEvent(data: IDataObject) {
	const workflowData = await fetchWorkflowDataFromUrl(data.url as string);
	if (!workflowData) {
		return;
	}

	await importWorkflowData(workflowData, 'url', {
		viewport: viewportBoundaries.value,
	});

	fitView();
	selectNodes(workflowData.nodes?.map((node) => node.id) ?? []);
}

function addImportEventBindings() {
	nodeViewEventBus.on('importWorkflowData', onImportWorkflowDataEvent);
	nodeViewEventBus.on('importWorkflowUrl', onImportWorkflowUrlEvent);
	nodeViewEventBus.on('openChat', onOpenChat);
}

function removeImportEventBindings() {
	nodeViewEventBus.off('importWorkflowData', onImportWorkflowDataEvent);
	nodeViewEventBus.off('importWorkflowUrl', onImportWorkflowUrlEvent);
	nodeViewEventBus.off('openChat', onOpenChat);
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
		viewport: viewportBoundaries.value,
		trackHistory: true,
		telemetry: true,
	});

	const offsetIndex = editableWorkflow.value.nodes.length - nodes.length;
	const mappedConnections: CanvasConnectionCreateData[] = connections.map(({ from, to }) => {
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

	await addConnections(mappedConnections);

	uiStore.resetLastInteractedWith();

	if (addedNodes.length > 0) {
		selectNodes([addedNodes[addedNodes.length - 1].id]);
	}
}

async function onRevertAddNode({ node }: { node: INodeUi }) {
	await revertAddNode(node.name);
}

function onSwitchActiveNode(nodeName: string) {
	const node = workflowsStore.getNodeByName(nodeName);
	if (!node) return;

	setNodeActiveByName(nodeName);
	selectNodes([node.id]);
}

function onOpenSelectiveNodeCreator(
	node: string,
	connectionType: NodeConnectionType,
	connectionIndex: number = 0,
) {
	nodeCreatorStore.openSelectiveNodeCreator({ node, connectionType, connectionIndex });
}

function onToggleNodeCreator(options: ToggleNodeCreatorOptions) {
	nodeCreatorStore.setNodeCreatorState(options);

	if (isFocusPanelFeatureEnabled.value && focusPanelStore.focusPanelActive) {
		focusPanelStore.hideFocusPanel(options.createNodeActive);
	}

	if (!options.createNodeActive && !options.hasAddedNodes) {
		uiStore.resetLastInteractedWith();
	}
}

function onOpenNodeCreatorFromCanvas(source: NodeCreatorOpenSource) {
	onToggleNodeCreator({ createNodeActive: true, source });
}

function onOpenNodeCreatorForTriggerNodes(source: NodeCreatorOpenSource) {
	nodeCreatorStore.openNodeCreatorForTriggerNodes(source);
}

function onToggleFocusPanel() {
	if (!isFocusPanelFeatureEnabled.value) {
		return;
	}

	focusPanelStore.toggleFocusPanel();
}

function closeNodeCreator() {
	if (nodeCreatorStore.isCreateNodeActive) {
		nodeCreatorStore.isCreateNodeActive = false;

		if (isFocusPanelFeatureEnabled.value && focusPanelStore.focusPanelActive) {
			focusPanelStore.hideFocusPanel(false);
		}
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

const isRunWorkflowButtonVisible = computed(
	() => !isOnlyChatTriggerNodeActive.value || chatTriggerNodePinnedData.value,
);
const isStopExecutionButtonVisible = computed(
	() => isWorkflowRunning.value && !isExecutionWaitingForWebhook.value,
);
const isStopWaitingForWebhookButtonVisible = computed(
	() => isWorkflowRunning.value && isExecutionWaitingForWebhook.value,
);

async function onRunWorkflowToNode(id: string) {
	const node = workflowsStore.getNodeById(id);
	if (!node) return;

	if (needsAgentInput(node) && nodeTypesStore.isToolNode(node.type)) {
		uiStore.openModalWithData({
			name: FROM_AI_PARAMETERS_MODAL_KEY,
			data: {
				nodeName: node.name,
			},
		});
	} else {
		trackRunWorkflowToNode(node);
		agentRequestStore.clearAgentRequests(workflowsStore.workflowId, node.id);

		void runWorkflow({ destinationNode: node.name, source: 'Node.executeNode' });
	}
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

async function onOpenExecution(executionId: string, nodeId?: string) {
	canvasStore.startLoading();

	resetWorkspace();
	await initializeData();

	const data = await openExecution(executionId, nodeId);
	if (!data) {
		return;
	}

	void nextTick(() => {
		updateNodesIssues();
	});

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

function onOpenChat() {
	startChat('main');
}

/**
 * Evaluation
 */
const evaluationTriggerNode = computed(() => {
	return editableWorkflow.value.nodes.find((node) => node.type === EVALUATION_TRIGGER_NODE_TYPE);
});

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
	historyBus.on('revertReplaceNodeParameters', onRevertReplaceNodeParameters);
	historyBus.on('enableNodeToggle', onRevertToggleNodeDisabled);
}

function removeUndoRedoEventBindings() {
	historyBus.off('nodeMove', onRevertNodePosition);
	historyBus.off('revertAddNode', onRevertAddNode);
	historyBus.off('revertRemoveNode', onRevertDeleteNode);
	historyBus.off('revertAddConnection', onRevertCreateConnection);
	historyBus.off('revertRemoveConnection', onRevertDeleteConnection);
	historyBus.off('revertRenameNode', onRevertRenameNode);
	historyBus.off('revertReplaceNodeParameters', onRevertReplaceNodeParameters);
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
				isProductionExecutionPreview.value =
					json.executionMode !== 'manual' && json.executionMode !== 'evaluation';

				await onOpenExecution(json.executionId, json.nodeId);
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
const viewportDimensions = ref<Dimensions>({ width: 0, height: 0 });

const viewportBoundaries = computed<ViewportBoundaries>(() =>
	getBounds(viewportTransform.value, viewportDimensions.value),
);

function onViewportChange(viewport: ViewportTransform, dimensions: Dimensions) {
	viewportTransform.value = viewport;
	viewportDimensions.value = dimensions;
	uiStore.nodeViewOffsetPosition = [viewport.x, viewport.y];
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

function onClickPane(position: VueFlowXYPosition) {
	lastClickPosition.value = [position.x, position.y];
	onSetNodeSelected();
}

function onSelectionEnd(position: VueFlowXYPosition) {
	lastClickPosition.value = [position.x, position.y];
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
			creatorview: creatorView,
			connectiontype: connectionType,
			node,
		}: {
			creatorview: NodeFilterType;
			connectiontype: NodeConnectionType;
			node: string;
		}) => {
			nodeCreatorStore.openSelectiveNodeCreator({ node, connectionType, creatorView });
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

function updateNodeRoute(nodeId: string) {
	const nodeUi = workflowsStore.findNodeByPartialId(nodeId);
	if (nodeUi) {
		setNodeActive(nodeUi.id);
	} else {
		toast.showToast({
			title: i18n.baseText('nodeView.showMessage.ndvUrl.missingNodes.title'),
			message: i18n.baseText('nodeView.showMessage.ndvUrl.missingNodes.content'),
			type: 'warning',
		});
		void router.replace({
			name: route.name,
			params: { name: workflowId.value },
		});
	}
}

watch(
	() => route.name,
	async (newRouteName, oldRouteName) => {
		// When navigating from an existing workflow to a new workflow or the other way around we should load the new workflow
		const force =
			(newRouteName === VIEWS.NEW_WORKFLOW && oldRouteName === VIEWS.WORKFLOW) ||
			(newRouteName === VIEWS.WORKFLOW && oldRouteName === VIEWS.NEW_WORKFLOW);
		await initializeRoute(force);
	},
);

watch(
	() => {
		return isLoading.value || isCanvasReadOnly.value || editableWorkflow.value.nodes.length !== 0;
	},
	(isReadOnlyOrLoading) => {
		const defaultFallbackNodes: INodeUi[] = [
			{
				id: CanvasNodeRenderType.AddNodes,
				name: CanvasNodeRenderType.AddNodes,
				type: CanvasNodeRenderType.AddNodes,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		];

		if (builderStore.isAIBuilderEnabled && builderStore.isAssistantEnabled) {
			defaultFallbackNodes.unshift({
				id: CanvasNodeRenderType.AIPrompt,
				name: CanvasNodeRenderType.AIPrompt,
				type: CanvasNodeRenderType.AIPrompt,
				typeVersion: 1,
				position: [-690, -15],
				parameters: {},
			});
		}

		fallbackNodes.value = isReadOnlyOrLoading ? [] : defaultFallbackNodes;
	},
);

// This keeps the selected node in sync if the URL is updated
watch(
	() => route.params.nodeId,
	async (newId) => {
		if (typeof newId !== 'string' || newId === '') ndvStore.activeNodeName = null;
		else {
			updateNodeRoute(newId);
		}
	},
);

// This keeps URL in sync if the activeNode is changed
watch(
	() => ndvStore.activeNode,
	async (val) => {
		// This is just out of caution
		if (!([VIEWS.WORKFLOW] as string[]).includes(String(route.name))) return;

		// Route params default to '' instead of undefined if not present
		const nodeId = val?.id ? workflowsStore.getPartialIdForNode(val?.id) : '';

		if (nodeId !== route.params.nodeId) {
			await router.replace({
				name: route.name,
				params: { name: workflowId.value, nodeId },
			});
		}
	},
);
onBeforeRouteLeave(async (to, from, next) => {
	const toNodeViewTab = getNodeViewTab(to);

	if (
		toNodeViewTab === MAIN_HEADER_TABS.EXECUTIONS ||
		from.name === VIEWS.TEMPLATE_IMPORT ||
		(toNodeViewTab === MAIN_HEADER_TABS.WORKFLOW && from.name === VIEWS.EXECUTION_DEBUG) ||
		isReadOnlyEnvironment.value
	) {
		next();
		return;
	}

	await useWorkflowSaving({ router }).promptSaveUnsavedWorkflowChanges(next, {
		async confirm() {
			if (from.name === VIEWS.NEW_WORKFLOW) {
				// Replace the current route with the new workflow route
				// before navigating to the new route when saving new workflow.
				const savedWorkflowId = workflowsStore.workflowId;
				await router.replace({
					name: VIEWS.WORKFLOW,
					params: { name: savedWorkflowId },
				});

				await router.push(to);

				return false;
			}

			// Make sure workflow id is empty when leaving the editor
			workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);

			return true;
		},
	});
});

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

				if (route.query.settings) {
					uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
					void router.replace({ query: { settings: undefined } });
				}
			})
			.finally(() => {
				isLoading.value = false;
				canvasStore.stopLoading();

				void externalHooks.run('nodeView.mount').catch(() => {});

				// A delay here makes opening the NDV a bit less jarring
				setTimeout(() => {
					if (routeNodeId.value) {
						updateNodeRoute(routeNodeId.value);
					}
				}, 500);

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
	uiStore.closeModal(WORKFLOW_SETTINGS_MODAL_KEY);
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
	<div :class="$style.wrapper">
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
			:key-bindings="keyBindingsEnabled"
			@update:nodes:position="onUpdateNodesPosition"
			@update:node:position="onUpdateNodePosition"
			@update:node:activated="onSetNodeActivated"
			@update:node:deactivated="onSetNodeDeactivated"
			@update:node:selected="onSetNodeSelected"
			@update:node:enabled="onToggleNodeDisabled"
			@update:node:name="onOpenRenameNodeModal"
			@update:node:parameters="onUpdateNodeParameters"
			@update:node:inputs="onUpdateNodeInputs"
			@update:node:outputs="onUpdateNodeOutputs"
			@update:logs-open="logsStore.toggleOpen($event)"
			@update:logs:input-open="logsStore.toggleInputOpen"
			@update:logs:output-open="logsStore.toggleOutputOpen"
			@update:has-range-selection="canvasStore.setHasRangeSelection"
			@open:sub-workflow="onOpenSubWorkflow"
			@click:node="onClickNode"
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
			@run:workflow="runEntireWorkflow('main')"
			@save:workflow="onSaveWorkflow"
			@create:workflow="onCreateWorkflow"
			@viewport:change="onViewportChange"
			@selection:end="onSelectionEnd"
			@drag-and-drop="onDragAndDrop"
			@tidy-up="onTidyUp"
			@toggle:focus-panel="onToggleFocusPanel"
			@extract-workflow="onExtractWorkflow"
			@start-chat="startChat()"
		>
			<Suspense>
				<LazySetupWorkflowCredentialsButton :class="$style.setupCredentialsButtonWrapper" />
			</Suspense>
			<div v-if="!isCanvasReadOnly" :class="$style.executionButtons">
				<CanvasRunWorkflowButton
					v-if="isRunWorkflowButtonVisible"
					:waiting-for-webhook="isExecutionWaitingForWebhook"
					:disabled="isExecutionDisabled"
					:executing="isWorkflowRunning"
					:trigger-nodes="triggerNodes"
					:get-node-type="nodeTypesStore.getNodeType"
					:selected-trigger-node-name="workflowsStore.selectedTriggerNodeName"
					@mouseenter="onRunWorkflowButtonMouseEnter"
					@mouseleave="onRunWorkflowButtonMouseLeave"
					@execute="runEntireWorkflow('main')"
					@select-trigger-node="workflowsStore.setSelectedTriggerNodeName"
				/>
				<template v-if="containsChatTriggerNodes">
					<CanvasChatButton
						v-if="isLogsPanelOpen"
						type="tertiary"
						:label="i18n.baseText('chat.hide')"
						:class="$style.chatButton"
						@click="logsStore.toggleOpen(false)"
					/>
					<KeyboardShortcutTooltip
						v-else
						:label="i18n.baseText('chat.open')"
						:shortcut="{ keys: ['c'] }"
					>
						<CanvasChatButton
							:type="isRunWorkflowButtonVisible ? 'secondary' : 'primary'"
							:label="i18n.baseText('chat.open')"
							:class="$style.chatButton"
							@click="onOpenChat"
						/>
					</KeyboardShortcutTooltip>
				</template>
				<CanvasStopCurrentExecutionButton
					v-if="isStopExecutionButtonVisible"
					:stopping="isStoppingExecution"
					@click="onStopExecution"
				/>
				<CanvasStopWaitingForWebhookButton
					v-if="isStopWaitingForWebhookButtonVisible"
					@click="onStopWaitingForWebhook"
				/>
			</div>

			<N8nCallout
				v-if="isReadOnlyEnvironment"
				theme="warning"
				icon="lock"
				:class="$style.readOnlyEnvironmentNotification"
			>
				{{ i18n.baseText('readOnlyEnv.cantEditOrRun') }}
			</N8nCallout>

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
					v-if="!isNDVV2"
					:workflow-object="editableWorkflowObject"
					:read-only="isCanvasReadOnly"
					:is-production-execution-preview="isProductionExecutionPreview"
					:renaming="false"
					@value-changed="onRenameNode($event.value as string)"
					@stop-execution="onStopExecution"
					@switch-selected-node="onSwitchActiveNode"
					@open-connection-node-creator="onOpenSelectiveNodeCreator"
					@save-keyboard-shortcut="onSaveWorkflow"
				/>
			</Suspense>
			<Suspense>
				<LazyNodeDetailsViewV2
					v-if="isNDVV2"
					:workflow-object="editableWorkflowObject"
					:read-only="isCanvasReadOnly"
					:is-production-execution-preview="isProductionExecutionPreview"
					@rename-node="onRenameNode"
					@stop-execution="onStopExecution"
					@switch-selected-node="onSwitchActiveNode"
					@open-connection-node-creator="onOpenSelectiveNodeCreator"
					@save-keyboard-shortcut="onSaveWorkflow"
				/>
			</Suspense>
		</WorkflowCanvas>
		<FocusPanel
			v-if="isFocusPanelFeatureEnabled"
			:is-canvas-read-only="isCanvasReadOnly"
			@save-keyboard-shortcut="onSaveWorkflow"
		/>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	width: 100%;
}

.executionButtons {
	position: absolute;
	display: flex;
	justify-content: center;
	align-items: center;
	left: 50%;
	transform: translateX(-50%);
	bottom: var(--spacing-s);
	width: auto;

	@include mixins.breakpoint('sm-only') {
		left: auto;
		right: var(--spacing-s);
		transform: none;
	}

	button {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-left: 0.625rem;

		&:first-child {
			margin: 0;
		}

		@include mixins.breakpoint('xs-only') {
			text-indent: -10000px;
			width: 42px;
			height: 42px;
			padding: 0;

			span {
				margin: 0;
			}
		}
	}

	.chatButton {
		align-self: stretch;
	}
}

.setupCredentialsButtonWrapper {
	position: absolute;
	left: var(--spacing-s);
	top: var(--spacing-s);
}

.readOnlyEnvironmentNotification {
	position: absolute;
	bottom: 16px;
	left: 50%;
	transform: translateX(-50%);
}
</style>
