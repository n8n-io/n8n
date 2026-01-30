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
	useTemplateRef,
	provide,
} from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import WorkflowCanvas from '@/features/workflows/canvas/components/WorkflowCanvas.vue';
import FocusPanel from '@/app/components/FocusPanel.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import CanvasRunWorkflowButton from '@/features/workflows/canvas/components/elements/buttons/CanvasRunWorkflowButton.vue';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useGlobalLinkActions } from '@/app/composables/useGlobalLinkActions';
import type {
	AddedNodesAndConnections,
	INodeUi,
	IWorkflowDb,
	NodeCreatorOpenSource,
	NodeFilterType,
	ToggleNodeCreatorOptions,
	XYPosition,
} from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import type {
	Connection,
	Dimensions,
	ViewportTransform,
	XYPosition as VueFlowXYPosition,
} from '@vue-flow/core';
import type {
	CanvasNode,
	CanvasNodeMoveEvent,
	ConnectStartEvent,
	ViewportBoundaries,
} from '@/features/workflows/canvas/canvas.types';
import {
	CanvasConnectionMode,
	CanvasNodeRenderType,
} from '@/features/workflows/canvas/canvas.types';
import {
	CHAT_TRIGGER_NODE_TYPE,
	DRAG_EVENT_DATA_KEY,
	EnterpriseEditionFeature,
	FROM_AI_PARAMETERS_MODAL_KEY,
	MAIN_HEADER_TABS,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
	MODAL_CONFIRM,
	NODE_CREATOR_OPEN_SOURCES,
	STICKY_NODE_TYPE,
	VALID_WORKFLOW_IMPORT_URL_REGEX,
	VIEWS,
	WORKFLOW_SETTINGS_MODAL_KEY,
	ABOUT_MODAL_KEY,
	WorkflowStateKey,
	PRODUCTION_ONLY_TRIGGER_NODE_TYPES,
	HUMAN_IN_THE_LOOP_CATEGORY,
} from '@/app/constants';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import {
	jsonParse,
	EVALUATION_TRIGGER_NODE_TYPE,
	EVALUATION_NODE_TYPE,
	isTriggerNode,
	NodeHelpers,
	NodeConnectionTypes,
} from 'n8n-workflow';
import type {
	NodeConnectionType,
	IDataObject,
	ExecutionSummary,
	IConnection,
	INodeParameters,
} from 'n8n-workflow';
import { useToast } from '@/app/composables/useToast';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useEnvironmentsStore } from '@/features/settings/environments.ee/environments.store';
import { useExternalSecretsStore } from '@/features/integrations/externalSecrets.ee/externalSecrets.ee.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { historyBus } from '@/app/models/history';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { useCanvasStore } from '@/app/stores/canvas.store';
import { useMessage } from '@/app/composables/useMessage';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useNpsSurveyStore } from '@/app/stores/npsSurvey.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useHistoryStore } from '@/app/stores/history.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useExecutionDebugging } from '@/features/execution/executions/composables/useExecutionDebugging';
import { useUsersStore } from '@/features/settings/users/users.store';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import {
	getBounds,
	getNodesWithNormalizedPosition,
	getNodeViewTab,
} from '@/app/utils/nodeViewUtils';
import CanvasStopCurrentExecutionButton from '@/features/workflows/canvas/components/elements/buttons/CanvasStopCurrentExecutionButton.vue';
import CanvasStopWaitingForWebhookButton from '@/features/workflows/canvas/components/elements/buttons/CanvasStopWaitingForWebhookButton.vue';
import { nodeViewEventBus } from '@/app/event-bus';
import type { PinDataSource } from '@/app/composables/usePinnedData';
import { useClipboard } from '@/app/composables/useClipboard';
import { useBeforeUnload } from '@/app/composables/useBeforeUnload';
import { getResourcePermissions } from '@n8n/permissions';
import NodeViewUnfinishedWorkflowMessage from '@/app/components/NodeViewUnfinishedWorkflowMessage.vue';
import {
	parseCanvasConnectionHandleString,
	shouldIgnoreCanvasShortcut,
} from '@/features/workflows/canvas/canvas.utils';
import { getSampleWorkflowByTemplateId } from '@/features/workflows/templates/utils/workflowSamples';
import type { CanvasLayoutEvent } from '@/features/workflows/canvas/composables/useCanvasLayout';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { useWorkflowExtraction } from '@/app/composables/useWorkflowExtraction';
import { useAgentRequestStore } from '@n8n/stores/useAgentRequestStore';
import { needsAgentInput } from '@/app/utils/nodes/nodeTransforms';
import { useLogsStore } from '@/app/stores/logs.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import CanvasChatButton from '@/features/workflows/canvas/components/elements/buttons/CanvasChatButton.vue';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { useAITemplatesStarterCollectionStore } from '@/experiments/aiTemplatesStarterCollection/stores/aiTemplatesStarterCollection.store';
import { useReadyToRunWorkflowsStore } from '@/experiments/readyToRunWorkflows/stores/readyToRunWorkflows.store';
import { useEmptyStateBuilderPromptStore } from '@/experiments/emptyStateBuilderPrompt/stores/emptyStateBuilderPrompt.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useKeybindings } from '@/app/composables/useKeybindings';
import { type ContextMenuAction } from '@/features/shared/contextMenu/composables/useContextMenuItems';
import { useExperimentalNdvStore } from '@/features/workflows/canvas/experimental/experimentalNdv.store';
import { useWorkflowState } from '@/app/composables/useWorkflowState';
import { useActivityDetection } from '@/app/composables/useActivityDetection';
import { useParentFolder } from '@/features/core/folders/composables/useParentFolder';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';

import { N8nCallout, N8nCanvasThinkingPill, N8nCanvasCollaborationPill } from '@n8n/design-system';

defineOptions({
	name: 'NodeView',
});

const LazyNodeCreation = defineAsyncComponent(
	async () => await import('@/features/shared/nodeCreator/views/NodeCreation.vue'),
);

const LazyNodeDetailsView = defineAsyncComponent(
	async () => await import('@/features/ndv/shared/views/NodeDetailsView.vue'),
);
const LazyNodeDetailsViewV2 = defineAsyncComponent(
	async () => await import('@/features/ndv/shared/views/NodeDetailsViewV2.vue'),
);

const LazySetupWorkflowCredentialsButton = defineAsyncComponent(
	async () =>
		await import('@/features/workflows/templates/components/SetupWorkflowCredentialsButton.vue'),
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
const workflowSaving = useWorkflowSaving({
	router,
	onSaved: (isFirstSave) => {
		canvasEventBus.emit('saved:workflow', { isFirstSave });
	},
});
const nodeHelpers = useNodeHelpers();
const clipboard = useClipboard({ onPaste: onClipboardPaste });

const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const workflowsListStore = useWorkflowsListStore();
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
const builderStore = useBuilderStore();
const agentRequestStore = useAgentRequestStore();
const logsStore = useLogsStore();
const aiTemplatesStarterCollectionStore = useAITemplatesStarterCollectionStore();
const readyToRunWorkflowsStore = useReadyToRunWorkflowsStore();
const experimentalNdvStore = useExperimentalNdvStore();
const collaborationStore = useCollaborationStore();
const emptyStateBuilderPromptStore = useEmptyStateBuilderPromptStore();
const chatPanelStore = useChatPanelStore();

const workflowState = useWorkflowState();

// Initialize activity detection for collaboration
useActivityDetection();
provide(WorkflowStateKey, workflowState);

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
	revertAddNode,
	createConnection,
	revertCreateConnection,
	deleteConnection,
	revertDeleteConnection,
	revalidateNodeInputConnections,
	revalidateNodeOutputConnections,
	setNodeActiveByName,
	clearNodeActive,
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
	addNodesAndConnections,
	fitView,
	openWorkflowTemplate,
	openWorkflowTemplateFromJSON,
} = useCanvasOperations();
const { extractWorkflow } = useWorkflowExtraction();
const { applyExecutionData } = useExecutionDebugging();
const { fetchAndSetParentFolder } = useParentFolder();

useKeybindings({
	ctrl_alt_o: () => uiStore.openModal(ABOUT_MODAL_KEY),
});

const canvasRef = useTemplateRef('canvas');
const isLoading = ref(true);
const readOnlyNotification = ref<null | { visible: boolean }>(null);

const isProductionExecutionPreview = ref(false);
const isExecutionPreview = ref(false);

const canOpenNDV = ref(true);
const hideNodeIssues = ref(false);
const fallbackNodes = ref<INodeUi[]>([]);

const initializedWorkflowId = ref<string | undefined>();
const workflowId = computed(() => {
	const name = route.params.name;
	return Array.isArray(name) ? name[0] : name;
});
const routeNodeId = computed(() => {
	const nodeId = route.params.nodeId;
	return Array.isArray(nodeId) ? nodeId[0] : nodeId;
});

// Check if this is a new workflow by looking for the ?new query param
const isNewWorkflowRoute = computed(() => {
	return route.query.new === 'true';
});

// Check if canvas controls should be hidden (e.g., for workflow preview thumbnails)
const hideCanvasControls = computed(() => {
	return route.query.hideControls === 'true';
});

const isWorkflowRoute = computed(() => !!route?.meta?.nodeView || isDemoRoute.value);
const isDemoRoute = computed(() => route.name === VIEWS.DEMO);
const isReadOnlyRoute = computed(() => !!route?.meta?.readOnlyCanvas);
const isReadOnlyEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});
const isNDVV2 = computed(() => true);

const isCanvasReadOnly = computed(() => {
	return (
		isDemoRoute.value ||
		isReadOnlyEnvironment.value ||
		collaborationStore.shouldBeReadOnly ||
		!(workflowPermissions.value.update ?? projectPermissions.value.workflow.update) ||
		editableWorkflow.value.isArchived ||
		builderStore.streaming
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
			workflowsListStore.fetchActiveWorkflows(),
			credentialsStore.fetchCredentialTypes(true),
			loadCredentials(),
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
		//We don't need to await this as community node previews are not critical and needed only in nodes search panel
		void nodeTypesStore.fetchCommunityNodePreviews();
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
		!force && initializedWorkflowId.value && initializedWorkflowId.value === workflowId.value;

	// This function is called on route change as well, so we need to do the following:
	// - if the redirect is blank, then do nothing
	// - if the route is the template import view, then open the template
	// - if the user is leaving the current view without saving the changes, then show a confirmation modal
	if (uiStore.isBlankRedirect) {
		uiStore.isBlankRedirect = false;
	} else if (route.name === VIEWS.TEMPLATE_IMPORT) {
		const loadWorkflowFromJSON = route.query.fromJson === 'true';
		const templateId = route.params.id;
		if (!templateId) {
			return;
		}

		if (loadWorkflowFromJSON) {
			const workflow = getSampleWorkflowByTemplateId(templateId.toString());
			if (!workflow) {
				toast.showError(
					new Error(i18n.baseText('nodeView.couldntLoadWorkflow.invalidWorkflowObject')),
					i18n.baseText('nodeView.couldntImportWorkflow'),
				);
				await router.replace({ name: VIEWS.NEW_WORKFLOW });
				return;
			}

			await openWorkflowTemplateFromJSON(workflow);
		} else {
			await openWorkflowTemplate(templateId.toString());
		}
	} else if (isWorkflowRoute.value) {
		if (!isAlreadyInitialized) {
			historyStore.reset();

			if (isDemoRoute.value) {
				return await initializeWorkspaceForNewWorkflow();
			}

			// Check if we should initialize for a new workflow
			if (isNewWorkflowRoute.value) {
				const exists = await workflowsListStore.checkWorkflowExists(workflowId.value);
				if (!exists && route.meta?.nodeView === true) {
					return await initializeWorkspaceForNewWorkflow();
				} else {
					await router.replace({
						...route,
						query: {
							...route.query,
							new: undefined,
						},
					});
				}
			}

			// Load existing workflow
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

	await workflowState.getNewWorkflowDataAndMakeShareable(
		undefined,
		projectsStore.currentProjectId,
		parentFolderId,
	);

	// Set the workflow ID from the route params (auto-generated by router)
	workflowState.setWorkflowId(workflowId.value);

	await projectsStore.refreshCurrentProject();
	await fetchAndSetParentFolder(parentFolderId);

	uiStore.nodeViewInitialized = true;
	initializedWorkflowId.value = workflowId.value;

	fitView();
}

async function initializeWorkspaceForExistingWorkflow(id: string) {
	try {
		const workflowData = await workflowsListStore.fetchWorkflow(id);

		await openWorkflow(workflowData);

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

		if (workflowData.meta?.templateId?.startsWith('37_onboarding_experiments_batch_aug11')) {
			readyToRunWorkflowsStore.trackOpenWorkflow(
				workflowData.meta.templateId.split('-').pop() ?? '',
			);
		}

		await projectsStore.setProjectNavActiveIdByWorkflowHomeProject(
			workflowData.homeProject,
			workflowData.sharedWithProjects,
		);
		void workflowsStore.fetchLastSuccessfulExecution();
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

async function openWorkflow(data: IWorkflowDb) {
	resetWorkspace();
	// Show AI_BUILDING status if builder is actively streaming, otherwise IDLE
	if (builderStore.streaming) {
		documentTitle.setDocumentTitle(data.name, 'AI_BUILDING');
	} else {
		documentTitle.setDocumentTitle(data.name, 'IDLE');
	}

	await initializeWorkspace(data);

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
 * Nodes
 */

const triggerNodes = computed(() => {
	return editableWorkflow.value.nodes.filter((node) => nodeTypesStore.isTriggerNode(node.type));
});

const containsTriggerNodes = computed(() => triggerNodes.value.length > 0);

const allTriggerNodesDisabled = computed(() => {
	const disabledTriggerNodes = triggerNodes.value.filter((node) => node.disabled);
	return disabledTriggerNodes.length === triggerNodes.value.length;
});

function onTidyUp(
	event: CanvasLayoutEvent,
	options?: {
		trackEvents?: boolean;
		trackHistory?: boolean;
		trackBulk?: boolean;
	},
) {
	tidyUp(event, options);
}

function onExtractWorkflow(nodeIds: string[]) {
	extractWorkflow(nodeIds);
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

	setNodeActive(id, 'canvas_default_view');
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
	const ids = result.nodes?.map((node) => node.id) ?? [];

	canvasRef.value?.ensureNodesAreVisible(ids);
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

	canvasRef.value?.ensureNodesAreVisible(newIds);
}

function onPinNodes(ids: string[], source: PinDataSource) {
	if (!checkIfEditingIsAllowed()) {
		return;
	}

	toggleNodesPinned(ids, source);
}

function onContextMenuAction(action: ContextMenuAction, nodeIds: string[]) {
	canvasRef.value?.executeContextMenuAction(action, nodeIds);
}

function addWorkflowSavedEventBindings() {
	canvasEventBus.on('saved:workflow', npsSurveyStore.showNpsSurveyIfPossible);
}

function removeWorkflowSavedEventBindings() {
	canvasEventBus.off('saved:workflow', npsSurveyStore.showNpsSurveyIfPossible);
	canvasEventBus.off('saved:workflow', onSaveFromWithinExecutionDebug);
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

	if (activeElement && shouldIgnoreCanvasShortcut(activeElement)) {
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

	if (workflowId.value && !isNewWorkflowRoute.value) {
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

	await initializeWorkspace({
		...workflowData,
		nodes: getNodesWithNormalizedPosition<INodeUi>(workflowData.nodes),
	} as IWorkflowDb);

	fitView();
}

async function onImportWorkflowDataEvent(data: IDataObject) {
	const workflowData = data.data as WorkflowDataUpdate;
	const trackEvents = typeof data.trackEvents === 'boolean' ? data.trackEvents : undefined;
	const setStateDirty = typeof data.setStateDirty === 'boolean' ? data.setStateDirty : undefined;

	await importWorkflowData(workflowData, 'file', {
		viewport: viewportBoundaries.value,
		regenerateIds: data.regenerateIds === true || data.regenerateIds === undefined,
		trackEvents,
		setStateDirty,
	});

	await nextTick();
	fitView();

	selectNodes(workflowData.nodes?.map((node) => node.id) ?? []);
	if (data.tidyUp) {
		const nodesIdsToTidyUp = data.nodesIdsToTidyUp as string[];
		setTimeout(async () => {
			canvasEventBus.emit('tidyUp', {
				source: 'import-workflow-data',
				nodeIdsFilter: nodesIdsToTidyUp,
				trackEvents,
			});

			await nextTick();
			fitView();
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

	canvasRef.value?.ensureNodesAreVisible(workflowData.nodes?.map((node) => node.id) ?? []);
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
const nodeCreatorReplaceTargetId = ref<string | undefined>(undefined);

function onNodeCreatorClose() {
	nodeCreatorReplaceTargetId.value = undefined;
}

async function onAddNodesAndConnections(
	{ nodes, connections }: AddedNodesAndConnections,
	dragAndDrop = false,
	position?: XYPosition,
) {
	if (!checkIfEditingIsAllowed()) {
		return;
	}

	if (nodeCreatorReplaceTargetId.value !== undefined) {
		uiStore.resetLastInteractedWith();

		nodes = nodes.map((x) => ({
			...x,
			openDetail: false,
		}));
	}

	const { addedNodes } = await addNodesAndConnections(nodes, connections, {
		dragAndDrop,
		position,
		viewport: viewportBoundaries.value,
		telemetry: true,
		replaceNodeId: nodeCreatorReplaceTargetId.value,
	});

	if (addedNodes.length > 0) {
		const lastAddedNodeId = addedNodes[addedNodes.length - 1].id;
		selectNodes([lastAddedNodeId]);
	}
}

async function onRevertAddNode({ node }: { node: INodeUi }) {
	await revertAddNode(node.name);
}

function onSwitchActiveNode(nodeName: string) {
	const node = workflowsStore.getNodeByName(nodeName);
	if (!node) return;

	setNodeActiveByName(nodeName, 'other');
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

	if (!options.createNodeActive) {
		nodeCreatorReplaceTargetId.value = undefined;
		if (!options.hasAddedNodes) uiStore.resetLastInteractedWith();
	}
}

function onOpenNodeCreatorFromCanvas(source: NodeCreatorOpenSource) {
	onToggleNodeCreator({ createNodeActive: true, source });
}

function onOpenNodeCreatorForTriggerNodes(source: NodeCreatorOpenSource) {
	nodeCreatorStore.openNodeCreatorForTriggerNodes(source);
}

function onToggleFocusPanel() {
	focusPanelStore.toggleFocusPanel();
	telemetry.track(`User ${focusPanelStore.focusPanelActive ? 'opened' : 'closed'} focus panel`, {
		source: 'canvasKeyboardShortcut',
		parameters: focusPanelStore.focusedNodeParametersInTelemetryFormat,
		parameterCount: focusPanelStore.focusedNodeParametersInTelemetryFormat.length,
	});
}

function closeNodeCreator() {
	if (nodeCreatorStore.isCreateNodeActive) {
		nodeCreatorStore.isCreateNodeActive = false;
	}
}

function onCreateSticky() {
	void onAddNodesAndConnections({ nodes: [{ type: STICKY_NODE_TYPE }], connections: [] });
}

function onClickConnectionAdd(connection: Connection) {
	const { type, mode } = parseCanvasConnectionHandleString(connection.sourceHandle);
	const isAddBetwenTool =
		type === NodeConnectionTypes.AiTool && mode === CanvasConnectionMode.Output;
	if (isAddBetwenTool) {
		nodeCreatorStore.openNodeCreatorForConnectingNode({
			connection,
			eventSource: NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
			nodeCreatorView: HUMAN_IN_THE_LOOP_CATEGORY,
		});
	} else {
		nodeCreatorStore.openNodeCreatorForConnectingNode({
			connection,
			eventSource: NODE_CREATOR_OPEN_SOURCES.NODE_CONNECTION_ACTION,
		});
	}
}

function onClickReplaceNode(nodeId: string) {
	const node = workflowsStore.getNodeById(nodeId);
	if (!node) return;
	const nodeType = nodeTypesStore.getNodeType(node.type);
	if (!nodeType) return;

	nodeCreatorReplaceTargetId.value = nodeId;
	if (isTriggerNode(nodeType)) {
		nodeCreatorStore.openNodeCreatorForTriggerNodes(NODE_CREATOR_OPEN_SOURCES.REPLACE_NODE_ACTION);
	} else {
		const inputs = NodeHelpers.getNodeInputs(editableWorkflowObject.value, node, nodeType).map(
			(output) => (typeof output === 'string' ? output : output.type),
		);
		const outputs = NodeHelpers.getNodeOutputs(editableWorkflowObject.value, node, nodeType).map(
			(output) => (typeof output === 'string' ? output : output.type),
		);

		// We want to infer a matching filter to show, e.g. when swapping out tools
		// But without direct identification on various node types
		// Our best bet is to rely in input and/or output types, and defaulting
		// back to showing all nodes in edge cases
		if (inputs[0] && outputs[0] && inputs[0] !== outputs[0]) {
			nodeCreatorStore.openNodeCreatorForRegularNodes(
				NODE_CREATOR_OPEN_SOURCES.REPLACE_NODE_ACTION,
			);
		} else {
			nodeCreatorStore.openSelectiveNodeCreator({
				connectionType: inputs[0] ?? outputs[0],
				node: node.name,
			});
		}
	}
}

/**
 * Permissions
 */

const workflowPermissions = computed(() => {
	return workflowId.value
		? getResourcePermissions(workflowsListStore.getWorkflowById(workflowId.value)?.scopes).workflow
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

		void runWorkflow({
			destinationNode: { nodeName: node.name, mode: 'inclusive' },
			source: 'Node.executeNode',
		});
	}
}
async function copyWebhookUrl(id: string, webhookType: 'test' | 'production') {
	const webhookUrl = await workflowsStore.getWebhookUrl(id, webhookType);
	if (!webhookUrl) return;

	void clipboard.copy(webhookUrl);

	toast.showMessage({
		title: i18n.baseText('nodeWebhooks.showMessage.title'),
		type: 'success',
	});
}

async function onCopyTestUrl(id: string) {
	const node = workflowsStore.getNodeById(id);
	const isProductionOnly = PRODUCTION_ONLY_TRIGGER_NODE_TYPES.includes(node?.type ?? '');

	if (isProductionOnly) {
		toast.showMessage({
			title: i18n.baseText('nodeWebhooks.showMessage.testWebhookUrl'),
			type: 'warning',
		});
		return;
	}

	void copyWebhookUrl(id, 'test');
}

async function onCopyProductionUrl(id: string) {
	const isWorkflowActive = workflowsStore.workflow.active;
	if (!isWorkflowActive) {
		toast.showMessage({
			title: i18n.baseText('nodeWebhooks.showMessage.not.active'),
			type: 'warning',
		});
		return;
	}
	void copyWebhookUrl(id, 'production');
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
			projectsStore.getAvailableProjects(),
		]);

		if (workflowId.value && !uiStore.stateIsDirty) {
			const workflowData = await workflowsListStore.fetchWorkflow(workflowId.value);
			if (workflowData) {
				await openWorkflow(workflowData);
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
 * Command bar
 * */
function addCommandBarEventBindings() {
	canvasEventBus.on('create:sticky', onCreateSticky);
}

function removeCommandBarEventBindings() {
	canvasEventBus.off('create:sticky', onCreateSticky);
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
				// Set the project if provided from the parent window
				if (json.projectId) {
					await projectsStore.fetchAndSetProject(json.projectId);
				}
				await importWorkflowExact(json);
				canOpenNDV.value = json.canOpenNDV ?? true;
				hideNodeIssues.value = json.hideNodeIssues ?? false;
				isExecutionPreview.value = false;

				// Apply tidy-up if requested
				if (json.tidyUp === true) {
					canvasEventBus.emit('tidyUp', { source: 'import-workflow-data' });
				}
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
				// Set the project if provided from the parent window
				if (json.projectId) {
					await projectsStore.fetchAndSetProject(json.projectId);
				}
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

	if (!(workflowPermissions.value.update ?? projectPermissions.value.workflow.update)) {
		return false;
	}

	if (collaborationStore.shouldBeReadOnly) {
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
			uiStore.markStateClean();

			await router.replace({ name: VIEWS.HOMEPAGE });
		});
	}
}

/**
 * Debug mode
 */

async function initializeDebugMode() {
	documentTitle.setDocumentTitle(workflowsStore.workflowName, 'DEBUG');

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
			setNodeActiveByName(node, 'other');
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
			ndvStore.unsetActiveNodeName();

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

async function handlePendingBuilderPrompt() {
	const pendingPrompt = emptyStateBuilderPromptStore.consumePendingPrompt();
	if (pendingPrompt) {
		await chatPanelStore.open({ mode: 'builder', showCoachmark: false });
		await builderStore.sendChatMessage({
			text: pendingPrompt,
			initialGeneration: true,
			source: 'empty-state',
		});
	}
}

/**
 * Routing
 */

function updateNodeRoute(nodeId: string) {
	const nodeUi = workflowsStore.findNodeByPartialId(nodeId);
	if (nodeUi) {
		setNodeActive(nodeUi.id, 'other');
	} else {
		toast.showToast({
			title: i18n.baseText('nodeView.showMessage.ndvUrl.missingNodes.title'),
			message: i18n.baseText('nodeView.showMessage.ndvUrl.missingNodes.content'),
			type: 'warning',
		});
		void router.replace({
			name: route.name,
			params: { name: workflowId.value },
			query: route.query,
		});
	}
}

watch(
	[() => route.name, () => route.params.name],
	async ([newRouteName, newWorkflowId], [oldRouteName, oldWorkflowId]) => {
		// When navigating from an existing workflow to a new workflow or the other way around we should load the new workflow
		const force =
			(newRouteName === VIEWS.NEW_WORKFLOW && oldRouteName === VIEWS.WORKFLOW) ||
			(newRouteName === VIEWS.WORKFLOW && oldRouteName === VIEWS.NEW_WORKFLOW) ||
			newWorkflowId !== oldWorkflowId;

		await initializeRoute(force);
	},
);

watch(
	() => {
		return isLoading.value || isCanvasReadOnly.value || editableWorkflow.value.nodes.length !== 0;
	},
	(isReadOnlyOrLoading) => {
		if (isReadOnlyOrLoading) {
			fallbackNodes.value = [];
			return;
		}

		const addNodesItem: INodeUi = {
			id: CanvasNodeRenderType.AddNodes,
			name: CanvasNodeRenderType.AddNodes,
			type: CanvasNodeRenderType.AddNodes,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		const choicePromptItem: INodeUi = {
			id: CanvasNodeRenderType.ChoicePrompt,
			name: CanvasNodeRenderType.ChoicePrompt,
			type: CanvasNodeRenderType.ChoicePrompt,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			draggable: false,
		};

		fallbackNodes.value = builderStore.isAIBuilderEnabled ? [choicePromptItem] : [addNodesItem];
	},
);

// This keeps the selected node in sync if the URL is updated
watch(
	() => route.params.nodeId,
	async (newId) => {
		if (typeof newId !== 'string' || newId === '') ndvStore.unsetActiveNodeName();
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
				query: route.query,
			});
		}
	},
);

// Acquire write access when user makes first edit, and trigger auto-save
watch(
	() => uiStore.dirtyStateSetCount,
	(dirtyStateSetCount) => {
		if (dirtyStateSetCount > 0) {
			// Skip write access and auto-save in demo mode
			if (isDemoRoute.value) return;

			collaborationStore.requestWriteAccess();

			// Trigger auto-save (debounced) for writers only
			// Skip auto-save when AI Builder is streaming to keep version history clean
			if (!builderStore.streaming) {
				void workflowSaving.autoSaveWorkflow();
			}
		}
	},
);

// Trigger auto-save when AI Builder streaming ends with unsaved changes
watch(
	() => builderStore.streaming,
	(isStreaming, wasStreaming) => {
		// Only trigger when streaming just ended (was streaming, now not)
		if (wasStreaming && !isStreaming) {
			// Trigger auto-save if there are unsaved changes
			if (uiStore.stateIsDirty && !collaborationStore.shouldBeReadOnly) {
				void workflowSaving.autoSaveWorkflow();
			}
		}
	},
);

onBeforeRouteLeave(async (to, from, next) => {
	// Close the focus panel when leaving the workflow view
	if (focusPanelStore.focusPanelActive) {
		focusPanelStore.closeFocusPanel();
	}

	if (isReadOnlyEnvironment.value) {
		next();
		return;
	}

	const toNodeViewTab = getNodeViewTab(to);
	const isNavigatingBetweenWorkflows =
		[VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW].includes(from.name as VIEWS) &&
		[VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW].includes(to.name as VIEWS) &&
		from.params.name !== to.params.name;

	const shouldSkipPrompt =
		toNodeViewTab === MAIN_HEADER_TABS.EXECUTIONS ||
		from.name === VIEWS.TEMPLATE_IMPORT ||
		(toNodeViewTab === MAIN_HEADER_TABS.WORKFLOW && from.name === VIEWS.EXECUTION_DEBUG);

	if (shouldSkipPrompt && !isNavigatingBetweenWorkflows) {
		next();
		return;
	}

	await useWorkflowSaving({ router }).promptSaveUnsavedWorkflowChanges(next, {
		async confirm() {
			if (from.name === VIEWS.NEW_WORKFLOW) {
				const savedWorkflowId = workflowsStore.workflowId;
				await router.replace({
					name: VIEWS.WORKFLOW,
					params: { name: savedWorkflowId },
				});
				await router.push(to);
				return false;
			}
			workflowState.setWorkflowId('');
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

	// Register callback for collaboration store to refresh canvas when workflow updates arrive
	collaborationStore.setRefreshCanvasCallback(async (workflow) => {
		// Refresh the canvas with updated workflow
		await initializeWorkspace(workflow);
	});

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

				// Check for pending builder prompt from empty state experiment
				void handlePendingBuilderPrompt();
			});

		void usersStore.showPersonalizationSurvey();

		checkIfRouteIsAllowed();
	});

	addSourceControlEventBindings();
	addWorkflowSavedEventBindings();
	addBeforeUnloadEventBindings();
	addImportEventBindings();
	addExecutionOpenedEventBindings();
	addCommandBarEventBindings();
	registerCustomActions();
});

onActivated(() => {
	addUndoRedoEventBindings();
	showAddFirstStepIfEnabled();
});

onDeactivated(() => {
	uiStore.closeModal(WORKFLOW_SETTINGS_MODAL_KEY);
	removeUndoRedoEventBindings();
	toast.clearAllStickyNotifications();
});

onBeforeUnmount(() => {
	removeSourceControlEventBindings();
	removePostMessageEventBindings();
	removeWorkflowSavedEventBindings();
	removeBeforeUnloadEventBindings();
	removeImportEventBindings();
	removeExecutionOpenedEventBindings();
	removeCommandBarEventBindings();
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
			ref="canvas"
			:workflow="editableWorkflow"
			:workflow-object="editableWorkflowObject"
			:fallback-nodes="fallbackNodes"
			:show-fallback-nodes="showFallbackNodes"
			:event-bus="canvasEventBus"
			:read-only="isCanvasReadOnly"
			:executing="isWorkflowRunning"
			:key-bindings="keyBindingsEnabled"
			:suppress-interaction="experimentalNdvStore.isMapperOpen"
			:hide-controls="hideCanvasControls"
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
			@copy:production:url="onCopyProductionUrl"
			@copy:test:url="onCopyTestUrl"
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
			@replace:node="onClickReplaceNode"
			@run:workflow="runEntireWorkflow('main')"
			@create:workflow="onCreateWorkflow"
			@viewport:change="onViewportChange"
			@selection:end="onSelectionEnd"
			@drag-and-drop="onDragAndDrop"
			@tidy-up="onTidyUp"
			@toggle:focus-panel="onToggleFocusPanel"
			@extract-workflow="onExtractWorkflow"
			@start-chat="startChat()"
		>
			<Suspense v-if="!isCanvasReadOnly">
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

			<N8nCanvasCollaborationPill
				v-if="collaborationStore.currentWriter && !collaborationStore.isCurrentUserWriter"
				:first-name="collaborationStore.currentWriter.user.firstName"
				:last-name="collaborationStore.currentWriter.user.lastName"
				:class="$style.canvasCenterPill"
			/>

			<N8nCanvasThinkingPill
				v-if="builderStore.streaming"
				:class="$style.canvasCenterPill"
				show-stop
				@stop="builderStore.abortStreaming"
			/>

			<Suspense>
				<LazyNodeCreation
					v-if="!isCanvasReadOnly"
					:create-node-active="nodeCreatorStore.isCreateNodeActive"
					:node-view-scale="viewportTransform.zoom"
					:focus-panel-active="focusPanelStore.focusPanelActive"
					@toggle-node-creator="onToggleNodeCreator"
					@add-nodes="onAddNodesAndConnections"
					@close="onNodeCreatorClose"
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
				/>
			</Suspense>
		</WorkflowCanvas>
		<FocusPanel
			v-if="
				!isLoading && (experimentalNdvStore.isNdvInFocusPanelEnabled ? !isCanvasReadOnly : true)
			"
			:is-canvas-read-only="isCanvasReadOnly"
			@context-menu-action="onContextMenuAction"
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
	bottom: var(--spacing--sm);
	width: auto;

	@include mixins.breakpoint('sm-only') {
		left: auto;
		right: var(--spacing--sm);
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
	left: var(--spacing--sm);
	top: var(--spacing--sm);
}

.readOnlyEnvironmentNotification {
	position: absolute;
	bottom: 16px;
	left: 50%;
	transform: translateX(-50%);
}

.canvasCenterPill {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	z-index: 10;
}
</style>
