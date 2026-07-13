<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, useTemplateRef } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import {
	N8nButton,
	N8nIcon,
	N8nResizeWrapper,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types/action-dropdown';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILE_SIZE_MB,
	MAX_AGENT_FILES_PER_UPLOAD,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
} from '@n8n/api-types';
import type { AgentFileDto } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { LOCAL_STORAGE_AGENT_BUILDER_CHAT_PANEL_WIDTH, MODAL_CONFIRM } from '@/app/constants';
import { useResizablePanel } from '@/app/composables/useResizablePanel';
import { deepCopy } from 'n8n-workflow';
import {
	getAgent,
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
	AgentJsonConfig,
	AgentJsonVectorStoreConfig,
	AgentSkill,
} from '../types';
import { useAgentBuilderTelemetry } from '../composables/useAgentBuilderTelemetry';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useAgentConfig } from '../composables/useAgentConfig';
import { useAgentBuilderStatus } from '../composables/useAgentBuilderStatus';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import { useAgentSessionsStore } from '../agentSessions.store';
import { useAgentBuilderSession } from '../composables/useAgentBuilderSession';
import { useAgentConfigAutosave } from '../composables/useAgentConfigAutosave';
import { useAgentBuilderMainTabs } from '../composables/useAgentBuilderMainTabs';
import { useAgentCapabilitiesActions } from '../composables/useAgentCapabilitiesActions';
import { removeProjectAgentFromListCache } from '../composables/useProjectAgentsList';
import { addMissingAgentPersonalisation } from '../utils/agentPersonalisation';
import {
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	AGENT_JSON_IMPORT_MODAL_KEY,
	AGENT_VECTOR_STORES_MODAL_KEY,
	CONTINUE_SESSION_ID_PARAM,
	PROJECT_AGENTS,
} from '../constants';
import { agentsEventBus } from '../agents.eventBus';
import AgentBuilderHeader from '../components/AgentBuilderHeader.vue';
import AgentBuilderPreviewHeader from '../components/AgentBuilderPreviewHeader.vue';
import AgentBuilderChatColumn from '../components/AgentBuilderChatColumn.vue';
import AgentBuilderEditorColumn from '../components/AgentBuilderEditorColumn.vue';
import AgentPreviewChatPage from '../components/AgentPreviewChatPage.vue';
import AgentVersionHistoryPanel from '../components/VersionHistory/AgentVersionHistoryPanel.vue';

const props = withDefaults(
	defineProps<{
		artifactMode?: boolean;
		artifactProjectId?: string;
		artifactAgentId?: string;
		artifactRefreshKey?: number;
	}>(),
	{
		artifactMode: false,
		artifactProjectId: undefined,
		artifactAgentId: undefined,
		artifactRefreshKey: 0,
	},
);

const AGENT_CHAT_PANEL_MIN_WIDTH = 320;
const AGENT_CHAT_PANEL_DEFAULT_WIDTH = 460;
const AGENT_CHAT_PANEL_MAX_WIDTH = 720;
const AGENT_EDITOR_MIN_WIDTH = 560;

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const sessionsStore = useAgentSessionsStore();
const credentialsStore = useCredentialsStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const favoritesStore = useFavoritesStore();

// Gates the entire knowledge base feature (files panel + fetching) behind the
// Daytona sandbox env vars on the backend (N8N_AGENTS_AI_SANDBOX_ENABLED + PROVIDER=daytona).
const isKnowledgeBaseEnabled = computed(() => settingsStore.isAgentsKnowledgeBaseFeatureEnabled);
const documentTitle = useDocumentTitle();
const { showError, showMessage } = useToast();
const { isBuilderConfigured, fetchStatus: fetchBuilderStatus } = useAgentBuilderStatus();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

// Artifact mode reuses this route shell inside Instance AI. It still relies on
// singleton agent session/credential stores, so only one builder shell should
// be mounted at a time.
const isArtifactMode = computed(() => props.artifactMode);
const isPreviewMode = computed(() => !isArtifactMode.value && route.name === AGENT_PREVIEW_VIEW);
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
const isFavorite = computed(() => favoritesStore.isFavorite(agentId.value, 'agent'));

const { canUpdate: canEditAgent, canDelete: canDeleteAgent } = useAgentPermissions(projectId);

// UI state
const isBuildChatStreaming = ref(false);
const initialPrompt = ref<string | undefined>();
const isVersionHistoryOpen = ref(false);

function onBuildChatStreamingChange(streaming: boolean) {
	isBuildChatStreaming.value = streaming;
}

/**
 * Gate for the main body render. Stays false while `initialize()` is running so
 * we don't:
 *   - flash the home screen for users who arrive with a `?prompt=…` query that
 *     will immediately transition them to the build chat, and
 *   - render the preview chat before the route/config/session state has settled.
 */
const initialized = ref(false);
const pendingArtifactRefreshKey = ref<number>();
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
	sessionMenu,
	setSessionInUrl,
	clearContinueSessionParam,
	onSessionPick,
	onNewChat,
} = useAgentBuilderSession();

const sessionOptions = computed<Array<DropdownMenuItemProps<string>>>(() =>
	sessionMenu.value.map((item) => ({
		id: item.id,
		label: item.when ? `${item.label} · ${item.when}` : (item.label ?? item.title),
		disabled: item.disabled,
	})),
);

// Config
const { config, fetchConfig, updateConfig } = useAgentConfig();
const localConfig = ref<AgentJsonConfig | null>(null);
const connectedTriggers = ref<string[]>([]);
/** Bumped on builder config-updated so the Tasks panel reloads (e.g. after create_task). */
const tasksReloadKey = ref(0);
const builderContainer = useTemplateRef<HTMLElement>('builderContainer');
const versionHistoryPanel = useTemplateRef<{ refresh: () => Promise<void> }>('versionHistoryPanel');
function shouldAutoExpandInitialBuild(): boolean {
	if (isArtifactMode.value) return false;
	return Boolean(route.query.prompt) && route.query.expandBuildChat === 'true';
}

const shouldStartWithExpandedBuildChat = shouldAutoExpandInitialBuild();
const isChatFullWidth = ref(shouldStartWithExpandedBuildChat);
const isBuildChatHidden = ref(isArtifactMode.value || !shouldStartWithExpandedBuildChat);
const shouldCollapseChatAfterInitialBuild = ref(shouldStartWithExpandedBuildChat);
const executionsCount = computed(() => sessionsStore.threads.length);
const { activeMainTab, mainTabOptions, executionsDescription } = useAgentBuilderMainTabs({
	executionsCount,
	knowledgeBaseEnabled: isKnowledgeBaseEnabled,
	routeBacked: computed(() => !isArtifactMode.value),
});

const { ensureLoaded: ensureIntegrationsCatalog } = useAgentIntegrationsCatalog();

const builderTelemetry = useAgentBuilderTelemetry({
	agentId,
	projectId,
	agent,
	localConfig,
	savedConfig: config,
	connectedTriggers,
});

/**
 * The backend owns runnable validation so the chat entry point either opens
 * Preview or stays in the builder.
 */
const isBuilt = computed(() => agent.value?.isRunnable === true);

function getMaxChatPanelWidth(containerWidth: number): number {
	return Math.max(
		AGENT_CHAT_PANEL_MIN_WIDTH,
		Math.min(AGENT_CHAT_PANEL_MAX_WIDTH, containerWidth - AGENT_EDITOR_MIN_WIDTH),
	);
}

const chatPanelResizer = useResizablePanel(LOCAL_STORAGE_AGENT_BUILDER_CHAT_PANEL_WIDTH, {
	container: builderContainer,
	defaultSize: (containerWidth) =>
		Math.min(AGENT_CHAT_PANEL_DEFAULT_WIDTH, getMaxChatPanelWidth(containerWidth)),
	minSize: AGENT_CHAT_PANEL_MIN_WIDTH,
	maxSize: getMaxChatPanelWidth,
});

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

const projectRoute = computed<RouteLocationRaw>(() => ({
	name: PROJECT_AGENTS,
	params: { projectId: projectId.value },
}));

const agentRoute = computed<RouteLocationRaw>(() => ({
	name: AGENT_BUILDER_VIEW,
	params: { projectId: projectId.value, agentId: agentId.value },
}));

const previewBreadcrumbItems = computed<PathItem[]>(() => [
	{
		id: projectId.value,
		label: projectName.value ?? locale.baseText('agents.builder.header.projectFallback'),
		href: router.resolve(projectRoute.value).href,
	},
	{
		id: agentId.value,
		label: agent.value?.name ?? '…',
		href: router.resolve(agentRoute.value).href,
	},
]);

// A fetch/mutation captures its target agent + project at call time. By the
// time an awaited call resolves the user may have switched to a different agent
// or project, and applying the result would clobber the new selection's state.
// Callers use this guard to drop such stale results.
function isStaleAgentTarget(targetProjectId: string, targetAgentId: string): boolean {
	return projectId.value !== targetProjectId || agentId.value !== targetAgentId;
}

async function fetchAgent(
	targetProjectId: string = projectId.value,
	targetAgentId: string = agentId.value,
) {
	const data = await getAgent(rootStore.restApiContext, targetProjectId, targetAgentId);
	if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
	agent.value = data;
	agentName.value = data.name;
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
	if (files.length === 0 || !agent.value?.activeVersionId) return;
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
	]);
}

function sessionIdForPreview(): string {
	return effectiveSessionId.value ?? sessionsStore.threads?.[0]?.id ?? crypto.randomUUID();
}

async function openPreview(seedMessage?: string, preferredSessionId?: string) {
	const sessionId = preferredSessionId ?? sessionIdForPreview();
	activeChatSessionId.value = sessionId;
	if (seedMessage) initialPrompt.value = seedMessage;

	await router.push({
		name: AGENT_PREVIEW_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
		query: {
			...route.query,
			prompt: undefined,
			[CONTINUE_SESSION_ID_PARAM]: sessionId,
		},
	});

	if (seedMessage) {
		void nextTick(() => {
			initialPrompt.value = undefined;
		});
	}
}

async function onOpenPreview() {
	if (!isBuilt.value) return;

	try {
		await flushAutosave();
	} catch {
		return;
	}
	if (isArtifactMode.value) {
		window.open(
			router.resolve({
				name: AGENT_PREVIEW_VIEW,
				params: { projectId: projectId.value, agentId: agentId.value },
			}).href,
			'_blank',
		);
		telemetry.track('User opened agent preview', { agent_id: agentId.value });
		return;
	}
	await openPreview();
	telemetry.track('User opened agent preview', { agent_id: agentId.value });
}

function closePreview() {
	const { [CONTINUE_SESSION_ID_PARAM]: _sessionId, prompt: _prompt, ...rest } = route.query;
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
		query: rest,
	});
}

function startChat(msg: string) {
	// Starting a fresh chat must never inherit a stale continue-session from a
	// previous URL — otherwise the new conversation would keep appending to the
	// old thread.
	if (continueSessionId.value) clearContinueSessionParam();
	if (isBuilt.value) {
		const sessionId = crypto.randomUUID();
		activeChatSessionId.value = sessionId;
		void openPreview(msg, sessionId);
		telemetry.track('User started agent chat', { agent_id: agentId.value });
	} else {
		// Fresh agent — route through the same build chat panel used for ongoing
		// Build conversations.
		isBuildChatHidden.value = false;
		initialPrompt.value = msg;
		telemetry.track('User started agent build', { agent_id: agentId.value });

		// Drop the seed prompt after the build panel captures it during the
		// render kicked off by the state change above.
		void nextTick(() => {
			initialPrompt.value = undefined;
		});
	}
}

function onPublished(updated: AgentResource) {
	agent.value = updated;
	void versionHistoryPanel.value?.refresh();
	warmAgentKnowledgeSandboxForPage();
}

function onUnpublished(updated: AgentResource) {
	agent.value = updated;
	void versionHistoryPanel.value?.refresh();
}

function onToggleVersionHistory() {
	const next = !isVersionHistoryOpen.value;
	if (next && isChatFullWidth.value) {
		// Make room for the panel — chat-full-width hides the editor column
		// and would leave the resizer at 100%, squashing the new panel.
		isChatFullWidth.value = false;
	}
	isVersionHistoryOpen.value = next;
}

function onCloseVersionHistory() {
	isVersionHistoryOpen.value = false;
}

async function onReverted(updated: AgentResource) {
	agent.value = updated;
	agentName.value = updated.name;
	await fetchConfig(projectId.value, agentId.value);
	tasksReloadKey.value += 1;
	builderTelemetry.captureToolsBaseline();
	builderTelemetry.captureSkillsBaseline();
	builderTelemetry.captureTasksBaseline();
}

/**
 * Pick the session the preview chat should bind to when no explicit one has been
 * chosen yet. Prefer the most recent thread — users land back where they left
 * off — and only mint a fresh ephemeral session when there is no history.
 */
function bindPreviewSession() {
	if (continueSessionId.value || activeChatSessionId.value) return;
	const latest = sessionsStore.threads?.[0];
	if (latest) {
		setSessionInUrl(latest.id);
		return;
	}
	// Still loading — defer the decision; the watcher below will rebind once
	// threads arrive, falling back to a fresh ephemeral session if the list
	// comes back empty.
	if (sessionsStore.loading) return;
	setSessionInUrl(crypto.randomUUID());
}

function warmAgentKnowledgeSandboxForPage() {
	if (!initialized.value || !isKnowledgeBaseEnabled.value || !agent.value?.activeVersionId) return;

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

function onOpenBuildFromChat() {
	isBuildChatHidden.value = false;
	closePreview();
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

async function saveConfig(snapshot: ConfigAutosaveSnapshot): Promise<void> {
	const result = await updateConfig(snapshot.projectId, snapshot.agentId, snapshot.config);
	// The write landed regardless of staleness below — tell other surfaces
	// (e.g. canvas agent cards invalidate their capability-summary cache).
	agentsEventBus.emit('agentUpdated', { agentId: snapshot.agentId, source: 'agent-builder' });
	// Drop the response if the user has switched to a different agent in the
	// meantime — both `config` (handled inside useAgentConfig) and
	// `agent.versionId` would otherwise be polluted with values for the
	// previous agent.
	if (result.stale) return;
	if (agent.value && agent.value.id === snapshot.agentId && result.versionId !== undefined) {
		agent.value = { ...agent.value, versionId: result.versionId };
	}
	await fetchAgent(snapshot.projectId, snapshot.agentId);
}

async function saveSkill(snapshot: SkillAutosaveSnapshot): Promise<void> {
	const result = await updateAgentSkill(
		rootStore.restApiContext,
		snapshot.projectId,
		snapshot.agentId,
		snapshot.skillId,
		snapshot.skill,
	);
	agentsEventBus.emit('agentUpdated', { agentId: snapshot.agentId, source: 'agent-builder' });
	if (agent.value?.id !== snapshot.agentId) return;
	agent.value = {
		...agent.value,
		versionId: result.versionId,
		skills: {
			...(agent.value.skills ?? {}),
			[snapshot.skillId]: result.skill,
		},
	};
}

// Debounce shorter than the workflow canvas' 1500ms — the publish button's
// "enabled" state is gated on the save landing, so a longer wait makes the
// UI feel laggy right after an edit.
const configAutosave = useAgentConfigAutosave<ConfigAutosaveSnapshot>({
	save: saveConfig,
	onSaved: () => {
		builderTelemetry.flushConfigEdits();
		// Diff the saved capability lists against the last baseline. No-op when
		// nothing new landed, so calling on every save also handles the build-chat
		// path (which has already advanced both baselines via `onConfigUpdated`).
		builderTelemetry.trackToolsAdded();
		builderTelemetry.trackSkillsAdded();
		builderTelemetry.trackTasksChanged();
	},
	onError: (error: unknown) => {
		// Intentionally keep pending parts: `localConfig` still holds the
		// failed edit, so the next successful autosave will persist it.
		// Surface backend validation errors (e.g. incompatible workflow-tool
		// triggers or body nodes) so the user isn't left wondering why their
		// edit didn't stick.
		showError(error, locale.baseText('agents.builder.saveError'));
	},
});
const skillAutosave = useAgentConfigAutosave<SkillAutosaveSnapshot>({
	save: saveSkill,
	onSaved: (snapshot) => {
		telemetry.track('User saved agent skill', {
			agent_id: snapshot.agentId,
			skill_id: snapshot.skillId,
		});
	},
	onError: (error: unknown) => {
		showError(error, locale.baseText('agents.builder.skills.saveError'));
	},
});
const saveStatus = computed(() => {
	if (configAutosave.saveStatus.value === 'saving' || skillAutosave.saveStatus.value === 'saving') {
		return 'saving';
	}
	if (configAutosave.saveStatus.value === 'saved' || skillAutosave.saveStatus.value === 'saved') {
		return 'saved';
	}
	return 'idle';
});

async function settleAutosave() {
	await Promise.all([configAutosave.settleAutosave(), skillAutosave.settleAutosave()]);
}

async function flushAutosave() {
	await Promise.all([configAutosave.flushAutosave(), skillAutosave.flushAutosave()]);
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
	// Record BEFORE assigning so the composable can diff against the pre-update state.
	builderTelemetry.recordConfigEdit(updates);
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
	scheduleConfigUpdate: onConfigFieldUpdate,
	scheduleSkillSave: ({ skillId, skill }) =>
		skillAutosave.scheduleAutosave({
			type: 'skill',
			projectId: projectId.value,
			agentId: agentId.value,
			skillId,
			skill,
		}),
	telemetry: {
		trackOpenedToolFromList: builderTelemetry.trackOpenedToolFromList,
		trackOpenedSkillFromList: builderTelemetry.trackOpenedSkillFromList,
		trackOpenedAddSkillModal: builderTelemetry.trackOpenedAddSkillModal,
		trackTriggerListChanged: builderTelemetry.trackTriggerListChanged,
		trackTriggerAdded: builderTelemetry.trackTriggerAdded,
	},
});
// Top-level alias so the template auto-unwraps the ref (nested `caps.appliedSkills`
// access is not unwrapped by the template compiler).
const appliedSkills = caps.appliedSkills;

function replaceConfigAndScheduleSave(nextConfig: AgentJsonConfig, recordEdit = true) {
	if (recordEdit) builderTelemetry.recordConfigEdit(nextConfig);
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
	if (!canEditAgent.value) return;
	if (!localConfig.value) return;

	const nextConfig = addMissingAgentPersonalisation(localConfig.value);
	if (!nextConfig) return;

	replaceConfigAndScheduleSave(nextConfig, false);
}

async function onConfigUpdated() {
	// Modal flows (e.g. skill creation) write through their own API calls, not
	// `saveConfig` — notify other surfaces (canvas agent cards) here too.
	agentsEventBus.emit('agentUpdated', { agentId: agentId.value, source: 'agent-builder' });
	await Promise.all([fetchAgent(), fetchConfig(projectId.value, agentId.value)]);
	// Refresh the connected-trigger list so chips reflect builder writes
	// without waiting for a tab switch. Mirrors the initial baseline fetch.
	const integrations = await ensureIntegrationsCatalog(projectId.value).catch(() => []);
	const triggerTypes = integrations.map((i) => i.type);
	const connected = await builderTelemetry.fetchInitialTriggersBaseline(triggerTypes);
	if (connected) connectedTriggers.value = connected;
	tasksReloadKey.value += 1;
	builderTelemetry.trackToolsAdded();
	builderTelemetry.trackSkillsAdded();
	builderTelemetry.trackTasksChanged();
}

async function refreshArtifactShell() {
	await settleAutosave();
	await onConfigUpdated();
}

function handleArtifactRefreshError(error: unknown) {
	showError(error, locale.baseText('agents.builder.loadError'));
}

async function replayPendingArtifactRefresh() {
	if (!isArtifactMode.value || pendingArtifactRefreshKey.value === undefined) return;
	pendingArtifactRefreshKey.value = undefined;
	await refreshArtifactShell();
}

watch(
	() => props.artifactRefreshKey,
	async (refreshKey, previousRefreshKey) => {
		if (!isArtifactMode.value || refreshKey === previousRefreshKey) return;
		if (!initialized.value) {
			pendingArtifactRefreshKey.value = refreshKey;
			return;
		}
		pendingArtifactRefreshKey.value = undefined;
		try {
			await refreshArtifactShell();
		} catch (error: unknown) {
			handleArtifactRefreshError(error);
		}
	},
);

function onBuildDone() {
	isBuildChatStreaming.value = false;
	if (!shouldCollapseChatAfterInitialBuild.value) return;
	isChatFullWidth.value = false;
	shouldCollapseChatAfterInitialBuild.value = false;
}

const headerActions = computed(() => {
	const actions: Array<ActionDropdownItem<string>> = [
		{
			id: 'export-json',
			label: locale.baseText('agents.builder.exportJson' as BaseTextKey),
			icon: 'download',
		},
	];

	if (canEditAgent.value) {
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
	if (!canEditAgent.value) return;

	uiStore.openModalWithData({
		name: AGENT_JSON_IMPORT_MODAL_KEY,
		data: {
			onConfirm: replaceConfigAndScheduleSave,
		},
	});
}

async function onHeaderAction(action: string) {
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

		// Cancel any pending autosave so it doesn't fire against the now-deleted
		// agent mid-navigation.
		await settleAutosave();
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

async function initialize() {
	initialized.value = false;
	try {
		// Flush any pending/in-flight save for the previous agent before we tear
		// down its state — without this, an autosave scheduled by edits in the
		// previous agent could land after we've already swapped to the new one.
		// The save itself snapshots agentId at schedule-time, so the persisted
		// data is correct; settling here keeps localConfig/agent state consistent.
		await settleAutosave();
		// Drop any per-agent telemetry state from the previous agent — an in-flight
		// save for the previous agent would've already flushed pending edits before
		// we got here, and a scheduled-but-not-fired save wouldn't flush correctly
		// against the new agent's id anyway.
		builderTelemetry.resetForAgentSwitch();

		agent.value = null;
		agentName.value = '';
		activeChatSessionId.value = null;
		localConfig.value = null;
		connectedTriggers.value = [];
		agentFiles.value = [];
		agentFilesLoading.value = false;
		agentFilesUploading.value = false;
		deletingAgentFileId.value = null;

		// Refresh builder readiness so the empty-state CTA reflects the latest
		// admin configuration. Never blocks the rest of the load.
		void fetchBuilderStatus().catch((error: unknown) => {
			showError(error, locale.baseText('settings.agentBuilder.loadError'));
		});

		await Promise.all([
			fetchAgent(),
			fetchConfig(projectId.value, agentId.value),
			fetchAgentFiles(),
		]);
		persistMissingPersonalisationGradient();
		builderTelemetry.captureToolsBaseline();
		builderTelemetry.captureSkillsBaseline();
		builderTelemetry.captureTasksBaseline();
		// Keep agent credential pickers aligned with the workflow editor: load only
		// credentials the current user can use in this project context.
		credentialsStore.setCredentials([]);
		await Promise.all([
			credentialsStore.fetchAllCredentialsForWorkflow({ projectId: projectId.value }),
			credentialsStore.fetchCredentialTypes(false),
		]).catch(() => undefined);
		// Stop any in-flight auto-refresh from the previous agent before kicking
		// off a new fetch — keeps the store tied to the current project/agent.
		sessionsStore.stopAutoRefresh();
		void sessionsStore.fetchThreads(projectId.value, agentId.value).then(() => {
			sessionsStore.startAutoRefresh();
		});
		void (async () => {
			// Non-fatal — on failure, leave connectedTriggers empty; the sidebar emit
			// will correct it once the user expands the Triggers section.
			const integrations = await ensureIntegrationsCatalog(projectId.value).catch(() => []);
			const triggerTypes = integrations.map((i) => i.type);
			const connected = await builderTelemetry.fetchInitialTriggersBaseline(triggerTypes);
			if (connected) connectedTriggers.value = connected;
		})();

		if (isPreviewMode.value) bindPreviewSession();

		// If the user arrived via NewAgentView with a seed prompt, jump straight
		// into the build chat.
		const prompt = isArtifactMode.value ? undefined : (route.query.prompt as string | undefined);
		if (prompt) {
			if (shouldAutoExpandInitialBuild()) {
				isChatFullWidth.value = true;
				shouldCollapseChatAfterInitialBuild.value = true;
			}
			void router.replace({
				query: { ...route.query, prompt: undefined, expandBuildChat: undefined },
			});
			startChat(prompt);
		}
	} catch (error: unknown) {
		showError(error, locale.baseText('agents.builder.loadError'));
	} finally {
		initialized.value = true;
		void replayPendingArtifactRefresh().catch(handleArtifactRefreshError);
		warmAgentKnowledgeSandboxForPage();
	}
}

watch(agentId, initialize, { immediate: true });

onBeforeUnmount(() => {
	sessionsStore.stopAutoRefresh();
});

// If the user is on Preview before the sessions list finishes loading, latch onto
// the most recent thread as soon as it arrives. Also fires when loading
// finishes with no threads so we can mint a fresh ephemeral session instead
// of leaving the chat panel empty.
watch(
	() => sessionsStore.loading,
	(isLoading, wasLoading) => {
		if (!wasLoading || isLoading) return;
		if (!isPreviewMode.value) return;
		if (continueSessionId.value || activeChatSessionId.value) return;
		bindPreviewSession();
	},
);

watch(isPreviewMode, (preview) => {
	if (preview) {
		bindPreviewSession();
	}
});

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

function onContinueLoaded(count: number) {
	// Only kick away from a URL-supplied session when the URL points at a
	// missing/stale thread. A real thread can legitimately have zero persisted
	// chat messages if its execution failed before history was saved.
	const requestedSessionId = continueSessionId.value;
	const knownThread = requestedSessionId
		? sessionsStore.threads.some((thread) => thread.id === requestedSessionId)
		: false;

	if (count === 0 && requestedSessionId && !knownThread) {
		exitContinueMode();
		// `exitContinueMode` only drops the query param; the chat panel would
		// otherwise sit blank waiting for a session to bind. Once the route
		// update lands, latch onto an existing thread (or mint a fresh
		// ephemeral one) so the test pane has something to render.
		void nextTick(() => {
			if (isPreviewMode.value) bindPreviewSession();
		});
	}
}

function onSwitchAgent(nextAgentId: string) {
	if (!nextAgentId || nextAgentId === agentId.value) return;
	void router.push({
		name: isPreviewMode.value ? AGENT_PREVIEW_VIEW : AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: nextAgentId },
		query: isPreviewMode.value ? {} : route.query,
	});
}

function onPreviewBreadcrumbSelect(item: PathItem) {
	if (item.id === projectId.value) {
		void router.push(projectRoute.value);
	} else if (item.id === agentId.value) {
		void router.push(agentRoute.value);
	}
}
</script>

<template>
	<div :class="$style.root">
		<AgentBuilderPreviewHeader
			v-if="isPreviewMode"
			:breadcrumb-items="previewBreadcrumbItems"
			:session-title="currentSessionTitle"
			:session-id="effectiveSessionId"
			:has-session="currentSessionHasMessages"
			:session-options="sessionOptions"
			@breadcrumb-select="onPreviewBreadcrumbSelect"
			@session-select="onSessionPick"
			@new-chat="onNewChat"
			@close-preview="closePreview"
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
			:is-version-history-open="isVersionHistoryOpen"
			:artifact-mode="isArtifactMode"
			@header-action="onHeaderAction"
			@open-preview="onOpenPreview"
			@published="onPublished"
			@unpublished="onUnpublished"
			@reverted="onReverted"
			@switch-agent="onSwitchAgent"
			@toggle-version-history="onToggleVersionHistory"
		/>
		<div
			ref="builderContainer"
			:class="{
				[$style.builder]: true,
				[$style.isResizingChat]: chatPanelResizer.isResizing.value,
				[$style.previewBuilder]: isPreviewMode,
			}"
		>
			<div v-if="showBuilderLoading" :class="$style.loading">
				<N8nIcon icon="spinner" spin />
			</div>
			<template v-else>
				<AgentPreviewChatPage
					v-if="isPreviewMode"
					:initialized="initialized"
					:project-id="projectId"
					:agent-id="agentId"
					:agent="agent"
					:local-config="localConfig"
					:connected-triggers="connectedTriggers"
					:effective-session-id="effectiveSessionId"
					:initial-prompt="initialPrompt"
					@config-updated="onConfigUpdated"
					@continue-loaded="onContinueLoaded"
					@open-build="onOpenBuildFromChat"
				/>
				<N8nButton
					v-else-if="!isArtifactMode && isBuildChatHidden"
					variant="ghost"
					icon-only
					size="small"
					:class="$style.showBuildChatButton"
					:aria-label="locale.baseText('agents.builder.chat.show.ariaLabel' as BaseTextKey)"
					data-testid="agent-build-chat-show-button"
					@click="isBuildChatHidden = false"
				>
					<N8nIcon icon="panel-left" :size="14" />
				</N8nButton>
				<N8nResizeWrapper
					v-else-if="!isArtifactMode"
					:class="{
						[$style.chatResizer]: true,
						[$style.chatResizerFullWidth]: isChatFullWidth,
					}"
					:width="isChatFullWidth ? 0 : chatPanelResizer.size.value"
					:style="{ width: isChatFullWidth ? '100%' : `${chatPanelResizer.size.value}px` }"
					:is-resizing-enabled="!isChatFullWidth"
					:supported-directions="isChatFullWidth ? [] : ['right']"
					:min-width="AGENT_CHAT_PANEL_MIN_WIDTH"
					:max-width="AGENT_CHAT_PANEL_MAX_WIDTH"
					:grid-size="8"
					outset
					data-testid="agent-builder-chat-resizer"
					@resize="chatPanelResizer.onResize"
					@resizeend="chatPanelResizer.onResizeEnd"
				>
					<AgentBuilderChatColumn
						:initialized="initialized"
						:project-id="projectId"
						:agent-id="agentId"
						:agent-name="agentName"
						:agent="agent"
						:local-config="localConfig"
						:connected-triggers="connectedTriggers"
						:initial-prompt="initialPrompt"
						:is-builder-configured="isBuilderConfigured"
						:is-published="Boolean(agent?.activeVersionId)"
						:is-full-width="isChatFullWidth"
						:is-build-chat-streaming="isBuildChatStreaming"
						:can-edit-agent="canEditAgent"
						:before-build-send="flushAutosave"
						@config-updated="onConfigUpdated"
						@build-done="onBuildDone"
						@update:streaming="onBuildChatStreamingChange"
						@update:tools="caps.onQuickActionAddTool"
						@update:mcp-servers="caps.onQuickActionAddMcpServers"
						@update:connected-triggers="caps.onConnectedTriggersUpdate"
						@hide="
							isChatFullWidth = false;
							isBuildChatHidden = true;
						"
						@trigger-added="caps.onTriggerAdded"
						@agent-published="onPublished"
						@agent-changed="refreshAgentAfterIntegrationChange"
					/>
				</N8nResizeWrapper>

				<AgentBuilderEditorColumn
					v-if="!isPreviewMode && (isArtifactMode || !isChatFullWidth || isBuildChatHidden)"
					:class="$style.editorColumn"
					v-model:active-main-tab="activeMainTab"
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
					:is-build-chat-streaming="isBuildChatStreaming"
					:can-edit-agent="canEditAgent"
					:tasks-reload-key="tasksReloadKey"
					:main-tab-options="mainTabOptions"
					:executions-description="executionsDescription"
					:artifact-mode="isArtifactMode"
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
					@tasks-changed="onConfigUpdated"
					@agent-changed="refreshAgentAfterIntegrationChange"
				/>

				<AgentVersionHistoryPanel
					v-if="!isPreviewMode && isVersionHistoryOpen"
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
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	--agent-builder-chat-min-width: 20rem;
	--agent-builder-editor-min-width: 35rem;

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
	overflow-x: auto;
	overflow-y: hidden;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.loading {
	flex: 1 1 auto;
	display: flex;
	align-items: center;
	justify-content: center;
}

.previewBuilder {
	background-color: var(--background--surface);
}

.chatResizer {
	flex-shrink: 0;
	min-width: var(--agent-builder-chat-min-width);

	:global([data-test-id='resize-handle']) {
		width: var(--spacing--xs) !important;
		right: calc(var(--spacing--xs) / -2) !important;

		&::after {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			width: var(--spacing--5xs);
			height: var(--spacing--xl);
			border-radius: var(--radius--4xs);
			background: var(--color--foreground);
			opacity: 0;
			transform: translate(-50%, -50%);
			transition: opacity 0.15s ease;
		}

		&:hover::after {
			opacity: 1;
		}
	}
}

.chatResizerFullWidth {
	flex: 1 1 auto;
}

.showBuildChatButton {
	position: absolute;
	top: var(--spacing--sm);
	left: var(--spacing--sm);
	z-index: 3;
}

.isResizingChat {
	.chatResizer {
		:global([data-test-id='resize-handle'])::after {
			opacity: 1;
		}
	}
}

.editorColumn {
	flex: 1 1 auto;
	min-width: var(--agent-builder-editor-min-width);
}
</style>
