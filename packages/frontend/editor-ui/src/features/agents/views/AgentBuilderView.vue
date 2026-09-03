<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, useTemplateRef } from 'vue';
import { useStorage } from '@vueuse/core';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import { N8nAssistantIcon, N8nButton, N8nIcon, type ActionDropdownItem } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILE_SIZE_MB,
	MAX_AGENT_FILES_PER_UPLOAD,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
	addMissingAgentPersonalisation,
	type AgentFileDto,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { MODAL_CONFIRM } from '@/app/constants';
import { deepCopy } from 'n8n-workflow';
import {
	getAgent,
	createAgent,
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
	AgentFixWithAssistantEvent,
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
import { useAgentConfigAutosave } from '../composables/useAgentConfigAutosave';
import { useAgentBuilderMainTabs } from '../composables/useAgentBuilderMainTabs';
import { useAgentCapabilitiesActions } from '../composables/useAgentCapabilitiesActions';
import {
	removeProjectAgentFromListCache,
	upsertProjectAgentsListCache,
} from '../composables/useProjectAgentsList';
import {
	useInstanceAiAgentPreviewHandoff,
	type AgentPreviewHandoffParams,
} from '@/features/ai/instanceAi/composables/useInstanceAiAgentPreviewHandoff';
import {
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
	AGENT_JSON_IMPORT_MODAL_KEY,
	AGENT_VECTOR_STORES_MODAL_KEY,
	CONTINUE_SESSION_ID_PARAM,
	NEW_SESSION_PARAM,
} from '../constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { agentsEventBus, type AgentUpdatedEvent } from '../agents.eventBus';
import AgentBuilderHeader from '../components/AgentBuilderHeader.vue';
import AgentBuilderEditorColumn from '../components/AgentBuilderEditorColumn.vue';
import AgentPreviewHeader from '../components/AgentPreviewHeader.vue';
import AgentPreviewChatPage from '../components/AgentPreviewChatPage.vue';
import AgentPreviewDock from '../components/AgentPreviewDock.vue';
import AgentVersionHistoryPanel from '../components/VersionHistory/AgentVersionHistoryPanel.vue';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { INSTANCE_AI_PENDING_AGENT_ID_STATE } from '@/features/ai/instanceAi/constants';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { buildAgentFixWithAssistantPrompt } from '../utils/fix-with-assistant';

const props = withDefaults(
	defineProps<{
		artifactMode?: boolean;
		artifactProjectId?: string;
		artifactAgentId?: string;
		/** Preview session to restore when this agent opens as an Instance AI artifact. */
		artifactPreviewSessionId?: string;
		/** True while the AI is actively building/mutating this agent in artifact mode — disables editing/publishing without hiding content. */
		artifactEditingLocked?: boolean;
		/** True when no agent row exists behind `artifactAgentId` yet — the builder
		 *  renders a local default config and creates the agent on the first edit. */
		artifactAgentPending?: boolean;
	}>(),
	{
		artifactMode: false,
		artifactProjectId: undefined,
		artifactAgentId: undefined,
		artifactPreviewSessionId: undefined,
		artifactEditingLocked: false,
		artifactAgentPending: false,
	},
);

const emit = defineEmits<{
	/** The agent behind an unsaved artifact now exists. */
	persisted: [agent: AgentResource];
	'preview-open-change': [open: boolean];
	/** The agent name was successfully saved. */
	'name-saved': [name: string];
	'assistant-handoff': [params: AgentPreviewHandoffParams];
}>();

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const { openAgentArtifactThread } = useInstanceAiHandoff();
const instanceAiAvailable = useInstanceAiAvailable();
const { canSendPreviewToInstanceAi, sendPreviewSessionToInstanceAi } =
	useInstanceAiAgentPreviewHandoff();
const sessionsStore = useAgentSessionsStore();
const agentEvalsStore = useAgentEvalsStore();
const credentialsStore = useCredentialsStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const favoritesStore = useFavoritesStore();
const mcpStore = useMCPStore();
const mcp = useMcp();

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
const isStandalonePreview = computed(
	() => !isArtifactMode.value && route.name === AGENT_PREVIEW_VIEW,
);
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
const pendingAgentIdFromHistory = (history.state as Record<string, unknown>)[
	INSTANCE_AI_PENDING_AGENT_ID_STATE
];
const routePendingAgentId = ref(
	typeof pendingAgentIdFromHistory === 'string' ? pendingAgentIdFromHistory : null,
);
const isRouteAgentPending = computed(() => {
	if (isArtifactMode.value) return false;
	return routePendingAgentId.value === agentId.value;
});
const isAgentPending = computed(() => props.artifactAgentPending || isRouteAgentPending.value);
const previewOpenStorageKey = computed(function getPreviewOpenStorageKey() {
	return `N8N_AGENT_PREVIEW_OPEN:${projectId.value}:${agentId.value}`;
});
const persistedPreviewOpen = useStorage(previewOpenStorageKey, false);
const isPreviewDockOpen = computed(() => !isStandalonePreview.value && persistedPreviewOpen.value);
const isPreviewActive = computed(() => isStandalonePreview.value || isPreviewDockOpen.value);
const agentBuilderHref = computed(function getAgentBuilderHref() {
	return router.resolve({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
		query: {
			[CONTINUE_SESSION_ID_PARAM]: effectiveSessionId.value,
		},
	}).href;
});
const isFavorite = computed(() => favoritesStore.isFavorite(agentId.value, 'agent'));

const {
	canUpdate: canEditAgent,
	canDelete: canDeleteAgent,
	canExecute: canExecuteAgent,
} = useAgentPermissions(projectId);
// Combines permission with the artifact-mode build lock: while the AI is
// actively building/mutating this agent, editing is disabled even for a user
// who otherwise has permission — mirrors the workflow artifact's read-only
// lock during a build.
const effectiveCanEditAgent = computed(() => canEditAgent.value && !props.artifactEditingLocked);

const isVersionHistoryOpen = ref(false);

watch(
	isPreviewDockOpen,
	(open) => {
		emit('preview-open-change', open);
	},
	{ immediate: true },
);

async function onSendPreviewToAssistant(event?: AgentFixWithAssistantEvent) {
	const threadId = effectiveSessionId.value;
	if (!threadId || !agentId.value || !projectId.value) return;
	const session = sessionsStore.threads.find(({ id }) => id === threadId);
	const sessionTitle = session?.title?.trim() || currentSessionTitle.value || undefined;
	const sessionNumber = session?.sessionNumber;

	const params: AgentPreviewHandoffParams = {
		projectId: projectId.value,
		agentId: agentId.value,
		threadId,
		agentName: agentName.value || undefined,
		agentIcon: localConfig.value?.personalisation?.icon,
		sessionTitle,
		...(event
			? {
					executionId: event.executionId,
					initialDraft: buildAgentFixWithAssistantPrompt(
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
				}
			: {}),
	};

	if (isArtifactMode.value) {
		emit('assistant-handoff', params);
		return;
	}

	await sendPreviewSessionToInstanceAi(params);
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
const agentName = ref('');
const agent = ref<AgentResource | null>(null);
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
	currentSessionHasMessages,
	currentSessionTitle,
	currentSessionIsEphemeral,
	sessionMenu,
	setSessionInUrl,
	clearContinueSessionParam,
	onSessionPick,
	onNewChat,
} = useAgentBuilderSession({ routeBacked: computed(() => !isArtifactMode.value) });

// Config
const { config, fetchConfig, updateConfig, repoint: repointConfig } = useAgentConfig();
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
) {
	const data = await getAgent(rootStore.restApiContext, targetProjectId, targetAgentId);
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
	return effectiveSessionId.value ?? sessionsStore.threads?.[0]?.id;
}

async function openPreview(preferredSessionId?: string) {
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

async function onOpenPreview() {
	if (!isBuilt.value) return;

	try {
		await flushAutosave();
	} catch {
		return;
	}
	if (isArtifactMode.value) {
		openArtifactPreview();
	} else {
		await openPreview();
	}
	telemetry.track(TELEMETRY_EVENT.AGENTS.USER_OPENED_AGENT_PREVIEW, { agent_id: agentId.value });
}

function getBuilderQuery() {
	const query = { ...route.query };
	delete query[CONTINUE_SESSION_ID_PARAM];
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
 * chosen yet. Prefer the most recent thread — users land back where they left
 * off — and only mint a fresh ephemeral session when there is no history.
 */
function bindPreviewSession() {
	if (effectiveSessionId.value) return;
	const latest = sessionsStore.threads?.[0];
	if (latest) {
		setSessionInUrl(latest.id);
		return;
	}
	// Still loading — defer the decision; the watcher below will rebind once
	// threads arrive, falling back to a fresh ephemeral session if the list
	// comes back empty.
	if (sessionsStore.loading) return;
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

interface ConfigAutosaveSnapshot {
	type: 'config';
	projectId: string;
	agentId: string;
	config: AgentJsonConfig;
}

interface SkillAutosaveSnapshot {
	type: 'skill';
	projectId: string;
	agentId: string;
	skillId: string;
	skill: AgentSkill;
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
 * one (the builder path adopts a same-project still-unconfigured row on an id
 * collision; REST create stays strict).
 */
const persistFlights = new Map<string, Promise<void>>();
const persistedAgentsByTarget = new Map<string, AgentResource>();

function clearRoutePendingState(targetAgentId: string) {
	if (isArtifactMode.value) return;
	const historyState = history.state as Record<string, unknown>;
	if (historyState[INSTANCE_AI_PENDING_AGENT_ID_STATE] !== targetAgentId) return;
	const { [INSTANCE_AI_PENDING_AGENT_ID_STATE]: _, ...state } = historyState;
	history.replaceState(state, '');
	if (routePendingAgentId.value === targetAgentId) routePendingAgentId.value = null;
}

async function ensureAgentPersisted(): Promise<void> {
	if (!isUnsaved.value) return;
	const targetProjectId = projectId.value;
	const targetAgentId = agentId.value;
	const targetKey = `${targetProjectId}:${targetAgentId}`;
	const persistedAgent = persistedAgentsByTarget.get(targetKey);
	if (persistedAgent) {
		isUnsaved.value = false;
		agent.value = persistedAgent;
		clearRoutePendingState(targetAgentId);
		emit('persisted', persistedAgent);
		return;
	}
	let flight = persistFlights.get(targetKey);
	if (!flight) {
		flight = (async () => {
			const created = await createAgent(
				rootStore.restApiContext,
				targetProjectId,
				localConfig.value?.name ?? locale.baseText('agents.new.defaultName'),
				{ id: targetAgentId },
			);
			persistedAgentsByTarget.set(targetKey, created);
			upsertProjectAgentsListCache(targetProjectId, created);
			clearRoutePendingState(targetAgentId);
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			isUnsaved.value = false;
			agent.value = created;
			// Lets an artifact host replace its pending metadata. Route-backed drafts
			// clear their history marker after the create succeeds instead.
			emit('persisted', created);
		})();
		persistFlights.set(targetKey, flight);
	}

	try {
		await flight;
	} finally {
		if (persistFlights.get(targetKey) === flight) persistFlights.delete(targetKey);
	}
}

async function saveConfig(snapshot: ConfigAutosaveSnapshot): Promise<'skipped' | undefined> {
	// The AI may be mutating this agent right now — a save queued just before
	// the lock engaged must not persist its now-stale full config over it.
	if (props.artifactEditingLocked) return 'skipped';
	await ensureAgentPersisted();
	const result = await updateConfig(snapshot.projectId, snapshot.agentId, snapshot.config);
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

async function saveSkill(snapshot: SkillAutosaveSnapshot): Promise<'skipped' | undefined> {
	if (props.artifactEditingLocked) return 'skipped';
	await ensureAgentPersisted();
	const result = await updateAgentSkill(
		rootStore.restApiContext,
		snapshot.projectId,
		snapshot.agentId,
		snapshot.skillId,
		snapshot.skill,
	);
	agentsEventBus.emit('agentUpdated', { agentId: snapshot.agentId, source: 'agent-builder' });
	if (agent.value?.id !== snapshot.agentId) return undefined;
	agent.value = {
		...agent.value,
		versionId: result.versionId,
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

async function flushAutosave() {
	// Locked means the AI is mutating this agent right now — flushing a
	// pending edit here would persist a stale full config over its writes.
	if (props.artifactEditingLocked) {
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
	await flushPendingRouteDraftBeforeNavigation();
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
// any autosave queued before the AI started mutating this agent.
watch(
	() => props.artifactEditingLocked,
	(locked) => {
		if (!locked) return;
		configAutosave.cancelPendingAutosave();
		skillAutosave.cancelPendingAutosave();
	},
);

/**
 * Authoritative pre-publish gate for the frontend: flush any pending edit so
 * the backend validates the config the user is about to publish (not a
 * stale persisted version), then refresh the readiness result and report
 * whether it is safe to call the publish endpoint. The publish endpoint
 * re-validates independently, so this is a UX affordance, not the only guard.
 */
async function refreshValidationBeforePublish(): Promise<boolean> {
	try {
		await flushAutosave();
	} catch {
		return false;
	}
	await refreshConfigValidation(projectId.value, agentId.value);
	return configValidation.value?.status === 'valid';
}

/** Open the current agent in Instance AI without sending an opening message. */
async function onOpenInstanceAi() {
	// Flush pending edits first so the assistant sees the latest config.
	await flushAutosave();
	telemetry.track('Instance AI opened from editor', {
		source: 'agent_builder_page',
		agent_id: agentId.value,
		workflow_id: null,
		execution_id: null,
	});
	await openAgentArtifactThread(
		{
			type: 'agent',
			id: agentId.value,
			name: agent.value?.name,
			projectId: projectId.value,
		},
		{
			source: 'agent_builder_page',
			origin: 'internal',
			sourceContext: { agentId: agentId.value },
		},
	);
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

function onConfigFieldUpdate(updates: Partial<AgentJsonConfig>) {
	if (!localConfig.value) return;
	// The persisted validation result no longer reflects the working copy —
	// Publish must not stay enabled against a result that predates this edit.
	invalidateConfigValidation();
	Object.assign(localConfig.value, updates);
	// Mirror identity edits onto the agent resource so the header reflects them
	// before the next fetch.
	if (updates.name !== undefined) {
		syncAgentIdentityFromConfig(localConfig.value);
	}
	configAutosave.scheduleAutosave({
		projectId: projectId.value,
		agentId: agentId.value,
		type: 'config',
		// The memory toggle is gone, but older agent configs may still have
		// session memory disabled. Normalize on save so legacy configs are
		// corrected the next time the user makes a real edit, without mutating
		// config during component mount.
		config: normalizeAgentMemoryConfig(deepCopy(localConfig.value)),
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
	validationIssues: computed(() => configValidation.value?.issues ?? []),
	scheduleConfigUpdate: onConfigFieldUpdate,
	scheduleSkillSave: ({ skillId, skill }) => {
		// The persisted validation result no longer reflects the working copy —
		// mirrors `onConfigFieldUpdate`'s invalidation before scheduling a config autosave.
		invalidateConfigValidation();
		skillAutosave.scheduleAutosave({
			type: 'skill',
			projectId: projectId.value,
			agentId: agentId.value,
			skillId,
			skill,
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
	});
}

function persistMissingPersonalisationGradient() {
	if (!effectiveCanEditAgent.value) return;
	if (!localConfig.value) return;

	const nextConfig = addMissingAgentPersonalisation(localConfig.value);
	if (!nextConfig) return;

	replaceConfigAndScheduleSave(nextConfig);
}

async function onConfigUpdated() {
	// Modal flows (e.g. skill creation) write through their own API calls, not
	// `saveConfig` — notify other surfaces (canvas agent cards) here too.
	agentsEventBus.emit('agentUpdated', { agentId: agentId.value, source: 'agent-builder' });
	await Promise.all([
		fetchAgent(),
		fetchConfig(projectId.value, agentId.value),
		refreshConfigValidation(projectId.value, agentId.value),
	]);
	// Refresh the connected-trigger list so chips reflect builder writes
	// without waiting for a tab switch. Mirrors the initial baseline fetch.
	const integrations = await ensureIntegrationsCatalog(projectId.value).catch(() => []);
	const triggerTypes = integrations.map((i) => i.type);
	const connected = await builderTelemetry.fetchInitialTriggersBaseline(triggerTypes);
	if (connected) connectedTriggers.value = connected;
	tasksReloadKey.value += 1;
}

async function refreshArtifactShell() {
	await settleAutosave();
	await onConfigUpdated();
}

function handleArtifactRefreshError(error: unknown) {
	showError(error, locale.baseText('agents.builder.loadError'));
}

let externalRefreshTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleExternalRefresh() {
	clearTimeout(externalRefreshTimer);
	externalRefreshTimer = setTimeout(() => {
		void refreshArtifactShell().catch(handleArtifactRefreshError);
	}, getDebounceTime(400));
}

function onExternalAgentUpdated(event?: AgentUpdatedEvent) {
	if (event?.source === 'agent-builder') return;
	if (!event?.agentId || event.agentId !== agentId.value) return;
	// Mid-initialize the write may have landed after initialize()'s own config
	// fetch already resolved, so queue a replay instead of dropping the event.
	if (!initialized.value) {
		pendingExternalRefresh.value = true;
		return;
	}
	scheduleExternalRefresh();
}

async function replayPendingExternalRefresh() {
	if (!pendingExternalRefresh.value) return;
	pendingExternalRefresh.value = false;
	await refreshArtifactShell();
}

agentsEventBus.on('agentUpdated', onExternalAgentUpdated);

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

		// An agent that does not exist yet has nothing to fetch: stand up the same
		// blank config the backend would have written, and let the first edit
		// create it (see `ensureAgentPersisted`). The personalisation backfill is
		// skipped too — it schedules a save, which would persist on mount alone.
		isUnsaved.value = targetAgentPending;
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
				fetchAgent(targetProjectId, targetAgentId),
				fetchConfig(targetProjectId, targetAgentId),
				fetchAgentFiles(targetProjectId, targetAgentId),
				refreshConfigValidation(targetProjectId, targetAgentId),
			]);
			if (!isCurrentInitialization()) return;
			persistMissingPersonalisationGradient();
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

		if (isStandalonePreview.value && route.query[NEW_SESSION_PARAM] === 'true') {
			onNewChat();
		} else if (isPreviewActive.value) {
			bindPreviewSession();
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

		persistedPreviewOpen.value = false;
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

onBeforeUnmount(() => {
	disposed = true;
	latestSessionsFetchRequestId++;
	agentsEventBus.off('agentUpdated', onExternalAgentUpdated);
	clearTimeout(externalRefreshTimer);
	sessionsStore.stopAutoRefresh();
	void flushAutosave().catch(() => {});
});

// If the user is on Preview before the sessions list finishes loading, latch onto
// the most recent thread as soon as it arrives. Also fires when loading
// finishes with no threads so we can mint a fresh ephemeral session instead
// of leaving the chat panel empty.
watch(
	() => sessionsStore.loading,
	(isLoading, wasLoading) => {
		if (!wasLoading || isLoading || !initialized.value) return;
		if (!isPreviewActive.value) return;
		if (isArtifactMode.value && props.artifactPreviewSessionId) {
			void ensureArtifactPreviewSessionAvailable(props.artifactPreviewSessionId);
		}
		if (effectiveSessionId.value) return;
		bindPreviewSession();
	},
);

watch(
	[isPreviewActive, initialized],
	([open, isInitialized]) => {
		if (open) persistedPreviewOpen.value = true;
		if (open && isInitialized && !sessionsStore.loading) bindPreviewSession();
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

let latestArtifactPreviewValidationId = 0;
async function ensureArtifactPreviewSessionAvailable(sessionId: string) {
	const requestId = ++latestArtifactPreviewValidationId;
	if (sessionsStore.loading || effectiveSessionId.value !== sessionId) return;
	if (sessionsStore.threads.some((thread) => thread.id === sessionId)) return;

	const targetProjectId = projectId.value;
	const targetAgentId = agentId.value;
	try {
		const { thread } = await sessionsStore.getThreadDetail(
			targetProjectId,
			targetAgentId,
			sessionId,
		);
		if (
			requestId !== latestArtifactPreviewValidationId ||
			isStaleAgentTarget(targetProjectId, targetAgentId) ||
			effectiveSessionId.value !== sessionId
		) {
			return;
		}
		sessionsStore.upsertThread(thread);
	} catch (error) {
		if (
			requestId !== latestArtifactPreviewValidationId ||
			isStaleAgentTarget(targetProjectId, targetAgentId) ||
			effectiveSessionId.value !== sessionId ||
			!isNotFoundError(error)
		) {
			return;
		}

		activeChatSessionId.value = null;
		bindPreviewSession();
	}
}

watch(
	[() => props.artifactPreviewSessionId, initialized],
	([sessionId, isInitialized]) => {
		if (!isArtifactMode.value || !isInitialized || !sessionId) return;
		openArtifactPreview(sessionId);
		void ensureArtifactPreviewSessionAvailable(sessionId);
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

async function onRemoveVectorStore(vectorStore: AgentJsonVectorStoreConfig) {
	const confirmed = await openAgentConfirmationModal({
		title: locale.baseText('agents.builder.vectorStores.panel.removeModal.title', {
			interpolate: { name: vectorStore.name },
		}),
		description: locale.baseText('agents.builder.vectorStores.panel.removeModal.description', {
			interpolate: { name: vectorStore.name },
		}),
		confirmButtonText: locale.baseText(
			'agents.builder.vectorStores.panel.removeModal.button.remove',
		),
		cancelButtonText: locale.baseText('generic.cancel'),
	});
	if (confirmed !== MODAL_CONFIRM) return;

	onConfigFieldUpdate({
		vectorStores: (localConfig.value?.vectorStores ?? []).filter(
			(existing) => existing.name !== vectorStore.name,
		),
	});
}

function onContinueLoaded({ sessionId, count }: AgentContinueLoadedEvent) {
	if (sessionId !== effectiveSessionId.value) return;

	// Only kick away from a URL-supplied session when the URL points at a
	// missing/stale thread. A real thread can legitimately have zero persisted
	// chat messages if its execution failed before history was saved.
	const requestedSessionId = continueSessionId.value;
	const knownThread = requestedSessionId
		? sessionsStore.threads.some((thread) => thread.id === requestedSessionId)
		: false;

	if (count === 0 && requestedSessionId && !knownThread) {
		// A session switch re-keys the chat immediately, before its route replace
		// necessarily lands. Ignore a load event until the route catches up.
		if (requestedSessionId !== sessionId) return;
		// Same-tab "New chat" already owns this ephemeral id via
		// `activeChatSessionId` — drop the shareable URL param only.
		if (currentSessionIsEphemeral.value) {
			exitContinueMode();
			return;
		}
		// Stale deep-link (or a cross-page navigation that left an unknown id
		// in the URL): bind immediately so we never wait on a raced
		// `router.replace` + `nextTick` that can leave the chat blank.
		if (!isPreviewActive.value) return;
		const latest = sessionsStore.threads?.[0];
		if (latest) {
			setSessionInUrl(latest.id);
		} else {
			onNewChat();
		}
	}
}

function onSwitchAgent(nextAgentId: string) {
	if (!nextAgentId || nextAgentId === agentId.value) return;
	void router.push({
		name: isStandalonePreview.value ? AGENT_PREVIEW_VIEW : AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: nextAgentId },
		query: isStandalonePreview.value ? {} : route.query,
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
			@back="returnToBuilderFromPreview"
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
			:before-revert-to-published="settleAutosave"
			:artifact-mode="isArtifactMode"
			:editing-locked="props.artifactEditingLocked"
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
		<div
			ref="builderContainer"
			:class="[
				$style.builder,
				{
					[$style.previewOpen]: isPreviewDockOpen,
					[$style.standalonePreview]: isStandalonePreview,
				},
			]"
		>
			<div
				v-if="!isPreviewDockOpen && !isArtifactMode && instanceAiAvailable"
				:class="$style.aiButtonWrapper"
			>
				<N8nButton
					variant="subtle"
					icon-only
					size="large"
					:disabled="!agent"
					:aria-label="locale.baseText('aiAssistant.tooltip')"
					:class="$style.aiButtonIcon"
					data-testid="agent-builder-instance-ai-btn"
					@click="onOpenInstanceAi"
				>
					<template #default>
						<div>
							<N8nAssistantIcon size="large" />
						</div>
					</template>
				</N8nButton>
			</div>
			<div v-if="showBuilderLoading" :class="$style.loading">
				<N8nIcon icon="spinner" spin />
			</div>
			<template v-else>
				<AgentPreviewChatPage
					v-if="isStandalonePreview"
					:initialized="initialized"
					:project-id="projectId"
					:agent-id="agentId"
					:agent="agent"
					:local-config="localConfig"
					:connected-triggers="connectedTriggers"
					:effective-session-id="effectiveSessionId"
					:can-send-to-assistant="canSendPreviewToInstanceAi"
					:before-send="beforePreviewSend"
					@continue-loaded="onContinueLoaded"
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
					@agent-changed="refreshAgentAfterIntegrationChange"
					@generate-eval-cases="onGenerateEvalCases"
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
					@close="onCloseVersionHistory"
					@reverted="onReverted"
					@published="onPublished"
					@unpublished="onUnpublished"
				/>

				<AgentPreviewDock
					v-if="!isStandalonePreview"
					:is-open="isPreviewDockOpen"
					:session-title="currentSessionTitle"
					:session-options="sessionMenu"
					:has-session="currentSessionHasMessages"
					:initialized="initialized"
					:project-id="projectId"
					:agent-id="agentId"
					:agent="agent"
					:local-config="localConfig"
					:connected-triggers="connectedTriggers"
					:effective-session-id="effectiveSessionId"
					:can-send-to-assistant="canSendPreviewToInstanceAi"
					:before-send="beforePreviewSend"
					@view-trace="viewPreviewTrace"
					@new-session="startNewPreviewSession"
					@session-select="onSessionPick"
					@close="closePreviewDock"
					@continue-loaded="onContinueLoaded"
					@send-to-assistant="onSendPreviewToAssistant"
				/>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';
.root {
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

	&.previewOpen {
		padding-right: var(--agent-preview-chat-column-width, 30rem);
		transition: padding-right var(--duration--snappy) var(--easing--ease-out);
		@include motion.reduced-motion;
	}

	&.previewOpen:has([data-preview-layout='floating']),
	&.previewOpen:has([data-preview-layout='fullpage']) {
		padding-right: 0;
		transition: none;
	}

	&.previewOpen:has([data-preview-layout='fullpage']) .editorColumn {
		display: none;
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
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

.standalonePreview {
	padding-right: 0;
}

.aiButtonWrapper {
	position: absolute;
	top: 0;
	right: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	z-index: 1;
}

.aiButtonIcon {
	display: inline-flex;
	justify-content: center;
	align-items: center;

	svg {
		display: block;
	}
}
</style>
