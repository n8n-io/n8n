<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, useTemplateRef } from 'vue';
import {
	StorageSerializers,
	useElementSize,
	useEventListener,
	useLocalStorage,
	useStorage,
} from '@vueuse/core';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import {
	N8nAssistantIcon,
	N8nCanvasPill,
	N8nIcon,
	N8nIconButton,
	N8nResizeWrapper,
	N8nButton,
	N8nTooltip,
	type ActionDropdownItem,
	type ResizeData,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILE_SIZE_MB,
	MAX_AGENT_FILES_PER_UPLOAD,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
	addMissingAgentPersonalisation,
	type AgentFileDto,
	type InstanceAiHandoffContext,
	type PushMessage,
	type PushPayload,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { ResponseError } from '@n8n/rest-api-client';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { MODAL_CONFIRM } from '@/app/constants';
import { AGENT_EXTERNAL_UPDATE_NOTICE_DURATION, TIME } from '@/app/constants/durations';
import { deepCopy } from 'n8n-workflow';
import {
	getAgent,
	createAgent,
	createAgentTask,
	deleteAgent,
	listAgentFiles,
	uploadAgentFiles,
	deleteAgentFile,
	warmAgentKnowledgeSandbox,
	updateAgentSkill,
} from '../composables/useAgentApi';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import type {
	AgentResource,
	AgentContinueLoadedEvent,
	AgentSendToAssistantEvent,
	AgentJsonConfig,
	AgentJsonVectorStoreConfig,
	AgentSkill,
} from '../types';
import { useAgentBuilderTelemetry } from '../composables/useAgentBuilderTelemetry';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useAgentConfig } from '../composables/useAgentConfig';
import { useAgentConfigValidation } from '../composables/useAgentConfigValidation';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import { useAgentSessionsStore } from '../agentSessions.store';
import { useAgentEvalsStore } from '../agentEvals.store';
import { useAgentBuilderSession } from '../composables/useAgentBuilderSession';
import type { AgentExecutionThread } from '../composables/useAgentThreadsApi';
import { useAgentConfigAutosave, type AutosaveResult } from '../composables/useAgentConfigAutosave';
import { useAgentBuilderMainTabs } from '../composables/useAgentBuilderMainTabs';
import { useAgentCapabilitiesActions } from '../composables/useAgentCapabilitiesActions';
import {
	removeProjectAgentFromListCache,
	upsertProjectAgentsListCache,
} from '../composables/useProjectAgentsList';
import type { AgentPreviewHandoffParams } from '@/features/ai/instanceAi/composables/useInstanceAiAgentPreviewHandoff';
import {
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	AGENT_JSON_IMPORT_MODAL_KEY,
	AGENT_VECTOR_STORES_MODAL_KEY,
	ASSISTANT_THREAD_PARAM,
	CONTINUE_SESSION_ID_PARAM,
	NEW_SESSION_PARAM,
	OPEN_PREVIEW_PARAM,
	PENDING_AGENT_ID_STATE,
} from '../constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { agentsEventBus, type AgentUpdatedEvent } from '../agents.eventBus';
import {
	AGENT_TEMPLATES,
	AGENT_TEMPLATE_SUGGESTIONS_VERSION,
	applyAgentTemplate,
	isAgentConfigBlank,
	type AgentTemplate,
} from '../agentTemplates';
import AgentBuilderHeader from '../components/AgentBuilderHeader.vue';
import AgentCollaborationBanner from '../components/AgentCollaborationBanner.vue';
import AgentBuilderEditorColumn from '../components/AgentBuilderEditorColumn.vue';
import AgentBuilderIntro from '../components/AgentBuilderIntro.vue';
import AgentPreviewHeader from '../components/AgentPreviewHeader.vue';
import AgentPreviewChatPage from '../components/AgentPreviewChatPage.vue';
import AgentPreviewDock from '../components/AgentPreviewDock.vue';
import AgentVersionHistoryPanel from '../components/VersionHistory/AgentVersionHistoryPanel.vue';
import {
	buildInstanceAiAgentPreviewHandoffContext,
	type InstanceAiThreadLaunch,
	type PendingComposerDraft,
} from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import {
	useInstanceAiAvailable,
	useInstanceAiReady,
} from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import InstanceAiChatPanel from '@/features/ai/instanceAi/embed/InstanceAiChatPanel.vue';
import { persistPendingAgent } from '@/features/ai/instanceAi/instanceAi.memory.api';
import type { InstanceAiEmbedSubject } from '@/features/ai/instanceAi/embed/instanceAiEmbed.types';
import AgentBuildingIndicator from '@/features/ai/instanceAi/components/AgentBuildingIndicator.vue';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useAgentCollaborationStore } from '../stores/agentCollaboration.store';
import { useActivityDetection } from '@/app/composables/useActivityDetection';
import { buildAgentChangeRequestPrompt } from '../utils/agent-change-request';
import { buildAgentFixWithAssistantPrompt } from '../utils/fix-with-assistant';
import { hasBlockingIssues } from '../utils/validationIssues';

const props = withDefaults(
	defineProps<{
		artifactMode?: boolean;
		artifactProjectId?: string;
		artifactAgentId?: string;
		/** Preview session to restore when this agent opens as an Instance AI artifact. */
		artifactPreviewSessionId?: string;
		/** Controls the preview chat when the builder is inside Instance AI. */
		artifactPreviewOpen?: boolean;
		/** True while the AI is actively building/mutating this agent in artifact mode — disables editing/publishing without hiding content. */
		artifactEditingLocked?: boolean;
		/** True when no agent row exists behind `artifactAgentId` yet — the builder
		 *  renders a local default config and creates the agent on the first edit. */
		artifactAgentPending?: boolean;
		/**
		 * Host-owned persistence for a pending artifact: creates (or adopts) the
		 * agent under the already-minted id AND durably binds it to the host's
		 * surface, resolving only once both are done. Supplied instead of the plain
		 * strict create, so the acknowledgement the builder acts on includes the
		 * binding — a reload can then never re-enter pending mode on an agent that
		 * already exists.
		 */
		artifactPersistAgent?: (name: string) => Promise<AgentResource>;
	}>(),
	{
		artifactMode: false,
		artifactProjectId: undefined,
		artifactAgentId: undefined,
		artifactPreviewSessionId: undefined,
		artifactPreviewOpen: undefined,
		artifactEditingLocked: false,
		artifactAgentPending: false,
		artifactPersistAgent: undefined,
	},
);

const emit = defineEmits<{
	'preview-open-change': [open: boolean];
	/** The agent name was successfully saved. */
	'name-saved': [name: string];
	'assistant-handoff': [params: AgentPreviewHandoffParams];
}>();

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const rootStore = useRootStore();
const pushConnectionStore = usePushConnectionStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const instanceAiAvailable = useInstanceAiAvailable();
const instanceAiReady = useInstanceAiReady();
const sessionsStore = useAgentSessionsStore();
const agentEvalsStore = useAgentEvalsStore();
const credentialsStore = useCredentialsStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const favoritesStore = useFavoritesStore();
const mcpStore = useMCPStore();
const mcp = useMcp();
const agentCollaborationStore = useAgentCollaborationStore();
useActivityDetection(agentCollaborationStore);
const { isCtrlKeyPressed } = useDeviceSupport();

// No design tokens cover these layout widths. Keep the editor usable while the
// two resizable side panels adapt to the available viewport.
const AGENT_BUILDER_EDITOR_MIN_WIDTH = 480;
const AGENT_BUILDER_SIDE_PANEL_MIN_WIDTH = 320;

// Gates the Knowledge Base files table (upload, list, sandbox fetch/warmup) on
// the backend: Daytona sandbox env vars (N8N_AGENTS_AI_SANDBOX_ENABLED +
// PROVIDER=daytona) OR AI Assistant proxy availability. The Knowledge tab and
// vector store management are always available regardless of this flag.
const isKnowledgeBaseEnabled = computed(() => settingsStore.isAgentsKnowledgeBaseFeatureEnabled);
const documentTitle = useDocumentTitle();
const { showError, showMessage } = useToast();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

// Artifact mode reuses this route shell inside Instance AI. It still relies on
// singleton agent session/credential stores, so only one builder shell should
// be mounted at a time.
const isArtifactMode = computed(() => props.artifactMode);
const isStandalonePreview = computed(function isStandalonePreview() {
	return !isArtifactMode.value && route.name === AGENT_PREVIEW_VIEW;
});
const projectId = computed(
	() =>
		(isArtifactMode.value ? props.artifactProjectId : undefined) ??
		(route.params.projectId as string) ??
		projectsStore.personalProject?.id ??
		'',
);
const agentId = computed(
	() =>
		(isArtifactMode.value ? props.artifactAgentId : undefined) ?? (route.params.agentId as string),
);
function readPendingAgentIdFromHistory(): string | null {
	const pendingAgentId = (history.state as Record<string, unknown>)[PENDING_AGENT_ID_STATE];
	return typeof pendingAgentId === 'string' ? pendingAgentId : null;
}
const routePendingAgentId = ref(readPendingAgentIdFromHistory());
const isRouteAgentPending = computed(() => {
	if (isArtifactMode.value) return false;
	return routePendingAgentId.value === agentId.value;
});
const isAgentPending = computed(() => props.artifactAgentPending || isRouteAgentPending.value);
const previewOpenStorageKey = computed(function getPreviewOpenStorageKey() {
	return `N8N_AGENT_PREVIEW_OPEN:${projectId.value}:${agentId.value}`;
});
const persistedPreviewOpen = useStorage(previewOpenStorageKey, false);
const previewDockWidth = ref(480);
const isPreviewDockResizing = ref(false);
const builderContainer = useTemplateRef<HTMLElement>('builderContainer');
const { width: builderContainerWidth } = useElementSize(builderContainer, undefined, {
	box: 'border-box',
});
const isPreviewDockOpen = computed(function isPreviewDockOpen() {
	return !isStandalonePreview.value && persistedPreviewOpen.value;
});
const taskPreviewPrompt = ref<string>();
const isPreviewActive = computed(function isPreviewActive() {
	return isStandalonePreview.value || isPreviewDockOpen.value;
});

// Embedded n8n Assistant panel (left dock, mirrors the preview dock on the right).
// Default open for a pending agent so a new agent lands with the assistant
// already showing; closed otherwise. Persisted per agent, like the preview dock.
// null = no preference yet, so the default is derived instead of stored — see
// `InstanceAiThreadView`'s `persistedArtifactPreviewOpen` for the same pattern.
const aiPanelOpenStorageKey = computed(function getAiPanelOpenStorageKey() {
	return `N8N_AGENT_AI_PANEL_OPEN:${projectId.value}:${agentId.value}`;
});
const storedAiPanelOpen = useLocalStorage<boolean | null>(aiPanelOpenStorageKey, null, {
	serializer: StorageSerializers.boolean,
	writeDefaults: false,
	flush: 'sync',
});
// The pending-agent default is decided once, when the agent opens. Persisting
// the agent later (a real edit, or the assistant finishing a build) flips
// `isRouteAgentPending` to false, which must not close the panel out from
// under the user — so the default is snapshotted per agent instead of reread live.
const openedForPendingAgent = ref(isRouteAgentPending.value);
/** A starter template was applied; latches the intro closed even if a config
 * refetch momentarily restores a blank config. No chip is shown for this. */
const templateApplied = ref(false);
watch([projectId, agentId], () => {
	taskPreviewPrompt.value = undefined;
});
watch(agentId, () => {
	// An in-place agentId change (e.g. "New agent" from the switcher) reuses this
	// component instance, so `history.state` — just updated by that navigation —
	// must be re-read here, before `isRouteAgentPending` (read below, and by the
	// `initialize()` watcher) reflects the new agent instead of the mounted one.
	routePendingAgentId.value = readPendingAgentIdFromHistory();
	openedForPendingAgent.value = isRouteAgentPending.value;
	templateApplied.value = false;
});
const isAiPanelOpen = computed({
	get: () => storedAiPanelOpen.value ?? (openedForPendingAgent.value && instanceAiReady.value),
	set: (value: boolean) => {
		storedAiPanelOpen.value = value;
	},
});
const showAiPanel = computed(
	() =>
		!isArtifactMode.value &&
		!isStandalonePreview.value &&
		instanceAiReady.value &&
		isAiPanelOpen.value,
);
const aiThreadId = computed(() =>
	typeof route.query[ASSISTANT_THREAD_PARAM] === 'string'
		? route.query[ASSISTANT_THREAD_PARAM]
		: undefined,
);
function onAiThreadIdChange(threadId: string) {
	void router.replace({ query: { ...route.query, [ASSISTANT_THREAD_PARAM]: threadId } });
}
/** True while the embedded assistant is actively mutating this agent. */
const embeddedAiBuilding = ref(false);
const embeddedAiProcessing = ref(false);
const aiPanelRef = useTemplateRef<InstanceType<typeof InstanceAiChatPanel>>('aiPanelRef');
// The standalone preview route doesn't render the AI dock (`showAiPanel`
// requires the builder route), so a hand-off requested from there has nowhere
// to land yet. Queue it and apply it once the panel actually mounts — closing
// the preview navigates back to the builder, which renders the panel.
const queuedAiHandoff = ref<{
	context: InstanceAiHandoffContext;
	initialDraft?: PendingComposerDraft;
} | null>(null);
watch(aiPanelRef, (panel) => {
	if (!panel || !queuedAiHandoff.value) return;
	const { context, initialDraft } = queuedAiHandoff.value;
	queuedAiHandoff.value = null;
	panel.handoff(context, initialDraft);
});
const aiPanelWidth = useStorage('N8N_AGENT_AI_PANEL_WIDTH', 400);
type SidePanel = 'assistant' | 'preview';
const preferredSidePanel = ref<SidePanel>('assistant');

function bothSidePanelsFit() {
	if (builderContainerWidth.value === 0) return true;
	return (
		builderContainerWidth.value >=
		AGENT_BUILDER_EDITOR_MIN_WIDTH + AGENT_BUILDER_SIDE_PANEL_MIN_WIDTH * 2
	);
}

const renderedSidePanelWidths = computed(function getRenderedSidePanelWidths() {
	const desiredAiWidth = Math.max(aiPanelWidth.value, AGENT_BUILDER_SIDE_PANEL_MIN_WIDTH);
	const desiredPreviewWidth = Math.max(previewDockWidth.value, AGENT_BUILDER_SIDE_PANEL_MIN_WIDTH);
	const containerWidth = builderContainerWidth.value;
	if (containerWidth === 0) {
		return { ai: desiredAiWidth, preview: desiredPreviewWidth };
	}

	const availableSidePanelWidth = Math.max(
		AGENT_BUILDER_SIDE_PANEL_MIN_WIDTH,
		containerWidth - AGENT_BUILDER_EDITOR_MIN_WIDTH,
	);
	if (showAiPanel.value && !isPreviewDockOpen.value) {
		return {
			ai: Math.min(desiredAiWidth, availableSidePanelWidth),
			preview: desiredPreviewWidth,
		};
	}
	if (!showAiPanel.value && isPreviewDockOpen.value) {
		return {
			ai: desiredAiWidth,
			preview: Math.min(desiredPreviewWidth, availableSidePanelWidth),
		};
	}
	if (!showAiPanel.value || !isPreviewDockOpen.value || !bothSidePanelsFit()) {
		return { ai: desiredAiWidth, preview: desiredPreviewWidth };
	}

	if (desiredAiWidth + desiredPreviewWidth <= availableSidePanelWidth) {
		return { ai: desiredAiWidth, preview: desiredPreviewWidth };
	}

	const availableExtraWidth = availableSidePanelWidth - AGENT_BUILDER_SIDE_PANEL_MIN_WIDTH * 2;
	const desiredAiExtraWidth = desiredAiWidth - AGENT_BUILDER_SIDE_PANEL_MIN_WIDTH;
	const desiredPreviewExtraWidth = desiredPreviewWidth - AGENT_BUILDER_SIDE_PANEL_MIN_WIDTH;
	const desiredExtraWidth = desiredAiExtraWidth + desiredPreviewExtraWidth;
	const renderedAiWidth =
		AGENT_BUILDER_SIDE_PANEL_MIN_WIDTH +
		availableExtraWidth * (desiredAiExtraWidth / desiredExtraWidth);

	return {
		ai: renderedAiWidth,
		preview: availableSidePanelWidth - renderedAiWidth,
	};
});

function keepPreferredSidePanel() {
	if (!showAiPanel.value || !isPreviewDockOpen.value || bothSidePanelsFit()) return;
	if (preferredSidePanel.value === 'preview') {
		isAiPanelOpen.value = false;
		return;
	}
	closePreviewDock();
}

watch(
	showAiPanel,
	(open, wasOpen) => {
		if (open && !wasOpen) preferredSidePanel.value = 'assistant';
	},
	{ flush: 'sync' },
);
watch(
	isPreviewDockOpen,
	(open, wasOpen) => {
		if (open && !wasOpen) preferredSidePanel.value = 'preview';
	},
	{ flush: 'sync' },
);
watch(
	[builderContainerWidth, showAiPanel, isPreviewDockOpen, aiPanelWidth, previewDockWidth],
	keepPreferredSidePanel,
	{ flush: 'post' },
);

function onAiPanelResize({ width }: { width: number }) {
	preferredSidePanel.value = 'assistant';
	aiPanelWidth.value = width;
}
function toggleAiPanel() {
	// Setup isn't finished — send the user to the assistant, where onboarding
	// takes over, instead of opening a panel no model can answer in.
	if (!instanceAiReady.value) {
		void router.push({ name: INSTANCE_AI_VIEW });
		return;
	}
	const opening = !isAiPanelOpen.value;
	if (opening) {
		telemetry.track('Instance AI opened from editor', {
			source: 'agent_builder_page',
			agent_id: agentId.value,
			workflow_id: null,
			execution_id: null,
		});
	}
	isAiPanelOpen.value = opening;
}

const agentBuilderHref = computed(function getAgentBuilderHref() {
	return router.resolve({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
		query: { [CONTINUE_SESSION_ID_PARAM]: effectiveSessionId.value },
	}).href;
});
const isFavorite = computed(() => favoritesStore.isFavorite(agentId.value, 'agent'));

const {
	canUpdate: canEditAgent,
	canDelete: canDeleteAgent,
	canExecute: canExecuteAgent,
} = useAgentPermissions(projectId);
// True while writes from this tab must not reach the backend: the AI is
// mutating this agent (artifact build lock or the embedded assistant), or
// another client holds the collaboration write lock (multi-tab / multi-user).
// Every write path — the editor, the header actions, and the autosave loops —
// keys off this.
const isEditingLocked = computed(
	() =>
		props.artifactEditingLocked ||
		embeddedAiBuilding.value ||
		agentCollaborationStore.shouldBeReadOnly,
);
// Combines permission with the lock: while locked, editing is disabled even
// for a user who otherwise has permission — mirrors the workflow artifact's
// read-only lock during a build.
const effectiveCanEditAgent = computed(() => canEditAgent.value && !isEditingLocked.value);
const canDeletePreviewSession = computed(() => canEditAgent.value);

// The intro is for a first build only: a new agent, still blank, editable, and
// no template applied yet. A successful apply makes the config non-blank, so
// the intro cannot come back after a reload either.
const showAgentIntro = computed(
	() =>
		openedForPendingAgent.value &&
		effectiveCanEditAgent.value &&
		!templateApplied.value &&
		localConfig.value !== null &&
		isAgentConfigBlank(localConfig.value),
);

const isVersionHistoryOpen = ref(false);

watch(
	isPreviewDockOpen,
	(open) => {
		emit('preview-open-change', open);
	},
	{ immediate: true },
);

watch(
	() => props.artifactPreviewOpen,
	(open) => {
		if (!isArtifactMode.value || open === undefined) return;
		persistedPreviewOpen.value = open;
	},
	{ immediate: true },
);

async function onSendPreviewToAssistant(event?: AgentSendToAssistantEvent) {
	const threadId = effectiveSessionId.value;
	if (!threadId || !agentId.value || !projectId.value) return;
	const session = currentSession.value;
	const sessionTitle = session?.title?.trim() || currentSessionTitle.value || undefined;
	const sessionNumber = session?.sessionNumber;

	const params: AgentPreviewHandoffParams = {
		projectId: projectId.value,
		agentId: agentId.value,
		threadId,
		agentName: agentName.value || undefined,
		agentIcon: localConfig.value?.personalisation?.icon,
		sessionTitle,
		...(!event
			? {}
			: 'failures' in event
				? {
						executionId: event.executionId,
						initialDraft: {
							text: buildAgentFixWithAssistantPrompt(
								{
									projectId: projectId.value,
									agentId: agentId.value,
									agentName: agentName.value || undefined,
									threadId,
									sessionTitle,
									...(sessionNumber !== undefined ? { sessionNumber } : {}),
									executionId: event.executionId,
									failures: event.failures,
								},
								locale,
							),
							prefillType: 'handoff_agent_change_request',
						},
					}
				: {
						initialDraft: {
							text: buildAgentChangeRequestPrompt(event.changeRequest, locale),
							prefillType: 'handoff_agent_change_request',
						},
					}),
	};

	if (isArtifactMode.value) {
		// The host closes the dock — only it knows whether the hand-off went
		// through (it refuses one while its composer holds a draft).
		emit('assistant-handoff', params);
		return;
	}

	// Setup isn't finished — send the user to the assistant, where onboarding
	// takes over, instead of opening a panel no model can answer in.
	if (!instanceAiReady.value) {
		void router.push({ name: INSTANCE_AI_VIEW });
		return;
	}

	// Open the dock (it's `v-if`) and wait a tick so `aiPanelRef` resolves
	// before the hand-off is attempted.
	isAiPanelOpen.value = true;
	await nextTick();

	const context = buildInstanceAiAgentPreviewHandoffContext(params);
	if (aiPanelRef.value) {
		const handed = aiPanelRef.value.handoff(context, params.initialDraft);
		if (!handed) return;
		// Close the preview once the assistant has the request: coming back to an
		// open preview chat beside the assistant reads as two places to ask.
		closePreviewDock();
	} else {
		// Standalone preview route: the panel isn't mounted here. Queue the
		// hand-off and close the dock — on this route that navigates back to
		// the builder, which mounts the panel and applies the queue.
		queuedAiHandoff.value = { context, initialDraft: params.initialDraft };
		closePreviewDock();
	}

	telemetry.track(TELEMETRY_EVENT.AGENTS.INSTANCE_AI_OPENED_FROM_AGENT_PREVIEW, {
		agent_id: params.agentId,
		preview_thread_id: params.threadId,
		...(params.executionId ? { preview_execution_id: params.executionId } : {}),
	});
}

/**
 * Gate for the main body render. Stays false while `initialize()` is running so
 * we don't:
 *   - flash the home screen for users who arrive with a `?prompt=…` query that
 *     will immediately transition them to the build chat, and
 *   - render the preview chat before the route/config/session state has settled.
 */
const initialized = ref(false);
let disposed = false;
let latestSessionsFetchRequestId = 0;
/**
 * No agent row exists behind `agentId` yet. The id was minted by whoever opened
 * this artifact, so the config edits below can create the agent under it at the
 * moment the user first configures something — and until then nothing is
 * persisted. Cleared by `ensureAgentPersisted`.
 */
const isUnsaved = ref(false);
/** Queues `agentUpdated` bus events that land mid-initialize for replay (see `onExternalAgentUpdated`). */
const pendingExternalRefresh = ref(false);
/** The queued event's `source`, consumed by `onAgentUpdateRefreshed` once the replay resolves. */
let pendingExternalRefreshSource: string | undefined;
const agentName = ref('');
const agent = ref<AgentResource | null>(null);
/** Scopes the embedded n8n Assistant panel to this agent's thread history. */
const instanceAiEmbedSubject = computed<InstanceAiEmbedSubject>(() => ({
	type: 'agent',
	id: agentId.value,
	projectId: projectId.value,
	name: agent.value?.name,
	// The attachment's `pending` is a `true`-only literal (absent means "not pending").
	...((isRouteAgentPending.value || isUnsaved.value) && { pending: true as const }),
}));
const instanceAiEmbedLaunch = computed<InstanceAiThreadLaunch>(() => ({
	source: 'agent_builder_page',
	origin: 'internal',
	sourceContext: { agentId: agentId.value },
}));
const agentFiles = ref<AgentFileDto[]>([]);
const agentFilesLoading = ref(false);
const agentFilesUploading = ref(false);
const deletingAgentFileId = ref<string | null>(null);
const lastKnowledgeSandboxWarmupKey = ref<string | null>(null);

watch(agentName, (name) => {
	documentTitle.set(name || locale.baseText('agents.heading'));
});
const {
	activeChatSessionId,
	continueSessionId,
	effectiveSessionId,
	currentSession,
	previewThreads,
	currentSessionHasMessages,
	currentSessionTitle,
	currentSessionIsEphemeral,
	currentSessionIsLocallyMinted,
	sessionMenu,
	isDeletingSession,
	setSessionInUrl,
	clearContinueSessionParam,
	onSessionPick,
	onNewChat,
	markSessionCreated,
	deleteSession,
} = useAgentBuilderSession({
	routeBacked: computed(() => !isArtifactMode.value),
	projectId,
	agentId,
});
const previewSessionsLoading = computed(
	() => sessionsStore.loading || sessionsStore.previewLoading,
);
const previewSessionReady = computed(
	() => currentSessionIsLocallyMinted.value || currentSession.value?.canContinueInPreview === true,
);

// Config
const { config, configHash, fetchConfig, updateConfig, repoint: repointConfig } = useAgentConfig();
const {
	validation: configValidation,
	repoint: repointConfigValidation,
	invalidate: invalidateConfigValidation,
	refresh: refreshConfigValidation,
} = useAgentConfigValidation();
const localConfig = ref<AgentJsonConfig | null>(null);
const connectedTriggers = ref<string[]>([]);
/** Bumped when the config changes outside the local editor (modal flows, version revert) so the Tasks panel reloads. */
const tasksReloadKey = ref(0);
const versionHistoryPanel = useTemplateRef<{ refresh: () => Promise<void> }>('versionHistoryPanel');
const executionsCount = computed(() => sessionsStore.threads.length);
const { activeMainTab, mainTabOptions, executionsDescription } = useAgentBuilderMainTabs({
	executionsCount,
	routeBacked: computed(() => !isArtifactMode.value),
});

// Knowledge, Executions and Settings all read agent-scoped endpoints, so they
// have nothing to show until the agent exists. Configuring the agent is what
// creates it, so that is the only tab worth offering first.
const visibleMainTabOptions = computed(() =>
	isUnsaved.value
		? mainTabOptions.value.filter((tab) => tab.value === 'agent')
		: mainTabOptions.value,
);

const { ensureLoaded: ensureIntegrationsCatalog } = useAgentIntegrationsCatalog();

const builderTelemetry = useAgentBuilderTelemetry({
	agentId,
	projectId,
	agent,
	localConfig,
	connectedTriggers,
});

/**
 * The backend owns runnable validation so the chat entry point either opens
 * Preview or stays in the builder.
 */
const isBuilt = computed(() => agent.value?.isRunnable === true);

const showBuilderLoading = computed(() => !initialized.value);

watch(
	config,
	(c) => {
		if (c) {
			localConfig.value = deepCopy(c);
			syncAgentIdentityFromConfig(c);
		}
	},
	{ immediate: true },
);

function syncAgentIdentityFromConfig(c: AgentJsonConfig) {
	agentName.value = c.name;
	favoritesStore.renameFavorite(agentId.value, 'agent', c.name);
	if (!agent.value) return;
	agent.value = {
		...agent.value,
		name: c.name,
	};
}

const projectName = computed<string | null>(() => {
	if (projectsStore.personalProject?.id === projectId.value) {
		return locale.baseText('projects.menu.personal');
	}
	const current = projectsStore.currentProject;
	if (current && current.id === projectId.value) return current.name ?? null;
	const match = projectsStore.myProjects.find((p) => p.id === projectId.value);
	return match?.name ?? null;
});

// A fetch/mutation captures its target agent + project at call time. By the
// time an awaited call resolves the user may have switched to a different agent
// or project, and applying the result would clobber the new selection's state.
// Callers use this guard to drop such stale results.
function isStaleAgentTarget(targetProjectId: string, targetAgentId: string): boolean {
	return disposed || projectId.value !== targetProjectId || agentId.value !== targetAgentId;
}

// Drafts cases from the agent's own config. The generated dataset isn't
// rendered yet, so the toast is the only confirmation the user gets that the
// work landed.
async function onGenerateEvalCases() {
	const targetProjectId = projectId.value;
	const targetAgentId = agentId.value;
	if (!targetProjectId || !targetAgentId) return;

	try {
		const { cases } = await agentEvalsStore.generateDraftCases(targetProjectId, targetAgentId);
		if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
		showMessage({
			title: locale.baseText('agents.builder.agentEvals.generated', {
				adjustToNumber: cases.length,
				interpolate: { count: String(cases.length) },
			}),
			type: 'success',
		});
	} catch (error) {
		if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
		showError(error, locale.baseText('agents.builder.agentEvals.generateError'));
	}
}

async function fetchAgent(
	targetProjectId: string = projectId.value,
	targetAgentId: string = agentId.value,
	/** Already-fetched resource to apply instead of re-reading it (see `probePendingAgentRow`). */
	preloaded?: AgentResource,
) {
	const data =
		preloaded ?? (await getAgent(rootStore.restApiContext, targetProjectId, targetAgentId));
	if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
	agent.value = data;
	agentName.value = data.name;
	upsertProjectAgentsListCache(targetProjectId, data);
}

async function fetchAgentFiles(
	targetProjectId: string = projectId.value,
	targetAgentId: string = agentId.value,
) {
	if (!isKnowledgeBaseEnabled.value) return;
	agentFilesLoading.value = true;
	try {
		const files = await listAgentFiles(rootStore.restApiContext, targetProjectId, targetAgentId);
		if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
		agentFiles.value = files;
	} catch (error) {
		showError(error, locale.baseText('agents.builder.files.loadError'));
	} finally {
		if (!isStaleAgentTarget(targetProjectId, targetAgentId)) {
			agentFilesLoading.value = false;
		}
	}
}

async function onUploadAgentFiles(files: File[]) {
	if (files.length === 0) return;
	const oversizedFiles = files.filter((file) => file.size > MAX_AGENT_FILE_SIZE_BYTES);
	if (oversizedFiles.length > 0) {
		showError(
			new Error(
				locale.baseText('agents.builder.files.uploadFileTooLarge.message', {
					interpolate: { name: oversizedFiles[0].name, size: String(MAX_AGENT_FILE_SIZE_MB) },
				}),
			),
			locale.baseText('agents.builder.files.uploadFileTooLarge.title'),
		);
	}
	const filesWithinLimit = files.filter((file) => file.size <= MAX_AGENT_FILE_SIZE_BYTES);
	if (filesWithinLimit.length === 0) return;

	if (filesWithinLimit.length > MAX_AGENT_FILES_PER_UPLOAD) {
		showError(
			new Error(
				locale.baseText('agents.builder.files.uploadTooManyFiles.message' as BaseTextKey, {
					interpolate: { max: String(MAX_AGENT_FILES_PER_UPLOAD) },
				}),
			),
			locale.baseText('agents.builder.files.uploadTooManyFiles.title' as BaseTextKey),
		);
		return;
	}

	const existingTotalSizeBytes = agentFiles.value.reduce(
		(total, file) => total + file.fileSizeBytes,
		0,
	);
	const uploadTotalSizeBytes = filesWithinLimit.reduce((total, file) => total + file.size, 0);
	if (existingTotalSizeBytes + uploadTotalSizeBytes > MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES) {
		showError(
			new Error(
				locale.baseText('agents.builder.files.uploadTotalTooLarge.message' as BaseTextKey, {
					interpolate: { size: String(MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB) },
				}),
			),
			locale.baseText('agents.builder.files.uploadTotalTooLarge.title' as BaseTextKey),
		);
		return;
	}

	const targetProjectId = projectId.value;
	const targetAgentId = agentId.value;
	agentFilesUploading.value = true;
	try {
		await ensureAgentPersisted();
		const uploadedFiles = await uploadAgentFiles(
			rootStore.restApiContext,
			targetProjectId,
			targetAgentId,
			filesWithinLimit,
		);
		if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
		const existingById = new Map(agentFiles.value.map((file) => [file.id, file]));
		for (const file of uploadedFiles) {
			existingById.set(file.id, file);
		}
		agentFiles.value = Array.from(existingById.values()).sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		showMessage({
			title: locale.baseText('agents.builder.files.uploaded'),
			type: 'success',
		});
	} catch (error) {
		showError(error, locale.baseText('agents.builder.files.uploadError'));
	} finally {
		if (!isStaleAgentTarget(targetProjectId, targetAgentId)) {
			agentFilesUploading.value = false;
		}
	}
}

async function onDeleteAgentFile(file: AgentFileDto) {
	if (deletingAgentFileId.value !== null) return;

	const confirmed = await openAgentConfirmationModal({
		title: locale.baseText('agents.builder.files.deleteModal.title', {
			interpolate: { name: file.fileName },
		}),
		description: locale.baseText('agents.builder.files.deleteModal.description', {
			interpolate: { name: file.fileName },
		}),
		confirmButtonText: locale.baseText('agents.builder.files.deleteModal.button.delete'),
		cancelButtonText: locale.baseText('generic.cancel'),
	});
	if (confirmed !== MODAL_CONFIRM) return;

	const targetProjectId = projectId.value;
	const targetAgentId = agentId.value;
	deletingAgentFileId.value = file.id;
	try {
		await deleteAgentFile(rootStore.restApiContext, targetProjectId, targetAgentId, file.id);
		if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
		agentFiles.value = agentFiles.value.filter((agentFile) => agentFile.id !== file.id);
		showMessage({
			title: locale.baseText('agents.builder.files.deleted'),
			type: 'success',
		});
	} catch (error) {
		showError(error, locale.baseText('agents.builder.files.deleteError'));
	} finally {
		if (deletingAgentFileId.value === file.id) {
			deletingAgentFileId.value = null;
		}
	}
}

async function refreshAgentAfterIntegrationChange(
	targetProjectId: string = projectId.value,
	targetAgentId: string = agentId.value,
) {
	if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
	await Promise.all([
		fetchAgent(targetProjectId, targetAgentId),
		fetchConfig(targetProjectId, targetAgentId),
		refreshConfigValidation(targetProjectId, targetAgentId),
	]);
}

function sessionIdForPreview(): string | undefined {
	return effectiveSessionId.value ?? previewThreads.value[0]?.id;
}

async function openPreview(preferredSessionId?: string) {
	preferredSidePanel.value = 'preview';
	const sessionId = preferredSessionId ?? sessionIdForPreview();
	activeChatSessionId.value = sessionId ?? null;
	persistedPreviewOpen.value = true;
}

function openArtifactPreview(preferredSessionId?: string) {
	if (preferredSessionId) {
		onSessionPick(preferredSessionId);
	} else {
		bindPreviewSession();
	}
	persistedPreviewOpen.value = true;
}

function viewPreviewTrace() {
	if (!currentSessionHasMessages.value || !effectiveSessionId.value) return;
	void router.push({
		name: AGENT_SESSION_DETAIL_VIEW,
		params: {
			projectId: projectId.value,
			agentId: agentId.value,
			threadId: effectiveSessionId.value,
		},
	});
}

function startNewPreviewSession() {
	onNewChat();
}

async function onDeletePreviewSession(sessionId: string) {
	if (!canDeletePreviewSession.value) return;
	await deleteSession(sessionId);
}

async function onOpenPreview(expectedTarget?: {
	projectId: string;
	agentId: string;
}): Promise<boolean> {
	if (!isBuilt.value) return false;

	try {
		await flushAutosave();
	} catch {
		return false;
	}
	if (expectedTarget && isStaleAgentTarget(expectedTarget.projectId, expectedTarget.agentId)) {
		return false;
	}
	if (isArtifactMode.value) {
		openArtifactPreview();
	} else {
		await openPreview();
	}
	telemetry.track(TELEMETRY_EVENT.AGENTS.USER_OPENED_AGENT_PREVIEW, { agent_id: agentId.value });
	return true;
}

async function onPreviewTask(instructions: string) {
	const target = { projectId: projectId.value, agentId: agentId.value };
	if (!(await onOpenPreview(target))) return;

	// Reset first so the same objective can be previewed more than once.
	taskPreviewPrompt.value = undefined;
	await nextTick();
	if (isStaleAgentTarget(target.projectId, target.agentId)) return;
	taskPreviewPrompt.value = instructions;
}

function getBuilderQuery() {
	const query = { ...route.query };
	delete query[CONTINUE_SESSION_ID_PARAM];
	delete query[NEW_SESSION_PARAM];
	delete query[OPEN_PREVIEW_PARAM];
	delete query.prompt;
	return query;
}

function closePreviewRoute() {
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
		query: getBuilderQuery(),
	});
}

function returnToBuilderFromPreview() {
	void router.push(agentBuilderHref.value);
}

function closePreviewDock() {
	persistedPreviewOpen.value = false;
	if (!isArtifactMode.value) closePreviewRoute();
}

function onPreviewDockResize({ width }: ResizeData) {
	preferredSidePanel.value = 'preview';
	previewDockWidth.value = width;
}

function onPublished(updated: AgentResource) {
	agent.value = updated;
	void versionHistoryPanel.value?.refresh();
}

function onUnpublished(updated: AgentResource) {
	agent.value = updated;
	void versionHistoryPanel.value?.refresh();
}

function onToggleVersionHistory() {
	isVersionHistoryOpen.value = !isVersionHistoryOpen.value;
}

function onCloseVersionHistory() {
	isVersionHistoryOpen.value = false;
}

async function onReverted(updated: AgentResource) {
	agent.value = updated;
	agentName.value = updated.name;
	await Promise.all([
		fetchConfig(projectId.value, agentId.value),
		refreshConfigValidation(projectId.value, agentId.value),
	]);
	tasksReloadKey.value += 1;
}

/**
 * Pick the session the preview chat should bind to when no explicit one has been
 * chosen yet. Resume the latest private chat after the Preview list loads.
 */
function bindPreviewSession() {
	if (effectiveSessionId.value || previewSessionsLoading.value) return;
	selectLatestPreviewSession();
}

function selectLatestPreviewSession() {
	const latest = previewThreads.value[0];
	if (latest) {
		setSessionInUrl(latest.id);
		return;
	}
	onNewChat();
}

function warmAgentKnowledgeSandboxForPage() {
	if (!initialized.value || !isKnowledgeBaseEnabled.value || !agent.value) return;
	// No agent row to warm a sandbox for yet.
	if (isUnsaved.value) return;

	const targetProjectId = projectId.value;
	const targetAgentId = agentId.value;
	const warmupKey = `${targetProjectId}:${targetAgentId}`;
	if (lastKnowledgeSandboxWarmupKey.value === warmupKey) return;
	lastKnowledgeSandboxWarmupKey.value = warmupKey;

	void warmAgentKnowledgeSandbox(rootStore.restApiContext, targetProjectId, targetAgentId).catch(
		() => {
			if (!isStaleAgentTarget(targetProjectId, targetAgentId)) {
				lastKnowledgeSandboxWarmupKey.value = null;
			}
		},
	);
}

// Base hashes are captured when the edit is scheduled, not when the debounced
// save fires: a refresh landing in between would otherwise lend a stale
// snapshot the fresh hash and let it overwrite the newer server state.
interface ConfigAutosaveSnapshot {
	type: 'config';
	projectId: string;
	agentId: string;
	config: AgentJsonConfig;
	/** `undefined` while the agent's config has not been fetched yet (e.g. before it is persisted). */
	baseConfigHash: string | null | undefined;
}

interface SkillAutosaveSnapshot {
	type: 'skill';
	projectId: string;
	agentId: string;
	skillId: string;
	skill: AgentSkill;
	baseSkillHash: string | undefined;
}

interface McpAvailabilitySnapshot {
	type: 'mcp';
	projectId: string;
	agentId: string;
	enabled: boolean;
}

/**
 * Create the agent the first time the user actually configures something, so an
 * artifact that is only looked at never reaches the database. Every mutating
 * path funnels through here; the cached promise keeps the independent autosave
 * chains (config, skill, MCP) from racing into two agents.
 *
 * The agent is created under the already-minted `agentId`, so an agent-building
 * chat request on the same thread converges on this agent rather than a second
 * one: `artifactPersistAgent` creates-or-adopts, and the route-backed path
 * (no host, so no thread to prove ownership with) uses the strict REST create.
 *
 * Only fully acknowledged targets are memoized — for the host path that means
 * bound as well as created, so a retry after a failed binding goes back to the
 * host instead of silently declaring the artifact saved.
 */
const persistFlights = new Map<string, Promise<void>>();
const persistedAgentsByTarget = new Map<string, AgentResource>();

function clearRoutePendingState(targetAgentId: string) {
	if (isArtifactMode.value) return;
	const historyState = history.state as Record<string, unknown>;
	if (historyState[PENDING_AGENT_ID_STATE] !== targetAgentId) return;
	const { [PENDING_AGENT_ID_STATE]: _, ...state } = historyState;
	history.replaceState(state, '');
	if (routePendingAgentId.value === targetAgentId) routePendingAgentId.value = null;
}

/**
 * The agent row behind a pending artifact, or null when it genuinely does not
 * exist yet — a 404 is the ordinary answer for a new-agent draft. Anything else
 * is propagated: guessing "absent" on an unclear failure risks drafting over a
 * real agent. The resource is returned rather than a boolean so the hydration
 * below doesn't read the same agent twice.
 */
async function probePendingAgentRow(
	targetProjectId: string,
	targetAgentId: string,
): Promise<AgentResource | null> {
	try {
		return await getAgent(rootStore.restApiContext, targetProjectId, targetAgentId);
	} catch (error) {
		if (isNotFoundError(error)) return null;
		throw error;
	}
}

/**
 * Agent whose row exists but whose host binding has not landed yet, so the next
 * mutation retries it. Not a reason to keep drafting: the row is real and
 * hydrated, and re-showing a blank draft over it is what the probe exists to
 * prevent.
 */
const unboundExistingAgent = ref<AgentResource | null>(null);

/**
 * Retire a stale pending marker whose agent row turned out to exist. Takes the
 * probed row rather than reading `agent.value`, which a stale target switch can
 * leave pointing at a different agent.
 */
async function adoptExistingPendingRow(existing: AgentResource): Promise<void> {
	if (!props.artifactPersistAgent) return;
	// `unboundExistingAgent` tracks one target, so a bind that settles after the
	// user moved on must not clear (or claim) the current target's retry state.
	const ownsRetryState = () => existing.id === agentId.value;
	try {
		await props.artifactPersistAgent(existing.name);
		if (ownsRetryState()) unboundExistingAgent.value = null;
	} catch (error) {
		// Queued rather than surfaced: the artifact already shows the persisted
		// agent, so the only casualty is the thread binding.
		if (ownsRetryState()) unboundExistingAgent.value = existing;
		console.warn('Failed to bind an existing agent to its artifact', error);
	}
}

/** Retry a binding that failed after the probe, before the write it precedes. */
async function retryPendingBind(): Promise<void> {
	const existing = unboundExistingAgent.value;
	if (!existing || existing.id !== agentId.value) return;
	await adoptExistingPendingRow(existing);
}

async function ensureAgentPersisted(): Promise<void> {
	// Every mutating path funnels through here, so this is where a binding that
	// failed after the hydration probe gets its retry — a skill- or MCP-only edit
	// must not leave the artifact unbound.
	await retryPendingBind();
	if (!isUnsaved.value) return;
	const targetProjectId = projectId.value;
	const targetAgentId = agentId.value;
	const targetKey = `${targetProjectId}:${targetAgentId}`;
	const persistedAgent = persistedAgentsByTarget.get(targetKey);
	if (persistedAgent) {
		isUnsaved.value = false;
		agent.value = persistedAgent;
		clearRoutePendingState(targetAgentId);
		return;
	}
	let flight = persistFlights.get(targetKey);
	if (!flight) {
		flight = (async () => {
			const name = localConfig.value?.name ?? locale.baseText('agents.new.defaultName');
			// A thread is bound (the embedded assistant may be building the same
			// agent right now): adopt-or-create through the thread so a race with
			// its own create converges on one row instead of a 409.
			const created = props.artifactPersistAgent
				? await props.artifactPersistAgent(name)
				: aiThreadId.value
					? (
							await persistPendingAgent(rootStore.restApiContext, aiThreadId.value, {
								projectId: targetProjectId,
								agentId: targetAgentId,
								name,
							})
						).agent
					: await createAgent(rootStore.restApiContext, targetProjectId, name, {
							id: targetAgentId,
						});
			persistedAgentsByTarget.set(targetKey, created);
			upsertProjectAgentsListCache(targetProjectId, created);
			clearRoutePendingState(targetAgentId);
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			isUnsaved.value = false;
			agent.value = created;
		})();
		persistFlights.set(targetKey, flight);
	}

	try {
		await flight;
	} finally {
		if (persistFlights.get(targetKey) === flight) persistFlights.delete(targetKey);
	}
}

async function handleAutosaveConflict(snapshot: {
	projectId: string;
	agentId: string;
}): Promise<'stale'> {
	if (!isStaleAgentTarget(snapshot.projectId, snapshot.agentId)) {
		await onConfigUpdated();
		if (!isStaleAgentTarget(snapshot.projectId, snapshot.agentId)) {
			showMessage({
				title: locale.baseText('agents.builder.remoteChange.title'),
				message: locale.baseText('agents.builder.remoteChange.message'),
				type: 'warning',
			});
		}
	}
	return 'stale';
}

async function saveConfig(snapshot: ConfigAutosaveSnapshot): Promise<AutosaveResult> {
	// The AI or another client may be mutating this agent right now — a save
	// queued just before the lock engaged must not persist its now-stale full
	// config over it.
	if (isEditingLocked.value) return 'skipped';
	await ensureAgentPersisted();
	let result;
	try {
		result = await updateConfig(
			snapshot.projectId,
			snapshot.agentId,
			snapshot.config,
			// Edits made before the agent was persisted have no fetched hash yet; the
			// create response for that target carries the hash of the seeded config.
			snapshot.baseConfigHash === undefined
				? (persistedAgentsByTarget.get(`${snapshot.projectId}:${snapshot.agentId}`)?.configHash ??
						null)
				: snapshot.baseConfigHash,
		);
	} catch (error) {
		if (error instanceof ResponseError && error.httpStatusCode === 409) {
			// Detach before the reload: everything scheduled so far is stale,
			// but edits typed while the reload runs must still get saved.
			configAutosave.reset();
			return await handleAutosaveConflict(snapshot);
		}
		throw error;
	}
	// The write landed regardless of staleness below — tell other surfaces
	// (e.g. canvas agent cards invalidate their capability-summary cache).
	agentsEventBus.emit('agentUpdated', { agentId: snapshot.agentId, source: 'agent-builder' });
	// Drop the response if the user has switched to a different agent in the
	// meantime — both `config` (handled inside useAgentConfig) and
	// `agent.versionId` would otherwise be polluted with values for the
	// previous agent.
	if (result.stale) return undefined;
	emit('name-saved', snapshot.config.name);
	if (agent.value && agent.value.id === snapshot.agentId && result.versionId !== undefined) {
		agent.value = { ...agent.value, versionId: result.versionId };
	}
	await Promise.all([
		fetchAgent(snapshot.projectId, snapshot.agentId),
		refreshConfigValidation(snapshot.projectId, snapshot.agentId),
	]);
	return undefined;
}

async function saveSkill(snapshot: SkillAutosaveSnapshot): Promise<AutosaveResult> {
	if (isEditingLocked.value) return 'skipped';
	await ensureAgentPersisted();
	let result;
	try {
		result = await updateAgentSkill(
			rootStore.restApiContext,
			snapshot.projectId,
			snapshot.agentId,
			snapshot.skillId,
			snapshot.skill,
			snapshot.baseSkillHash,
		);
	} catch (error) {
		if (error instanceof ResponseError && error.httpStatusCode === 409) {
			skillAutosave.reset();
			return await handleAutosaveConflict(snapshot);
		}
		throw error;
	}
	agentsEventBus.emit('agentUpdated', { agentId: snapshot.agentId, source: 'agent-builder' });
	if (agent.value?.id !== snapshot.agentId) return undefined;
	agent.value = {
		...agent.value,
		versionId: result.versionId,
		skillHashes: {
			...(agent.value.skillHashes ?? {}),
			[snapshot.skillId]: result.skillHash,
		},
		skills: {
			...(agent.value.skills ?? {}),
			[snapshot.skillId]: result.skill,
		},
	};
	await refreshConfigValidation(snapshot.projectId, snapshot.agentId);
	return undefined;
}

// Debounce shorter than the workflow canvas' 1500ms — the publish button's
// "enabled" state is gated on the save landing, so a longer wait makes the
// UI feel laggy right after an edit.
const configAutosave = useAgentConfigAutosave<ConfigAutosaveSnapshot>({
	save: saveConfig,
	onError: (error: unknown) => {
		// Surface backend validation errors (e.g. incompatible workflow-tool
		// triggers or body nodes) so the user isn't left wondering why their
		// edit didn't stick. `localConfig` still holds the failed edit, so the
		// next successful autosave will persist it.
		showError(error, locale.baseText('agents.builder.saveError'));
	},
});
const skillAutosave = useAgentConfigAutosave<SkillAutosaveSnapshot>({
	save: saveSkill,
	onSaved: (snapshot) => {
		telemetry.track(TELEMETRY_EVENT.AGENTS.USER_SAVED_AGENT_SKILL, {
			agent_id: snapshot.agentId,
			skill_id: snapshot.skillId,
		});
	},
	onError: (error: unknown) => {
		showError(error, locale.baseText('agents.builder.skills.saveError'));
	},
});
// The MCP availability flag lives on the agent resource, not the JSON config,
// so it saves through its own autosave loop — while sharing the header's
// Saving/Saved indicator with config and skill edits.
const mcpAvailabilityOverride = ref<boolean | null>(null);
const agentAvailableInMcp = computed(
	() => mcpAvailabilityOverride.value ?? agent.value?.availableInMCP ?? false,
);

async function saveMcpAvailability(
	snapshot: McpAvailabilitySnapshot,
): Promise<'skipped' | undefined> {
	// The AI may be mutating this agent right now — mirrors `saveConfig`/`saveSkill`.
	if (isEditingLocked.value) return 'skipped';
	await ensureAgentPersisted();
	await mcpStore.toggleAgentMcpAccess(snapshot.agentId, snapshot.enabled);
	if (snapshot.enabled) {
		mcp.trackMcpAccessEnabledForAgent(snapshot.agentId);
	}
	if (isStaleAgentTarget(snapshot.projectId, snapshot.agentId)) return undefined;
	if (agent.value?.id === snapshot.agentId) {
		agent.value = { ...agent.value, availableInMCP: snapshot.enabled };
	}
	// Keep the override if the user flipped the switch again while this save
	// was in flight — the newer value has its own save chained behind us.
	if (mcpAvailabilityOverride.value === snapshot.enabled) {
		mcpAvailabilityOverride.value = null;
	}
	return undefined;
}

const mcpAutosave = useAgentConfigAutosave<McpAvailabilitySnapshot>({
	save: saveMcpAvailability,
	onError: (error: unknown) => {
		// Revert the optimistic toggle — unlike config edits there is no local
		// pending state that a later autosave would persist.
		mcpAvailabilityOverride.value = null;
		showError(error, locale.baseText('agents.toggleMCP.error.title'));
	},
});

function onToggleMcpAccess(enabled: boolean) {
	if (!agent.value) return;
	// Acquire the write lock before persisting any change.
	agentCollaborationStore.requestWriteAccess();
	mcpAvailabilityOverride.value = enabled;
	mcpAutosave.scheduleAutosave({
		type: 'mcp',
		projectId: projectId.value,
		agentId: agentId.value,
		enabled,
	});
}

const saveStatus = computed(() => {
	const statuses = [
		configAutosave.saveStatus.value,
		skillAutosave.saveStatus.value,
		mcpAutosave.saveStatus.value,
	];
	if (statuses.includes('saving')) {
		return 'saving';
	}
	if (statuses.includes('saved')) {
		return 'saved';
	}
	return 'idle';
});

async function settleAutosave() {
	await Promise.all([
		configAutosave.settleAutosave(),
		skillAutosave.settleAutosave(),
		mcpAutosave.settleAutosave(),
	]);
}

/** Acquire the write lock, then settle pending autosaves before a
 * revert-to-published. The lock is lazy — acquired on first mutating
 * action, released on inactivity — matching the workflow pattern. */
async function beforeRevertToPublished() {
	agentCollaborationStore.requestWriteAccess();
	await settleAutosave();
}

async function flushAutosave() {
	// Locked means the AI or another client is mutating this agent right now —
	// flushing a pending edit here would persist a stale full config over
	// their writes.
	if (isEditingLocked.value) {
		configAutosave.cancelPendingAutosave();
		skillAutosave.cancelPendingAutosave();
		mcpAutosave.cancelPendingAutosave();
		return;
	}
	await Promise.all([
		configAutosave.flushAutosave(),
		skillAutosave.flushAutosave(),
		mcpAutosave.flushAutosave(),
	]);
}

useEventListener(document, 'keydown', (event) => {
	if (!isCtrlKeyPressed(event) || event.key.toLowerCase() !== 's') return;
	event.preventDefault();
	void flushAutosave().catch(() => {});
});

async function flushPendingRouteDraftBeforeNavigation() {
	if (!isRouteAgentPending.value || !isUnsaved.value) return;
	await flushAutosave();
}

onBeforeRouteLeave(flushPendingRouteDraftBeforeNavigation);
onBeforeRouteUpdate(async (to) => {
	const nextProjectId = Array.isArray(to.params.projectId)
		? to.params.projectId[0]
		: to.params.projectId;
	const nextAgentId = Array.isArray(to.params.agentId) ? to.params.agentId[0] : to.params.agentId;
	if (nextProjectId === projectId.value && nextAgentId === agentId.value) return;
	if (isRouteAgentPending.value) {
		await flushPendingRouteDraftBeforeNavigation();
		return;
	}
	// An in-place switch skips the unmount flush, so persist queued edits here.
	// A failed save rejects and cancels the switch, so the edit stays for a retry.
	await flushAutosave();
});

async function beforePreviewSend() {
	// Autosave failures already use their config/skill/MCP-specific error toasts.
	await flushAutosave();
	try {
		await ensureAgentPersisted();
	} catch (error) {
		showError(error, locale.baseText('agents.builder.preview.sendError'));
		throw error;
	}
}

// Makes the lock a write boundary rather than only a disabled UI state: drop
// any autosave queued before the AI or another client took over this agent.
watch(isEditingLocked, (locked) => {
	if (!locked) return;
	configAutosave.cancelPendingAutosave();
	skillAutosave.cancelPendingAutosave();
	mcpAutosave.cancelPendingAutosave();
	mcpAvailabilityOverride.value = null;
});

/**
 * Authoritative pre-publish gate for the frontend: flush any pending edit so
 * the backend validates the config the user is about to publish (not a
 * stale persisted version), then refresh the readiness result and report
 * whether it is safe to call the publish endpoint. The publish endpoint
 * re-validates independently, so this is a UX affordance, not the only guard.
 */
async function refreshValidationBeforePublish(): Promise<boolean> {
	// Acquire the write lock before publishing — the lock is lazy.
	agentCollaborationStore.requestWriteAccess();
	try {
		await flushAutosave();
	} catch {
		return false;
	}
	await refreshConfigValidation(projectId.value, agentId.value);
	return configValidation.value !== null && !hasBlockingIssues(configValidation.value.issues);
}

function normalizeAgentMemoryConfig(config: AgentJsonConfig): AgentJsonConfig {
	return {
		...config,
		memory: {
			...config.memory,
			enabled: true,
			storage: 'n8n',
		},
	};
}

function onConfigFieldUpdate(updates: Partial<AgentJsonConfig>, meta?: { source: 'auto' }) {
	if (!localConfig.value) return;
	// Acquire the write lock before persisting any change — the lock is
	// lazy (acquired on first edit, released on inactivity), matching the
	// workflow collaboration pattern.
	agentCollaborationStore.requestWriteAccess();
	// The persisted validation result no longer reflects the working copy —
	// Publish must not stay enabled against a result that predates this edit.
	invalidateConfigValidation();
	Object.assign(localConfig.value, updates);
	// Mirror identity edits onto the agent resource so the header reflects them
	// before the next fetch.
	if (updates.name !== undefined) {
		syncAgentIdentityFromConfig(localConfig.value);
	}
	// An auto-applied default (e.g. the seeded model) must not persist a pending
	// agent on its own — it rides along with the draft and is saved by the first
	// real edit or an assistant build instead. Except when a real edit's save is
	// already queued OR in flight: that snapshot was deep-copied before this
	// update landed, so it must be rescheduled (chained behind an in-flight one
	// if needed) to pick up the merged config.
	const ridesAlongWithDraft = meta?.source === 'auto' && isUnsaved.value;
	if (ridesAlongWithDraft && !configAutosave.hasPendingSave.value) return;
	configAutosave.scheduleAutosave({
		projectId: projectId.value,
		agentId: agentId.value,
		type: 'config',
		// The memory toggle is gone, but older agent configs may still have
		// session memory disabled. Normalize on save so legacy configs are
		// corrected the next time the user makes a real edit, without mutating
		// config during component mount.
		config: normalizeAgentMemoryConfig(deepCopy(localConfig.value)),
		baseConfigHash: configHash.value,
	});
}

// Capability-section handlers (tools, skills, tasks, triggers). Extracted so the
// agent node's NDV can reuse them with its own config/skill autosave funnels.
const caps = useAgentCapabilitiesActions({
	localConfig,
	agent,
	projectId,
	agentId,
	connectedTriggers,
	ensureAgentPersisted,
	beforeAgentMutation: flushAutosave,
	refreshAgentAfterMutation: onConfigUpdated,
	validationIssues: computed(() => configValidation.value?.issues ?? []),
	scheduleConfigUpdate: onConfigFieldUpdate,
	scheduleSkillSave: ({ skillId, skill }) => {
		// Acquire the write lock before persisting any change.
		agentCollaborationStore.requestWriteAccess();
		// The persisted validation result no longer reflects the working copy —
		// mirrors `onConfigFieldUpdate`'s invalidation before scheduling a config autosave.
		invalidateConfigValidation();
		skillAutosave.scheduleAutosave({
			type: 'skill',
			projectId: projectId.value,
			agentId: agentId.value,
			skillId,
			skill,
			baseSkillHash: agent.value?.skillHashes?.[skillId],
		});
	},
	telemetry: {
		trackOpenedToolFromList: builderTelemetry.trackOpenedToolFromList,
		trackOpenedSkillFromList: builderTelemetry.trackOpenedSkillFromList,
		trackOpenedAddSkillModal: builderTelemetry.trackOpenedAddSkillModal,
		trackTriggerAdded: builderTelemetry.trackTriggerAdded,
	},
});
// Top-level alias so the template auto-unwraps the ref (nested `caps.appliedSkills`
// access is not unwrapped by the template compiler).
const appliedSkills = caps.appliedSkills;

function replaceConfigAndScheduleSave(nextConfig: AgentJsonConfig) {
	invalidateConfigValidation();
	localConfig.value = deepCopy(nextConfig);
	syncAgentIdentityFromConfig(localConfig.value);
	configAutosave.scheduleAutosave({
		projectId: projectId.value,
		agentId: agentId.value,
		type: 'config',
		config: normalizeAgentMemoryConfig(deepCopy(localConfig.value)),
		baseConfigHash: configHash.value,
	});
}

// Apply a starter template to a blank agent: writes instructions and tools,
// pre-connects any channel triggers, creates scheduled tasks, and sends the
// template prompt to the assistant so it starts building right away. Refuses
// (with a toast) once the agent already has content — the intro is for a first build.
async function onApplyTemplate(template: AgentTemplate) {
	if (!localConfig.value) return;
	const next = applyAgentTemplate(
		localConfig.value,
		template,
		locale.baseText('agents.new.defaultName'),
	);
	if (!next) {
		showMessage({
			title: locale.baseText('agents.builder.templates.notBlank.title'),
			message: locale.baseText('agents.builder.templates.notBlank.message'),
			type: 'warning',
		});
		return;
	}
	replaceConfigAndScheduleSave(next);
	// Derive trigger chips from the template's draft integrations so the two
	// stay in sync — a template can't declare chips without the matching
	// integration entry.
	connectedTriggers.value = (template.config.integrations ?? []).map((i) => i.type);
	templateApplied.value = true;
	// Persist the agent and flush the config autosave before sending the chat
	// message. The chat's `beforeSend` hook calls `flushAutosave` too — if we
	// send first, a failed save (e.g. invalid tool fields in draft mode)
	// rejects `beforeSend` and the chat message is never sent. Flushing here
	// drains the queue so `beforeSend` resolves immediately.
	const targetProjectId = projectId.value;
	const targetAgentId = agentId.value;
	try {
		await ensureAgentPersisted();
		await flushAutosave();
	} catch {
		// Invalid tool fields are expected in draft mode; the chat message
		// should still reach the assistant.
	}
	// The user may have opened another agent while the save was in flight.
	// The panel ref now belongs to that agent, so this prompt must not follow.
	if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
	// Task creation writes the task ref into the server config and changes its
	// hash. Reload that config before the assistant prompt: the tasks counter
	// only refreshes task bodies, and the update push skips this tab. A later
	// edit would otherwise save against the old hash, get a 409, and lose the
	// change when the conflict reload lands.
	if (template.tasks?.length) {
		let tasksCreated = false;
		try {
			await ensureAgentPersisted();
			for (const task of template.tasks) {
				if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
				await createAgentTask(rootStore.restApiContext, targetProjectId, targetAgentId, {
					...task,
					enabled: true,
				});
				tasksCreated = true;
			}
		} catch (error) {
			if (!isStaleAgentTarget(targetProjectId, targetAgentId)) {
				showError(error, locale.baseText('agents.builder.tasks.saveError'));
			}
		}
		if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
		// A created task already changed the hash. Do not prompt the assistant
		// until this tab has reloaded that config.
		if (tasksCreated) {
			const refreshed = await refreshConfigAfterTemplateTasks(targetProjectId, targetAgentId);
			if (!refreshed || isStaleAgentTarget(targetProjectId, targetAgentId)) return;
		}
	}
	if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
	const templateIndex = AGENT_TEMPLATES.findIndex((entry) => entry.id === template.id);
	// Send the template prompt to the assistant right away so it starts
	// building. The prompt format is "Build {name} agent to {description}".
	// Catalog positions are one-based, matching the home-screen suggestion list.
	aiPanelRef.value?.submitSuggestion({
		prompt: locale.baseText('agents.builder.templates.prompt', {
			interpolate: {
				name: locale.baseText(template.labelKey),
				description: locale.baseText(template.descriptionKey),
			},
		}),
		suggestionId: template.id,
		suggestionKind: 'prompt',
		position: templateIndex >= 0 ? templateIndex + 1 : 0,
		suggestionCatalogVersion: AGENT_TEMPLATE_SUGGESTIONS_VERSION,
		prefillType: 'template_adjustment',
	});
}

/** Reload the config after task creation. One retry, then stop. */
async function refreshConfigAfterTemplateTasks(
	targetProjectId: string,
	targetAgentId: string,
): Promise<boolean> {
	let lastError: unknown;
	for (let attempt = 0; attempt < 2; attempt += 1) {
		if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
		try {
			await onConfigUpdated();
			return !isStaleAgentTarget(targetProjectId, targetAgentId);
		} catch (error) {
			lastError = error;
		}
	}
	if (!isStaleAgentTarget(targetProjectId, targetAgentId)) {
		showError(lastError, locale.baseText('agents.builder.tasks.saveError'));
	}
	return false;
}

function persistMissingPersonalisationGradient() {
	if (!effectiveCanEditAgent.value) return;
	if (!localConfig.value) return;

	const nextConfig = addMissingAgentPersonalisation(localConfig.value);
	if (!nextConfig) return;

	replaceConfigAndScheduleSave(nextConfig);
}

async function onConfigUpdated(
	targetProjectId: string = projectId.value,
	targetAgentId: string = agentId.value,
): Promise<boolean> {
	// Modal flows (e.g. skill creation) write through their own API calls, not
	// `saveConfig` — notify other surfaces (canvas agent cards) here too.
	agentsEventBus.emit('agentUpdated', { agentId: targetAgentId, source: 'agent-builder' });
	await Promise.all([
		fetchAgent(targetProjectId, targetAgentId),
		fetchConfig(targetProjectId, targetAgentId),
		refreshConfigValidation(targetProjectId, targetAgentId),
	]);
	if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
	// Refresh the connected-trigger list so chips reflect builder writes
	// without waiting for a tab switch. Mirrors the initial baseline fetch.
	const integrations = await ensureIntegrationsCatalog(targetProjectId).catch(() => []);
	if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
	const triggerTypes = integrations.map((i) => i.type);
	const connected = await builderTelemetry.fetchInitialTriggersBaseline(triggerTypes);
	if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
	if (connected) connectedTriggers.value = connected;
	tasksReloadKey.value += 1;
	return true;
}

async function refreshArtifactShell() {
	await settleAutosave();
	await onConfigUpdated();
}

function handleArtifactRefreshError(error: unknown) {
	showError(error, locale.baseText('agents.builder.loadError'));
}

/**
 * The assistant can build a route-pending agent under the id this view minted.
 * Once the refetch above confirms the row exists, treat it as persisted the same
 * way `ensureAgentPersisted` does, so a reload never re-enters pending mode.
 */
function onAgentUpdateRefreshed(source?: string) {
	if (source !== 'instance-ai') return;
	if (!isRouteAgentPending.value || !isUnsaved.value || !agent.value) return;
	isUnsaved.value = false;
	clearRoutePendingState(agentId.value);
}

let externalRefreshTimer: ReturnType<typeof setTimeout> | undefined;
let externalUpdateTimer: ReturnType<typeof setTimeout> | undefined;
let externalUpdateAgeTimer: ReturnType<typeof setInterval> | undefined;
let externalUpdateAt = 0;
const recentExternalUpdate = ref<PushPayload<'agentUpdated'> | null>(null);
const externalUpdateAgeMinutes = ref(0);
const externalUpdateTime = computed(() =>
	locale.baseText('agents.builder.externalUpdate.time', {
		adjustToNumber: externalUpdateAgeMinutes.value,
		interpolate: { count: externalUpdateAgeMinutes.value },
	}),
);
const externalUpdateMessage = computed(() =>
	locale.baseText('agents.builder.externalUpdate.mcp', {
		interpolate: { time: externalUpdateTime.value },
	}),
);

function clearExternalUpdate() {
	clearTimeout(externalUpdateTimer);
	clearInterval(externalUpdateAgeTimer);
	externalUpdateAt = 0;
	externalUpdateAgeMinutes.value = 0;
	recentExternalUpdate.value = null;
}

watch([projectId, agentId], clearExternalUpdate);

const canApplyPushedAgentUpdate = computed(
	() =>
		!isEditingLocked.value &&
		!configAutosave.hasPendingSave.value &&
		!skillAutosave.hasPendingSave.value &&
		!mcpAutosave.hasPendingSave.value,
);

/**
 * Refetch, then run the "mark pending agent persisted" continuation — but only
 * against the agent the refresh was scheduled for. Both the timer callback and
 * the idle replay below capture their target up front and race an `await`, so
 * a target switch in between must not let A's refresh mark pending agent B
 * persisted.
 */
async function refreshAndMarkUpdated(
	targetProjectId: string,
	targetAgentId: string,
	source?: string,
) {
	await refreshArtifactShell();
	if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
	onAgentUpdateRefreshed(source);
}

function scheduleExternalRefresh(onlyWhenIdle = false, source?: string) {
	clearTimeout(externalRefreshTimer);
	const targetProjectId = projectId.value;
	const targetAgentId = agentId.value;
	externalRefreshTimer = setTimeout(() => {
		// A push that lands mid-autosave is deferred, not dropped: if the local
		// write was accepted first there is no 409 to catch the newer remote
		// state, so this tab would keep the older config. Replayed once idle.
		if (onlyWhenIdle && !canApplyPushedAgentUpdate.value) {
			pendingExternalRefresh.value = true;
			pendingExternalRefreshSource = source;
			return;
		}
		void refreshAndMarkUpdated(targetProjectId, targetAgentId, source).catch(
			handleArtifactRefreshError,
		);
	}, getDebounceTime(400));
}

watch(canApplyPushedAgentUpdate, (idle) => {
	if (idle && initialized.value) {
		void replayPendingExternalRefresh().catch(handleArtifactRefreshError);
	}
});

function onExternalAgentUpdated(event?: AgentUpdatedEvent) {
	if (event?.source === 'agent-builder') return;
	if (!event?.agentId || event.agentId !== agentId.value) return;
	// Mid-initialize the write may have landed after initialize()'s own config
	// fetch already resolved, so queue a replay instead of dropping the event.
	if (!initialized.value) {
		pendingExternalRefresh.value = true;
		pendingExternalRefreshSource = event.source;
		return;
	}
	scheduleExternalRefresh(event.source === 'push', event.source);
}

function onAgentPushMessage(event: PushMessage) {
	if (
		event.type !== 'agentUpdated' ||
		event.data.projectId !== projectId.value ||
		event.data.agentId !== agentId.value
	) {
		return;
	}
	if (event.data.source === 'mcp') {
		clearExternalUpdate();
		recentExternalUpdate.value = event.data;
		externalUpdateAt = Date.now();
		externalUpdateTimer = setTimeout(clearExternalUpdate, AGENT_EXTERNAL_UPDATE_NOTICE_DURATION);
		externalUpdateAgeTimer = setInterval(() => {
			externalUpdateAgeMinutes.value = Math.floor((Date.now() - externalUpdateAt) / TIME.MINUTE);
		}, TIME.MINUTE);
	}
	onExternalAgentUpdated({ agentId: event.data.agentId, source: 'push' });
}

async function replayPendingExternalRefresh() {
	if (!pendingExternalRefresh.value) return;
	pendingExternalRefresh.value = false;
	const source = pendingExternalRefreshSource;
	pendingExternalRefreshSource = undefined;
	await refreshAndMarkUpdated(projectId.value, agentId.value, source);
}

agentsEventBus.on('agentUpdated', onExternalAgentUpdated);
pushConnectionStore.pushConnect();
const removeAgentUpdateListener = pushConnectionStore.addEventListener(onAgentPushMessage);

// Serves a request from outside the builder to focus the eval surface (the
// assistant's post-setup suggestion). `immediate` so a request raised before
// this builder mounted is still honoured — which is the normal case, since the
// assistant reveals the agent artifact as part of accepting the suggestion.
watch(
	[() => agentEvalsStore.pendingEvalsFocus, agentId, visibleMainTabOptions, initialized],
	() => {
		if (!agentEvalsStore.pendingEvalsFocus) return;
		// Hold the request until initialize() resolves: `isUnsaved` — and so the tab
		// row — isn't settled before then, so deciding earlier would honour a
		// request for an agent whose Evals tab turns out to be hidden.
		if (!initialized.value) return;
		// Checked against the rendered tab row rather than the flag, so the request
		// can't select a tab the user has no way to see — `visibleMainTabOptions`
		// also drops everything but Agent while the agent is still unsaved.
		if (!visibleMainTabOptions.value.some((option) => option.value === 'evals')) return;

		const request = agentEvalsStore.consumeEvalsFocus(agentId.value);
		if (!request) return;
		activeMainTab.value = 'evals';
		if (request.generate) void onGenerateEvalCases();
	},
	{ immediate: true },
);

const headerActions = computed(() => {
	const actions: Array<ActionDropdownItem<string>> = [
		{
			id: 'export-json',
			label: locale.baseText('agents.builder.exportJson' as BaseTextKey),
			icon: 'download',
		},
	];

	if (effectiveCanEditAgent.value) {
		actions.push({
			id: 'import-json',
			label: locale.baseText('agents.builder.importJson' as BaseTextKey),
			icon: 'upload',
		});
	}

	if (agent.value) {
		actions.push({
			id: 'toggleFavorite',
			label:
				isFavorite.value === true
					? locale.baseText('favorites.remove')
					: locale.baseText('favorites.add'),
			icon: isFavorite.value === true ? 'star-filled' : 'star',
		});
	}

	actions.push({
		id: 'version-history',
		label: locale.baseText('agents.versionHistory.title'),
		icon: 'history',
		disabled: !agent.value?.hasPublishHistory,
		checked: isVersionHistoryOpen.value,
		divided: true,
	});

	if (canDeleteAgent.value) {
		actions.push({
			id: 'delete',
			label: locale.baseText('agents.builder.deleteAgent'),
			icon: 'trash-2',
			divided: true,
		});
	}

	return actions;
});

async function exportAgentJson() {
	if (!localConfig.value) return;

	try {
		await flushAutosave();
	} catch {
		return;
	}
	if (!localConfig.value) return;

	const blob = new Blob([`${JSON.stringify(localConfig.value, null, 2)}\n`], {
		type: 'application/json',
	});
	const url = URL.createObjectURL(blob);
	const name = localConfig.value.name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'agent';
	const link = Object.assign(document.createElement('a'), {
		href: url,
		download: `${name}.json`,
	});
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function openImportJsonModal() {
	if (!effectiveCanEditAgent.value) return;

	uiStore.openModalWithData({
		name: AGENT_JSON_IMPORT_MODAL_KEY,
		data: {
			onConfirm: replaceConfigAndScheduleSave,
		},
	});
}

async function onHeaderAction(action: string) {
	if (action === 'version-history') {
		onToggleVersionHistory();
		return;
	}
	if (action === 'export-json') {
		await exportAgentJson();
		return;
	}
	if (action === 'import-json') {
		openImportJsonModal();
		return;
	}
	if (action === 'toggleFavorite') {
		await favoritesStore.toggleFavorite(agentId.value, 'agent');
		return;
	}
	if (action === 'delete') {
		const confirmed = await openAgentConfirmationModal({
			title: locale.baseText('agents.delete.modal.title', {
				interpolate: { name: agentName.value },
			}),
			description: locale.baseText('agents.delete.modal.description', {
				interpolate: { name: agentName.value },
			}),
			confirmButtonText: locale.baseText('agents.delete.modal.button.delete'),
			cancelButtonText: locale.baseText('generic.cancel'),
		});
		if (confirmed !== MODAL_CONFIRM) return;

		// Drop any pending edits before navigation — the agent is being deleted and
		// the unmount flush must not save against it.
		await settleAutosave();
		configAutosave.cancelPendingAutosave();
		skillAutosave.cancelPendingAutosave();
		const capturedProjectId = projectId.value;

		try {
			await deleteAgent(rootStore.restApiContext, capturedProjectId, agentId.value);
			removeProjectAgentFromListCache(capturedProjectId, agentId.value);
			favoritesStore.removeFavoriteLocally(agentId.value, 'agent');
		} catch (error) {
			showError(error, 'Could not delete agent');
			return;
		}

		// Clear local agent state before router.replace so the component teardown
		// doesn't keep rendering data for an agent that no longer exists.
		agent.value = null;
		localConfig.value = null;
		// Targeted: an untargeted emit clears the whole capability-summary cache
		// and forces every mounted card/NDV for *unrelated* agents to refetch.
		agentsEventBus.emit('agentUpdated', { agentId: agentId.value, source: 'agent-builder' });

		// Target path. Built as a plain string rather than via a named route so
		// there's no risk of a named-route resolution race during the agent
		// component's teardown (a cause of the navigation silently failing).
		const targetPath = `/projects/${capturedProjectId}/agents`;

		try {
			await router.replace(targetPath);
		} catch {
			// Vue Router occasionally rejects with NavigationFailure during
			// teardown; fall through to the hard-navigate below so the user
			// always ends up on the list page.
		}

		// Safety net: if the SPA router didn't actually leave the agent route
		// (a guard rejected, a redirect kicked in, etc.), force a full browser
		// navigation to the list page. Without this, a failed SPA navigation
		// leaves the user stranded on a page for an agent that no longer
		// exists server-side.
		await nextTick();
		if (route.params.agentId) {
			window.location.assign(targetPath);
		}
	}
}

/**
 * Stand-in for the resource the create endpoint would have returned, so the
 * editor and its children can treat an unsaved agent like any other freshly
 * created one instead of every consumer having to handle a null agent.
 */
function draftAgentResource(personalisation: AgentJsonConfig['personalisation']): AgentResource {
	const now = new Date().toISOString();
	return {
		resourceType: 'agent',
		id: agentId.value,
		name: locale.baseText('agents.new.defaultName'),
		projectId: projectId.value,
		schema: personalisation ? { personalisation } : null,
		availableInMCP: false,
		isCompiled: false,
		isRunnable: false,
		hasPublishHistory: false,
		createdAt: now,
		updatedAt: now,
		versionId: null,
		activeVersionId: null,
		tools: {},
		skills: {},
		activeVersion: null,
	};
}

/**
 * True while a genuine target switch still owes the autosave-loop reset.
 * Set synchronously when a switching `initialize()` begins; cleared only by
 * `resetAutosaveLoops()`, so a same-target preserveState init that supersedes
 * the switching init inherits the obligation instead of dropping it.
 */
let autosaveResetPending = false;

function resetAutosaveLoops() {
	configAutosave.reset();
	skillAutosave.reset();
	mcpAutosave.reset();
	autosaveResetPending = false;
}

async function initialize({ preserveState = false }: { preserveState?: boolean } = {}) {
	const sessionsFetchRequestId = ++latestSessionsFetchRequestId;
	const targetProjectId = projectId.value;
	const targetAgentId = agentId.value;
	const targetAgentPending = isAgentPending.value;
	const targetArtifactPending = props.artifactAgentPending;
	const isCurrentInitialization = () =>
		!disposed && sessionsFetchRequestId === latestSessionsFetchRequestId;
	clearTimeout(externalRefreshTimer);
	// A refresh queued for the previous agent must not fire against this one.
	if (!preserveState) {
		initialized.value = false;
		sessionsStore.reset();
	}
	// A refresh queued before this (re)initialize is obsolete: it targeted the
	// agent that was current when the event fired, and the fetches below return
	// fresh data anyway. Only events arriving during this init need replaying.
	pendingExternalRefresh.value = false;
	try {
		if (preserveState) {
			// A same-ID pending → persisted hydration can supersede a genuine
			// A→B switch whose drain is still in flight. That switch's reset is
			// still owed — without it B inherits A's indicator and the flush
			// below would rethrow A's lastSaveError and abort B's init. The
			// loops only hold A's residue here (B can't schedule edits while
			// `initialized` is false), so resetting first is safe.
			if (autosaveResetPending) resetAutosaveLoops();
			// Same-agent hydration (pending → persisted): flush queued
			// config/skill/MCP snapshots before fetching so settle doesn't
			// drop a pending debounce. When AI-locked, flush cancels stale
			// queues and settle waits for in-flight writes.
			await flushAutosave();
			await settleAutosave();
		} else {
			// The reset obligation belongs to the target switch, not this init
			// instance: a same-target preserveState init that supersedes us
			// picks it up via this flag. Only `resetAutosaveLoops` clears it.
			autosaveResetPending = true;
			// Persist a pending MCP toggle before the new agent can replace its
			// snapshot. Other pending edits remain governed by their existing
			// switch/revert behavior.
			try {
				await Promise.all([
					configAutosave.settleAutosave(),
					skillAutosave.settleAutosave(),
					mcpAutosave.flushAutosave(),
				]);
			} finally {
				// Genuine A→B switch: always detach A's autosave loop from
				// `saveStatus`/`lastSaveError`, even when the drain throws —
				// otherwise B inherits A's indicator and A's lastSaveError
				// would abort B's later flush/publish. A stale init must not
				// reset: a newer genuine switch owns its own reset, and a newer
				// same-target hydration takes this one over via the flag.
				if (isCurrentInitialization()) resetAutosaveLoops();
			}
		}
		if (!isCurrentInitialization()) return;
		if (!preserveState) {
			agent.value = null;
			agentName.value = '';
			mcpAvailabilityOverride.value = null;
			activeChatSessionId.value = null;
			localConfig.value = null;
			connectedTriggers.value = [];
			agentFiles.value = [];
			agentFilesLoading.value = false;
			agentFilesUploading.value = false;
			deletingAgentFileId.value = null;
			repointConfig(targetProjectId, targetAgentId);
			repointConfigValidation(targetProjectId, targetAgentId);
		}

		// An artifact's pending marker can be stale — the chat may have created the
		// agent under this id, or a previous session's binding write may have failed
		// — and a blank draft over an existing row would autosave itself over that
		// row on the first edit. So confirm the row is really absent before
		// drafting. Only artifacts need this: a route-backed draft's id is minted
		// milliseconds earlier by the entry point and no other writer can reach it,
		// so the probe would be a guaranteed 404 on every "New agent" click.
		const probedAgent = targetArtifactPending
			? await probePendingAgentRow(targetProjectId, targetAgentId)
			: null;
		if (!isCurrentInitialization()) return;

		// An agent that does not exist yet has nothing to fetch: stand up the same
		// blank config the backend would have written, and let the first edit
		// create it (see `ensureAgentPersisted`). The personalisation backfill is
		// skipped too — it schedules a save, which would persist on mount alone.
		unboundExistingAgent.value = null;
		isUnsaved.value = targetAgentPending && !probedAgent;
		if (isUnsaved.value) {
			const draftConfig: AgentJsonConfig = {
				name: locale.baseText('agents.new.defaultName'),
				model: '',
				instructions: '',
				tools: [],
				skills: [],
			};
			// Seed the icon and gradient the backfill would normally add, so the
			// draft looks like any other new agent and the first save carries them.
			// Seeded rather than backfilled because the backfill schedules a save,
			// which would persist the agent on mount.
			localConfig.value = addMissingAgentPersonalisation(draftConfig) ?? draftConfig;
			agent.value = draftAgentResource(localConfig.value.personalisation);
			agentName.value = agent.value.name;
		} else {
			await Promise.all([
				fetchAgent(targetProjectId, targetAgentId, probedAgent ?? undefined),
				fetchConfig(targetProjectId, targetAgentId),
				fetchAgentFiles(targetProjectId, targetAgentId),
				refreshConfigValidation(targetProjectId, targetAgentId),
			]);
			if (!isCurrentInitialization()) return;
			persistMissingPersonalisationGradient();
			// Hand the host the row the stale marker pointed at so it can retire the
			// pending state.
			if (probedAgent) void adoptExistingPendingRow(probedAgent);
		}
		if (!isCurrentInitialization()) return;
		// Keep agent credential pickers aligned with the workflow editor: load only
		// credentials the current user can use in this project context.
		credentialsStore.setCredentials([]);
		await Promise.all([
			credentialsStore.fetchUsableCredentials({ projectId: targetProjectId }),
			credentialsStore.fetchCredentialTypes(false),
		]).catch(() => undefined);
		if (!isCurrentInitialization()) return;
		// A stale initialize can resume after a newer one has already taken ownership of polling.
		// Stop any in-flight auto-refresh from the previous agent before kicking
		// off a new fetch — keeps the store tied to the current project/agent.
		sessionsStore.stopAutoRefresh();
		if (!isUnsaved.value) {
			void sessionsStore
				.fetchThreads(targetProjectId, targetAgentId)
				.catch((error: unknown) => {
					if (!isCurrentInitialization()) return;
					showError(error, locale.baseText('agentSessions.showError.load'));
				})
				.finally(() => {
					if (!isCurrentInitialization()) return;
					sessionsStore.startAutoRefresh();
				});
		}
		const connectedTriggersAtBaselineStart = connectedTriggers.value;
		void (async () => {
			// Non-fatal — on failure, leave connectedTriggers unchanged.
			const integrations = await ensureIntegrationsCatalog(targetProjectId).catch(() => []);
			if (!isCurrentInitialization()) return;
			const triggerTypes = integrations.map((i) => i.type);
			const connected = await builderTelemetry.fetchInitialTriggersBaseline(triggerTypes);
			if (
				isCurrentInitialization() &&
				connected &&
				connectedTriggers.value === connectedTriggersAtBaselineStart
			) {
				connectedTriggers.value = connected;
			}
		})();

		if (!isArtifactMode.value && route.query[NEW_SESSION_PARAM] === 'true') {
			persistedPreviewOpen.value = true;
			onNewChat();
		} else {
			if (!isArtifactMode.value && route.query[OPEN_PREVIEW_PARAM] === 'true') {
				persistedPreviewOpen.value = true;
			}
			if (isPreviewActive.value) bindPreviewSession();
		}

		if (!isArtifactMode.value && (route.query.prompt || route.query.expandBuildChat)) {
			void router.replace({
				query: { ...route.query, prompt: undefined, expandBuildChat: undefined },
			});
		}
	} catch (error: unknown) {
		if (isCurrentInitialization()) {
			showError(error, locale.baseText('agents.builder.loadError'));
		}
	} finally {
		if (isCurrentInitialization()) {
			initialized.value = true;
			void replayPendingExternalRefresh().catch(handleArtifactRefreshError);
			warmAgentKnowledgeSandboxForPage();
			// Acquire the collaboration write lock for the first opener. Only the
			// standalone builder participates in multi-tab/multi-user locking —
			// artifact mode is the AI builder, which has its own lock, and the
			// standalone preview has no editing controls.
			if (!isArtifactMode.value && !isStandalonePreview.value && !isUnsaved.value) {
				void agentCollaborationStore.initialize(projectId.value, agentId.value);
			}
		}
	}
}

watch(
	[projectId, agentId],
	([nextProjectId, nextAgentId], [previousProjectId, previousAgentId]) => {
		if (
			!isArtifactMode.value ||
			(nextProjectId === previousProjectId && nextAgentId === previousAgentId)
		) {
			return;
		}

		persistedPreviewOpen.value = props.artifactPreviewOpen ?? false;
		activeChatSessionId.value = null;
	},
);

// When a pending artifact becomes persisted under the same id, hydrate its
// agent-scoped state without unmounting the editor or any in-flight setup UI.
watch(
	[projectId, agentId, isAgentPending],
	([nextProjectId, nextAgentId, pending], [previousProjectId, previousAgentId]) => {
		const sameTarget = nextProjectId === previousProjectId && nextAgentId === previousAgentId;
		void initialize({ preserveState: sameTarget && !pending });
	},
	{ immediate: true },
);

// Builder and preview share the same component, so switching between them
// does not unmount and release the write lock. Release it when entering
// preview (no editing controls) and reacquire when returning to the builder.
watch(isStandalonePreview, (isPreview, wasPreview) => {
	if (isPreview === wasPreview || isArtifactMode.value) return;
	if (isPreview) {
		agentCollaborationStore.terminate();
	} else if (initialized.value && !isUnsaved.value) {
		void agentCollaborationStore.initialize(projectId.value, agentId.value);
	}
});

// Browser tab close does not run Vue's onBeforeUnmount, so the collaboration
// lock would linger until its TTL expires. Release it during beforeunload
// while the WebSocket is still alive to deliver the agentClosed message.
// terminate() is idempotent, so a double call with onBeforeUnmount is safe.
useEventListener(window, 'beforeunload', () => {
	if (!isArtifactMode.value && !isStandalonePreview.value) {
		agentCollaborationStore.terminate();
	}
});

onBeforeUnmount(async () => {
	disposed = true;
	latestSessionsFetchRequestId++;
	agentsEventBus.off('agentUpdated', onExternalAgentUpdated);
	removeAgentUpdateListener();
	pushConnectionStore.pushDisconnect();
	clearTimeout(externalRefreshTimer);
	clearExternalUpdate();
	sessionsStore.stopAutoRefresh();
	// Drain pending saves before releasing the write lock so in-flight
	// writes land while this tab still holds the lock. Without this,
	// terminate() releases the lock immediately and the backend accepts
	// the queued saves after release — a new writer or Instance AI mutation
	// can then be overwritten by stale config or MCP state.
	if (!isArtifactMode.value) {
		try {
			await flushAutosave();
		} catch {
			// best-effort flush; the lock is still released below
		}
		agentCollaborationStore.terminate();
	} else {
		void flushAutosave().catch(() => {});
	}
});

// If the user is on Preview before the sessions list finishes loading, latch onto
// the most recent thread as soon as it arrives. Also fires when loading
// finishes with no threads so we can mint a fresh ephemeral session instead
// of leaving the chat panel empty.
watch(previewSessionsLoading, (isLoading, wasLoading) => {
	if (!wasLoading || isLoading || !initialized.value) return;
	if (!isPreviewActive.value) return;
	if (effectiveSessionId.value) return;
	bindPreviewSession();
});

watch(
	[isPreviewActive, initialized],
	([open, isInitialized]) => {
		if (open) persistedPreviewOpen.value = true;
		if (open && isInitialized && !previewSessionsLoading.value) bindPreviewSession();
	},
	{ immediate: true },
);

function isNotFoundError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'httpStatusCode' in error &&
		error.httpStatusCode === 404
	);
}

const pendingPreviewValidations = new Set<string>();
async function ensurePreviewSessionAvailable(sessionId: string) {
	if (previewSessionsLoading.value || currentSessionIsLocallyMinted.value) return;
	if (currentSession.value) {
		if (!currentSession.value.canContinueInPreview) acceptPreviewSession(currentSession.value);
		return;
	}
	const targetProjectId = projectId.value;
	const targetAgentId = agentId.value;
	const validationKey = JSON.stringify([targetProjectId, targetAgentId, sessionId]);
	if (pendingPreviewValidations.has(validationKey)) return;
	pendingPreviewValidations.add(validationKey);
	const isCurrent = () =>
		isPreviewActive.value &&
		!isStaleAgentTarget(targetProjectId, targetAgentId) &&
		effectiveSessionId.value === sessionId;
	try {
		const { thread } = await sessionsStore.getThreadDetail(
			targetProjectId,
			targetAgentId,
			sessionId,
		);
		if (isCurrent()) acceptPreviewSession(thread);
	} catch (error) {
		if (!isCurrent()) return;
		if (isNotFoundError(error)) {
			selectLatestPreviewSession();
		} else {
			showError(error, locale.baseText('agentSessions.showError.load'));
		}
	} finally {
		pendingPreviewValidations.delete(validationKey);
	}
}

function acceptPreviewSession(thread: AgentExecutionThread) {
	if (thread.canContinueInPreview) {
		sessionsStore.upsertThread(thread);
		return;
	}
	void router.replace({
		name: AGENT_SESSION_DETAIL_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value, threadId: thread.id },
	});
}

watch(
	[effectiveSessionId, initialized, isPreviewActive, previewSessionsLoading],
	([sessionId, isInitialized, isOpen, isLoading]) => {
		if (!sessionId || !isInitialized || !isOpen || isLoading) return;
		void ensurePreviewSessionAvailable(sessionId);
	},
	{ immediate: true },
);

watch(
	[() => props.artifactPreviewSessionId, initialized],
	([sessionId, isInitialized]) => {
		if (!isArtifactMode.value || !isInitialized || !sessionId) return;
		openArtifactPreview(sessionId);
	},
	{ immediate: true },
);

function exitContinueMode() {
	clearContinueSessionParam();
}

function onConfirmVectorStore(vectorStore: AgentJsonVectorStoreConfig, originalName?: string) {
	const vectorStores = localConfig.value?.vectorStores ?? [];
	const matchName = originalName ?? vectorStore.name;
	const index = vectorStores.findIndex((existing) => existing.name === matchName);
	const nextVectorStores =
		index === -1
			? [...vectorStores, vectorStore]
			: vectorStores.map((existing, i) => (i === index ? vectorStore : existing));
	onConfigFieldUpdate({ vectorStores: nextVectorStores });
}

function onOpenAddVectorStoreModal() {
	const vectorStores = localConfig.value?.vectorStores ?? [];
	uiStore.openModalWithData({
		name: AGENT_VECTOR_STORES_MODAL_KEY,
		data: {
			projectId: projectId.value,
			agentId: agentId.value,
			existingNames: vectorStores.map((vectorStore) => vectorStore.name),
			onConfirm: onConfirmVectorStore,
		},
	});
}

function onOpenEditVectorStoreModal(vectorStore: AgentJsonVectorStoreConfig) {
	const vectorStores = localConfig.value?.vectorStores ?? [];
	uiStore.openModalWithData({
		name: AGENT_VECTOR_STORES_MODAL_KEY,
		data: {
			projectId: projectId.value,
			agentId: agentId.value,
			existingNames: vectorStores.map((existing) => existing.name),
			vectorStore,
			onConfirm: (updated: AgentJsonVectorStoreConfig) =>
				onConfirmVectorStore(updated, vectorStore.name),
			onRemove: (name: string) => {
				onConfigFieldUpdate({
					vectorStores: (localConfig.value?.vectorStores ?? []).filter(
						(existing) => existing.name !== name,
					),
				});
			},
		},
	});
}

function onRemoveVectorStore(vectorStore: AgentJsonVectorStoreConfig) {
	onConfigFieldUpdate({
		vectorStores: (localConfig.value?.vectorStores ?? []).filter(
			(existing) => existing.name !== vectorStore.name,
		),
	});
}

function onContinueLoaded({ sessionId, count }: AgentContinueLoadedEvent) {
	if (
		count === 0 &&
		currentSessionIsEphemeral.value &&
		sessionId === effectiveSessionId.value &&
		sessionId === continueSessionId.value
	) {
		exitContinueMode();
	}
}

function onSwitchAgent(nextAgentId: string) {
	if (!nextAgentId || nextAgentId === agentId.value) return;
	// The assistant thread is bound to this agent; the next agent gets its own.
	const { [ASSISTANT_THREAD_PARAM]: _assistantThread, ...query } = route.query;
	void router.push({
		name: isStandalonePreview.value ? AGENT_PREVIEW_VIEW : AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: nextAgentId },
		query: isStandalonePreview.value ? {} : query,
	});
}
</script>

<template>
	<div :class="$style.root">
		<AgentPreviewHeader
			v-if="isStandalonePreview"
			:agent-name="agent?.name ?? agentName"
			:agent-href="agentBuilderHref"
			:session-title="currentSessionTitle"
			:session-options="sessionMenu"
			:has-trace="currentSessionHasMessages && Boolean(effectiveSessionId)"
			:can-delete-session="canDeletePreviewSession"
			:is-deleting-session="isDeletingSession"
			@back="returnToBuilderFromPreview"
			@delete-session="onDeletePreviewSession"
			@new-session="startNewPreviewSession"
			@session-select="onSessionPick"
			@view-trace="viewPreviewTrace"
		/>
		<AgentBuilderHeader
			v-else
			:agent="agent"
			:project-id="projectId"
			:agent-id="agentId"
			:project-name="projectName"
			:header-actions="headerActions"
			:save-status="saveStatus"
			:before-revert-to-published="beforeRevertToPublished"
			:artifact-mode="isArtifactMode"
			:editing-locked="isEditingLocked"
			:config-validation-status="configValidation?.status ?? null"
			:config-validation-issues="configValidation?.issues ?? []"
			:before-publish="refreshValidationBeforePublish"
			:is-preview-open="isPreviewDockOpen"
			@header-action="onHeaderAction"
			@open-preview="onOpenPreview"
			@close-preview="closePreviewDock"
			@published="onPublished"
			@unpublished="onUnpublished"
			@reverted="onReverted"
			@switch-agent="onSwitchAgent"
		/>
		<AgentCollaborationBanner v-if="!isArtifactMode" />
		<div
			v-if="!isArtifactMode && instanceAiAvailable && !isAiPanelOpen"
			:class="$style.aiToggleBar"
		>
			<N8nTooltip :content="locale.baseText('agents.builder.header.editWithAi')">
				<N8nButton
					variant="subtle"
					size="medium"
					icon-only
					:aria-label="locale.baseText('agents.builder.header.editWithAi')"
					:disabled="!agent"
					data-testid="agent-builder-instance-ai-btn"
					@click="toggleAiPanel"
				>
					<template #icon>
						<N8nAssistantIcon size="large" />
					</template>
				</N8nButton>
			</N8nTooltip>
		</div>
		<div :class="$style.externalUpdateNotice" role="status" aria-live="polite" aria-atomic="true">
			<N8nCanvasPill
				v-if="recentExternalUpdate"
				:class="$style.externalUpdatePill"
				data-testid="agent-builder-external-update"
			>
				<template #icon>
					<N8nIcon icon="info" aria-hidden="true" />
				</template>
				<span :class="$style.externalUpdateContent">
					<span :class="$style.externalUpdateText">{{ externalUpdateMessage }}</span>
					<N8nIconButton
						:class="$style.externalUpdateDismiss"
						icon="x"
						variant="ghost"
						size="xsmall"
						:aria-label="locale.baseText('generic.dismiss')"
						:title="locale.baseText('generic.dismiss')"
						data-testid="agent-builder-external-update-dismiss"
						@click="clearExternalUpdate"
					/>
				</span>
			</N8nCanvasPill>
		</div>
		<div
			ref="builderContainer"
			data-testid="agent-builder-container"
			:class="[
				$style.builder,
				{
					[$style.previewOpen]: isPreviewDockOpen,
					[$style.aiPanelOpen]: showAiPanel,
					[$style.previewResizing]: isPreviewDockResizing,
				},
			]"
			:style="{
				'--agent-ai-panel-width': `${renderedSidePanelWidths.ai}px`,
				'--agent-preview-chat-column-width': `${renderedSidePanelWidths.preview}px`,
				'--agent-builder-editor-min-width': `${AGENT_BUILDER_EDITOR_MIN_WIDTH}px`,
			}"
		>
			<aside v-if="showAiPanel" :class="$style.aiDock" data-testid="agent-ai-dock">
				<N8nResizeWrapper
					:width="renderedSidePanelWidths.ai"
					:min-width="AGENT_BUILDER_SIDE_PANEL_MIN_WIDTH"
					:max-width="720"
					:supported-directions="['right']"
					@resize="onAiPanelResize"
				>
					<InstanceAiChatPanel
						ref="aiPanelRef"
						:key="agentId"
						:subject="instanceAiEmbedSubject"
						:launch="instanceAiEmbedLaunch"
						:thread-id="aiThreadId"
						:before-new-thread="flushAutosave"
						:before-send="flushAutosave"
						data-testid="agent-ai-chat-panel"
						@update:thread-id="onAiThreadIdChange"
						@update:building="embeddedAiBuilding = $event"
						@update:processing="embeddedAiProcessing = $event"
						@close="isAiPanelOpen = false"
					>
						<template v-if="showAgentIntro" #empty>
							<AgentBuilderIntro @select="onApplyTemplate" />
						</template>
					</InstanceAiChatPanel>
				</N8nResizeWrapper>
			</aside>
			<div
				v-if="embeddedAiProcessing || embeddedAiBuilding"
				:class="$style.activityArea"
				:style="{
					left: showAiPanel ? `${renderedSidePanelWidths.ai}px` : undefined,
					right: isPreviewDockOpen ? `${renderedSidePanelWidths.preview}px` : undefined,
				}"
				data-testid="agent-builder-activity-area"
			>
				<AgentBuildingIndicator />
			</div>
			<div v-if="showBuilderLoading" :class="$style.loading">
				<N8nIcon icon="spinner" spin />
			</div>
			<template v-else>
				<AgentPreviewChatPage
					v-if="isStandalonePreview"
					layout="page"
					:initialized="initialized && previewSessionReady"
					:project-id="projectId"
					:agent-id="agentId"
					:agent="agent"
					:local-config="localConfig"
					:connected-triggers="connectedTriggers"
					:effective-session-id="effectiveSessionId"
					:new-session="currentSessionIsEphemeral"
					:can-send-to-assistant="instanceAiAvailable"
					:before-send="beforePreviewSend"
					@continue-loaded="onContinueLoaded"
					@session-created="markSessionCreated"
					@open-build="returnToBuilderFromPreview"
					@send-to-assistant="onSendPreviewToAssistant"
				/>

				<AgentBuilderEditorColumn
					v-else
					v-model:active-main-tab="activeMainTab"
					:class="$style.editorColumn"
					:local-config="localConfig"
					:agent="agent"
					:project-id="projectId"
					:agent-id="agentId"
					:agent-files="agentFiles"
					:agent-files-loading="agentFilesLoading"
					:agent-files-uploading="agentFilesUploading"
					:knowledge-base-enabled="isKnowledgeBaseEnabled"
					:deleting-agent-file-id="deletingAgentFileId"
					:applied-skills="appliedSkills"
					:connected-triggers="connectedTriggers"
					:can-edit-agent="effectiveCanEditAgent"
					:can-execute-agent="canExecuteAgent"
					:agent-available-in-mcp="agentAvailableInMcp"
					:tasks-reload-key="tasksReloadKey"
					:main-tab-options="visibleMainTabOptions"
					:agent-unsaved="isUnsaved"
					:ensure-agent-persisted="ensureAgentPersisted"
					:executions-description="executionsDescription"
					:generating-eval-cases="agentEvalsStore.isGeneratingCases(agentId)"
					:artifact-mode="isArtifactMode"
					:prevent-scroll="isPreviewDockResizing"
					:config-validation-issues="configValidation?.issues ?? []"
					@update:config="onConfigFieldUpdate"
					@open-tool="caps.onOpenToolFromList"
					@open-skill="caps.onOpenSkillFromList"
					@add-tool="caps.onOpenAddToolModal"
					@add-skill="caps.onOpenAddSkillModal"
					@upload-files="onUploadAgentFiles"
					@delete-file="onDeleteAgentFile"
					@add-vector-store="onOpenAddVectorStoreModal"
					@edit-vector-store="onOpenEditVectorStoreModal"
					@remove-vector-store="onRemoveVectorStore"
					@remove-tool="caps.onRemoveTool"
					@remove-skill="caps.onRemoveSkill"
					@update:connected-triggers="caps.onConnectedTriggersUpdate"
					@trigger-added="caps.onTriggerAdded"
					@toggle-task="caps.onToggleTask"
					@toggle-mcp-access="onToggleMcpAccess"
					@tasks-changed="() => onConfigUpdated()"
					@preview-task="onPreviewTask"
					@agent-changed="refreshAgentAfterIntegrationChange"
					@generate-eval-cases="onGenerateEvalCases"
					@open-preview="onOpenPreview"
				/>

				<AgentVersionHistoryPanel
					v-if="!isStandalonePreview && isVersionHistoryOpen"
					ref="versionHistoryPanel"
					:project-id="projectId"
					:agent-id="agentId"
					:has-unpublished-changes="
						Boolean(agent?.activeVersionId) && agent?.versionId !== agent?.activeVersionId
					"
					:agent-name="agent?.name ?? agentName"
					:editing-locked="isEditingLocked"
					@close="onCloseVersionHistory"
					@reverted="onReverted"
					@published="onPublished"
					@unpublished="onUnpublished"
				/>

				<N8nResizeWrapper
					v-if="!isStandalonePreview"
					:class="[$style.previewResizeWrapper, { [$style.previewResizeOpen]: isPreviewDockOpen }]"
					:width="renderedSidePanelWidths.preview"
					:min-width="AGENT_BUILDER_SIDE_PANEL_MIN_WIDTH"
					:supported-directions="['left']"
					:grid-size="8"
					@resizestart="isPreviewDockResizing = true"
					@resize="onPreviewDockResize"
					@resizeend="isPreviewDockResizing = false"
				>
					<AgentPreviewDock
						:is-open="isPreviewDockOpen"
						:session-title="currentSessionTitle"
						:session-options="sessionMenu"
						:has-session="currentSessionHasMessages"
						:initialized="initialized && previewSessionReady"
						:project-id="projectId"
						:agent-id="agentId"
						:agent="agent"
						:local-config="localConfig"
						:connected-triggers="connectedTriggers"
						:effective-session-id="effectiveSessionId"
						:new-session="currentSessionIsEphemeral"
						:initial-prompt="taskPreviewPrompt"
						:can-delete-session="canDeletePreviewSession"
						:is-deleting-session="isDeletingSession"
						:can-send-to-assistant="instanceAiAvailable"
						:before-send="beforePreviewSend"
						@view-trace="viewPreviewTrace"
						@new-session="startNewPreviewSession"
						@delete-session="onDeletePreviewSession"
						@session-select="onSessionPick"
						@close="closePreviewDock"
						@continue-loaded="onContinueLoaded"
						@session-created="markSessionCreated"
						@send-to-assistant="onSendPreviewToAssistant"
						@initial-consumed="taskPreviewPrompt = undefined"
					/>
				</N8nResizeWrapper>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.root {
	--n8n--agent-builder-header-height: var(--height--4xl);

	position: relative;
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.builder {
	position: relative;
	display: flex;
	height: 100%;
	min-height: 0;
	overflow: hidden;
	padding-right: 0;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	transition:
		padding-left var(--duration--snappy) var(--easing--ease-out),
		padding-right var(--duration--snappy) var(--easing--ease-out);

	&.previewOpen {
		padding-right: var(--agent-preview-chat-column-width, 30rem);
	}

	&.aiPanelOpen {
		padding-left: var(--agent-ai-panel-width);
	}

	&.previewResizing {
		transition: none;
	}

	@include motion.reduced-motion;
}

.previewResizeWrapper {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: var(--agent-preview-chat-column-width);
	max-width: 100%;
	z-index: 1;
	pointer-events: none;
}

.previewResizeOpen {
	pointer-events: auto;
}

.loading {
	flex: 1 1 auto;
	display: flex;
	align-items: center;
	justify-content: center;
}

.showBuildChatButton {
	position: absolute;
	top: var(--spacing--2xs);
	left: var(--spacing--2xs);
	z-index: 3;
}

.editorColumn {
	flex: 1 1 auto;
	min-width: 0;
}

.activityArea {
	position: absolute;
	inset: 0;
	z-index: 2;
	pointer-events: none;
}

.aiDock {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	width: var(--agent-ai-panel-width);
	border-right: var(--border);
	background: var(--background--surface);
	z-index: 1;
}

.externalUpdateNotice {
	position: absolute;
	top: var(--height--4xl);
	right: 0;
	left: 0;
	z-index: 10;
	display: flex;
	justify-content: center;
	padding-inline: var(--spacing--sm);
	pointer-events: none;
}

.externalUpdatePill {
	max-width: 100%;
	height: auto;
	min-height: var(--height--xl);
	margin-block: var(--spacing--xs);
	padding-block: var(--spacing--2xs);
	color: var(--color--neutral-white);
}

.externalUpdateContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.externalUpdateText {
	white-space: normal;
	overflow-wrap: anywhere;
}

.externalUpdateDismiss {
	flex-shrink: 0;
	color: var(--color--neutral-white);
	pointer-events: auto;
}

.aiToggleBar {
	position: absolute;
	top: calc(var(--n8n--agent-builder-header-height) + var(--spacing--2xs));
	left: var(--spacing--2xs);
	z-index: 1;
}
</style>
