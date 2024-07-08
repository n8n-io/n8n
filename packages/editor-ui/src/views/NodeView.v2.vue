<script setup lang="ts">
import {
	computed,
	defineAsyncComponent,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	onMounted,
	ref,
	useCssModule,
} from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
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
	IWorkflowDb,
	ToggleNodeCreatorOptions,
	XYPosition,
} from '@/Interface';
import type { Connection } from '@vue-flow/core';
import type { CanvasElement } from '@/types';
import {
	CANVAS_AUTO_ADD_MANUAL_TRIGGER_EXPERIMENT,
	EnterpriseEditionFeature,
	MAIN_HEADER_TABS,
	MODAL_CANCEL,
	MODAL_CONFIRM,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	VIEWS,
} from '@/constants';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { TelemetryHelpers } from 'n8n-workflow';
import type {
	NodeConnectionType,
	ExecutionSummary,
	IConnection,
	IWorkflowBase,
} from 'n8n-workflow';
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
import { useTitleChange } from '@/composables/useTitleChange';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useTelemetry } from '@/composables/useTelemetry';
import { useHistoryStore } from '@/stores/history.store';
import { useProjectsStore } from '@/stores/projects.store';
import { usePostHog } from '@/stores/posthog.store';
import useWorkflowsEEStore from '@/stores/workflows.ee.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useExecutionDebugging } from '@/composables/useExecutionDebugging';
import type { ProjectSharingData } from '@/types/projects.types';
import { useUsersStore } from '@/stores/users.store';
import { sourceControlEventBus } from '@/event-bus/source-control';
import { useTagsStore } from '@/stores/tags.store';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { getNodeViewTab } from '@/utils/canvasUtils';

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
const telemetry = useTelemetry();
const externalHooks = useExternalHooks();
const toast = useToast();
const message = useMessage();
const titleChange = useTitleChange();
const workflowHelpers = useWorkflowHelpers({ router });
const nodeHelpers = useNodeHelpers();
const posthog = usePostHog();

const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const workflowsEEStore = useWorkflowsEEStore();
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

const lastClickPosition = ref<XYPosition>([450, 450]);

const { runWorkflow } = useRunWorkflow({ router });
const {
	updateNodePosition,
	renameNode,
	revertRenameNode,
	setNodeActive,
	setNodeSelected,
	toggleNodeDisabled,
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
} = useCanvasOperations({ router, lastClickPosition });
const { applyExecutionData } = useExecutionDebugging();

const isLoading = ref(true);
const isBlankRedirect = ref(false);
const readOnlyNotification = ref<null | { visible: boolean }>(null);

const isProductionExecutionPreview = ref(false);
const isExecutionPreview = ref(false);
const isExecutionWaitingForWebhook = ref(false);

const canOpenNDV = ref(true);
const hideNodeIssues = ref(false);

const workflowId = computed<string>(() => route.params.name as string);
const workflow = computed(() => workflowsStore.workflowsById[workflowId.value]);

const isNewWorkflowRoute = computed(() => route.name === VIEWS.NEW_WORKFLOW);
const isDemoRoute = computed(() => route.name === VIEWS.DEMO);
const isReadOnlyRoute = computed(() => route?.meta?.readOnlyCanvas === true);
const isReadOnlyEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});

/**
 * Initialization
 */

async function initializeData() {
	isLoading.value = true;
	canvasStore.startLoading();

	resetWorkspace();
	titleChange.titleReset();

	const loadPromises = (() => {
		if (settingsStore.isPreviewMode && isDemoRoute.value) return [];

		const promises: Array<Promise<unknown>> = [
			workflowsStore.fetchActiveWorkflows(),
			credentialsStore.fetchAllCredentials(),
			credentialsStore.fetchCredentialTypes(true),
		];

		if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Variables)) {
			promises.push(environmentsStore.fetchAllVariables());
		}

		if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.ExternalSecrets)) {
			promises.push(externalSecretsStore.fetchAllSecrets());
		}

		if (nodeTypesStore.allNodeTypes.length === 0) {
			promises.push(nodeTypesStore.getNodeTypes());
		}

		return promises;
	})();

	// @TODO Implement this
	// this.clipboard.onPaste.value = this.onClipboardPasteEvent;

	try {
		await Promise.all(loadPromises);
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('nodeView.showError.mounted1.title'),
			i18n.baseText('nodeView.showError.mounted1.message') + ':',
		);
		return;
	} finally {
		canvasStore.stopLoading();
		isLoading.value = false;
	}

	setTimeout(() => {
		void usersStore.showPersonalizationSurvey();
	}, 0);

	// @TODO: This currently breaks since front-end hooks are still not updated to work with pinia store
	void externalHooks.run('nodeView.mount').catch(() => {});

	// @TODO maybe we can find a better way to handle this
	canvasStore.isDemo = isDemoRoute.value;
}

async function initializeView() {
	// In case the workflow got saved we do not have to run init
	// as only the route changed but all the needed data is already loaded
	if (route.params.action === 'workflowSave') {
		uiStore.stateIsDirty = false;
		return;
	}

	// This function is called on route change as well, so we need to do the following:
	// - if the redirect is blank, then do nothing
	// - if the route is the template import view, then open the template
	// - if the user is leaving the current view without saving the changes, then show a confirmation modal
	if (isBlankRedirect.value) {
		isBlankRedirect.value = false;
	} else if (route.name === VIEWS.TEMPLATE_IMPORT) {
		// @TODO Implement template import
		// const templateId = route.params.id;
		// await openWorkflowTemplate(templateId.toString());
	} else {
		historyStore.reset();

		// If there is no workflow id, treat it as a new workflow
		if (!workflowId.value || isNewWorkflowRoute.value) {
			if (route.meta?.nodeView === true) {
				await initializeViewForNewWorkflow();
			}
			return;
		}

		// Load workflow data
		try {
			await workflowsStore.fetchWorkflow(workflowId.value);

			titleChange.titleSet(workflow.value.name, 'IDLE');
			await openWorkflow(workflow.value);
			await checkAndInitDebugMode();

			trackOpenWorkflowFromOnboardingTemplate();
		} catch (error) {
			toast.showError(error, i18n.baseText('openWorkflow.workflowNotFoundError'));

			void router.push({
				name: VIEWS.NEW_WORKFLOW,
			});
		}
	}

	nodeHelpers.updateNodesInputIssues();
	nodeHelpers.updateNodesCredentialsIssues();
	nodeHelpers.updateNodesParameterIssues();

	await loadCredentials();

	uiStore.nodeViewInitialized = true;

	// Once view is initialized, pick up all toast notifications
	// waiting in the store and display them
	toast.showNotificationForViews([VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW]);
}

async function initializeViewForNewWorkflow() {
	resetWorkspace();

	await workflowsStore.getNewWorkflowData(undefined, projectsStore.currentProjectId);

	workflowsStore.currentWorkflowExecutions = [];
	executionsStore.activeExecution = null;
	uiStore.stateIsDirty = false;
	uiStore.nodeViewInitialized = true;
	executionsStore.activeExecution = null;

	makeNewWorkflowShareable();
	await runAutoAddManualTriggerExperiment();
}

/**
 * Pre-populate the canvas with the manual trigger node
 * if the experiment is enabled and the user is in the variant group
 */
async function runAutoAddManualTriggerExperiment() {
	if (
		posthog.getVariant(CANVAS_AUTO_ADD_MANUAL_TRIGGER_EXPERIMENT.name) !==
		CANVAS_AUTO_ADD_MANUAL_TRIGGER_EXPERIMENT.variant
	) {
		return;
	}

	const manualTriggerNode = canvasStore.getAutoAddManualTriggerNode();
	if (manualTriggerNode) {
		await addNodes([manualTriggerNode]);
		uiStore.lastSelectedNode = manualTriggerNode.name;
	}
}

function resetWorkspace() {
	onToggleNodeCreator({ createNodeActive: false });
	nodeCreatorStore.setShowScrim(false);

	// Make sure that if there is a waiting test-webhook that it gets removed
	if (isExecutionWaitingForWebhook.value) {
		try {
			void workflowsStore.removeTestWebhook(workflowsStore.workflowId);
		} catch (error) {}
	}
	workflowsStore.resetWorkflow();
	workflowsStore.resetState();

	uiStore.removeActiveAction('workflowRunning');
	uiStore.resetSelectedNodes();
	uiStore.nodeViewOffsetPosition = [0, 0]; // @TODO Not sure if needed

	// this.credentialsUpdated = false;
}

/**
 * Workflow
 */

async function openWorkflow(data: IWorkflowDb) {
	const selectedExecution = executionsStore.activeExecution;

	resetWorkspace();

	await workflowHelpers.initState(data, true);

	if (data.sharedWithProjects) {
		workflowsEEStore.setWorkflowSharedWith({
			workflowId: data.id,
			sharedWithProjects: data.sharedWithProjects,
		});
	}

	if (data.usedCredentials) {
		workflowsStore.setUsedCredentials(data.usedCredentials);
	}

	if (!nodeHelpers.credentialsUpdated.value) {
		uiStore.stateIsDirty = false;
	}

	void externalHooks.run('workflow.open', {
		workflowId: data.id,
		workflowName: data.name,
	});

	if (selectedExecution?.workflowId !== data.id) {
		executionsStore.activeExecution = null;
		workflowsStore.currentWorkflowExecutions = [];
	} else {
		executionsStore.activeExecution = selectedExecution;
	}

	await projectsStore.setProjectNavActiveIdByWorkflowHomeProject(workflow.value.homeProject);
}

function trackOpenWorkflowFromOnboardingTemplate() {
	if (workflow.value.meta?.onboardingId) {
		telemetry.track(
			`User opened workflow from onboarding template with ID ${workflow.value.meta.onboardingId}`,
			{
				workflow_id: workflowId.value,
			},
			{
				withPostHog: true,
			},
		);
	}
}

function makeNewWorkflowShareable() {
	const { currentProject, personalProject } = projectsStore;
	const homeProject = currentProject ?? personalProject ?? {};
	const scopes = currentProject?.scopes ?? personalProject?.scopes ?? [];

	workflowsStore.workflow.homeProject = homeProject as ProjectSharingData;
	workflowsStore.workflow.scopes = scopes;
}

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

function onToggleNodeDisabled(id: string) {
	if (!checkIfEditingIsAllowed()) {
		return;
	}

	toggleNodeDisabled(id);
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
 * Credentials
 */

async function loadCredentials() {
	let options: { workflowId: string } | { projectId: string };

	if (workflow.value) {
		options = { workflowId: workflow.value.id };
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
	trackRunWorkflow();

	await runWorkflow({});
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

async function openExecution(_executionId: string) {
	// @TODO
}

/**
 * Keboard
 */

function addKeyboardEventBindings() {
	// document.addEventListener('keydown', this.keyDown);
	// document.addEventListener('keyup', this.keyUp);
}

function removeKeyboardEventBindings() {
	// document.removeEventListener('keydown', this.keyDown);
	// document.removeEventListener('keyup', this.keyUp);
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
 * Source control
 */

async function onSourceControlPull() {
	try {
		await Promise.all([
			environmentsStore.fetchAllVariables(),
			tagsStore.fetchAll(),
			loadCredentials(),
		]);

		if (workflowId.value !== null && !uiStore.stateIsDirty) {
			const workflowData = await workflowsStore.fetchWorkflow(workflowId.value);
			if (workflowData) {
				titleChange.titleSet(workflowData.name, 'IDLE');
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
 * Post message events
 */

function addPostMessageEventBindings() {
	window.addEventListener('message', onPostMessageReceived);

	if (window.parent) {
		window.parent.postMessage(
			JSON.stringify({ command: 'n8nReady', version: rootStore.versionCli }),
			'*',
		);
	}
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

async function checkAndInitDebugMode() {
	if (route.name === VIEWS.EXECUTION_DEBUG) {
		titleChange.titleSet(workflowsStore.workflowName, 'DEBUG');
		if (!workflowsStore.isInDebugMode) {
			await applyExecutionData(route.params.executionId as string);
			workflowsStore.isInDebugMode = true;
		}
	}
}

/**
 * Mouse events
 */

function onClickPane(position: CanvasElement['position']) {
	lastClickPosition.value = [position.x, position.y];
	canvasStore.newNodeInsertPosition = [position.x, position.y];
}

/**
 * Custom Actions
 */

function registerCustomActions() {
	// @TODO Implement these
	// this.registerCustomAction({
	// 	key: 'openNodeDetail',
	// 	action: ({ node }: { node: string }) => {
	// 		this.nodeSelectedByName(node, true);
	// 	},
	// });
	//
	// this.registerCustomAction({
	// 	key: 'openSelectiveNodeCreator',
	// 	action: this.openSelectiveNodeCreator,
	// });
	//
	// this.registerCustomAction({
	// 	key: 'showNodeCreator',
	// 	action: () => {
	// 		this.ndvStore.activeNodeName = null;
	//
	// 		void this.$nextTick(() => {
	// 			this.showTriggerCreator(NODE_CREATOR_OPEN_SOURCES.TAB);
	// 		});
	// 	},
	// });
}

/**
 * Routing
 */

onBeforeRouteLeave(async (to, from, next) => {
	const toNodeViewTab = getNodeViewTab(to);

	if (
		toNodeViewTab === MAIN_HEADER_TABS.EXECUTIONS ||
		from.name === VIEWS.TEMPLATE_IMPORT ||
		(toNodeViewTab === MAIN_HEADER_TABS.WORKFLOW && from.name === VIEWS.EXECUTION_DEBUG)
	) {
		next();
		return;
	}

	if (uiStore.stateIsDirty && !isReadOnlyEnvironment.value) {
		const confirmModal = await message.confirm(
			i18n.baseText('generic.unsavedWork.confirmMessage.message'),
			{
				title: i18n.baseText('generic.unsavedWork.confirmMessage.headline'),
				type: 'warning',
				confirmButtonText: i18n.baseText('generic.unsavedWork.confirmMessage.confirmButtonText'),
				cancelButtonText: i18n.baseText('generic.unsavedWork.confirmMessage.cancelButtonText'),
				showClose: true,
			},
		);

		if (confirmModal === MODAL_CONFIRM) {
			// Make sure workflow id is empty when leaving the editor
			workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
			const saved = await workflowHelpers.saveCurrentWorkflow({}, false);
			if (saved) {
				await npsSurveyStore.fetchPromptsData();
			}
			uiStore.stateIsDirty = false;

			if (from.name === VIEWS.NEW_WORKFLOW) {
				// Replace the current route with the new workflow route
				// before navigating to the new route when saving new workflow.
				await router.replace({
					name: VIEWS.WORKFLOW,
					params: { name: workflowId.value },
				});

				await router.push(to);
			} else {
				next();
			}
		} else if (confirmModal === MODAL_CANCEL) {
			workflowsStore.setWorkflowId(PLACEHOLDER_EMPTY_WORKFLOW_ID);
			resetWorkspace();
			uiStore.stateIsDirty = false;
			next();
		}
	} else {
		next();
	}
});

/**
 * Lifecycle
 */

onBeforeMount(() => {
	if (!isDemoRoute.value) {
		pushConnectionStore.pushConnect();
	}
});

onMounted(async () => {
	void initializeData().then(() => {
		void initializeView();

		checkIfRouteIsAllowed();
	});

	addUndoRedoEventBindings();
	addPostMessageEventBindings();
	addKeyboardEventBindings();
	addSourceControlEventBindings();

	registerCustomActions();
});

onBeforeUnmount(() => {
	removeKeyboardEventBindings();
	removePostMessageEventBindings();
	removeUndoRedoEventBindings();
	removeSourceControlEventBindings();
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
		@update:node:enabled="onToggleNodeDisabled"
		@delete:node="onDeleteNode"
		@create:connection="onCreateConnection"
		@delete:connection="onDeleteConnection"
		@click:pane="onClickPane"
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
				:workflow-object="editableWorkflowObject"
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
