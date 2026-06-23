<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, useTemplateRef } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import { N8nResizeWrapper, type DropdownMenuItemProps } from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILE_SIZE_MB,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES,
	MAX_AGENT_KNOWLEDGE_BASE_SIZE_GB,
} from '@n8n/api-types';
import type { AgentFileDto } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { LOCAL_STORAGE_AGENT_BUILDER_CHAT_PANEL_WIDTH, MODAL_CONFIRM } from '@/app/constants';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
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
	createAgentSkill,
} from '../composables/useAgentApi';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import type {
	AgentResource,
	AgentJsonConfig,
	AgentJsonMcpServerConfig,
	AgentJsonToolConfig,
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
import { mcpServerToNode } from '../composables/useMcpServerAdapter';
import { removeProjectAgentFromListCache } from '../composables/useProjectAgentsList';
import {
	AGENT_BUILDER_VIEW,
	AGENT_PREVIEW_VIEW,
	AGENT_TOOLS_MODAL_KEY,
	AGENT_TOOL_CONFIG_MODAL_KEY,
	AGENT_SKILL_MODAL_KEY,
	CONTINUE_SESSION_ID_PARAM,
	PROJECT_AGENTS,
} from '../constants';
import { agentsEventBus } from '../agents.eventBus';
import type { ToolOpenTarget } from '../components/AgentCapabilitiesSection.types';
import AgentBuilderHeader from '../components/AgentBuilderHeader.vue';
import AgentBuilderPreviewHeader from '../components/AgentBuilderPreviewHeader.vue';
import AgentBuilderChatColumn from '../components/AgentBuilderChatColumn.vue';
import AgentBuilderEditorColumn from '../components/AgentBuilderEditorColumn.vue';
import AgentPreviewChatPage from '../components/AgentPreviewChatPage.vue';
import AgentVersionHistoryPanel from '../components/VersionHistory/AgentVersionHistoryPanel.vue';

const AGENT_CHAT_PANEL_MIN_WIDTH = 320;
const AGENT_CHAT_PANEL_DEFAULT_WIDTH = 460;
const AGENT_CHAT_PANEL_MAX_WIDTH = 720;
const AGENT_EDITOR_MIN_WIDTH = 360;

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const nodeTypesStore = useNodeTypesStore();
const telemetry = useTelemetry();
const sessionsStore = useAgentSessionsStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const settingsStore = useSettingsStore();

// Gates the entire knowledge base feature (files panel + fetching) behind the
// Daytona sandbox env vars on the backend (N8N_AGENTS_AI_SANDBOX_ENABLED + PROVIDER=daytona).
const isKnowledgeBaseEnabled = computed(() => settingsStore.isAgentsKnowledgeBaseFeatureEnabled);
const documentTitle = useDocumentTitle();
const { showError, showMessage } = useToast();
const { isBuilderConfigured, fetchStatus: fetchBuilderStatus } = useAgentBuilderStatus();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

const isPreviewMode = computed(() => route.name === AGENT_PREVIEW_VIEW);
const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);
const agentId = computed(() => route.params.agentId as string);

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
	return Boolean(route.query.prompt) && route.query.expandBuildChat === 'true';
}

const shouldStartWithExpandedBuildChat = shouldAutoExpandInitialBuild();
const isChatFullWidth = ref(shouldStartWithExpandedBuildChat);
const shouldCollapseChatAfterInitialBuild = ref(shouldStartWithExpandedBuildChat);
const executionsCount = computed(() => sessionsStore.threads.length);
const { activeMainTab, mainTabOptions, executionsDescription } = useAgentBuilderMainTabs({
	executionsCount,
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
	if (!agent.value) return;
	agent.value = {
		...agent.value,
		name: c.name,
		description: c.description ?? null,
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
	if (!initialized.value || !isKnowledgeBaseEnabled.value) return;

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
		agentName.value = updates.name;
		if (agent.value) agent.value = { ...agent.value, name: updates.name };
	}
	if (updates.description !== undefined && agent.value) {
		agent.value = { ...agent.value, description: updates.description ?? null };
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

async function onConfigUpdated() {
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

function onBuildDone() {
	isBuildChatStreaming.value = false;
	if (!shouldCollapseChatAfterInitialBuild.value) return;
	isChatFullWidth.value = false;
	shouldCollapseChatAfterInitialBuild.value = false;
}

const headerActions = computed(() =>
	canDeleteAgent.value
		? [{ id: 'delete', label: locale.baseText('agents.builder.deleteAgent') }]
		: [],
);

async function onHeaderAction(action: string) {
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
		} catch (error) {
			showError(error, 'Could not delete agent');
			return;
		}

		// Clear local agent state before router.replace so the component teardown
		// doesn't keep rendering data for an agent that no longer exists.
		agent.value = null;
		localConfig.value = null;
		agentsEventBus.emit('agentUpdated');

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

	await Promise.all([fetchAgent(), fetchConfig(projectId.value, agentId.value), fetchAgentFiles()]);
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
	const prompt = route.query.prompt as string | undefined;
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

	initialized.value = true;
	warmAgentKnowledgeSandboxForPage();
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

function onOpenAddToolModal() {
	uiStore.openModalWithData({
		name: AGENT_TOOLS_MODAL_KEY,
		data: {
			tools: localConfig.value?.tools ?? [],
			mcpServers: localConfig.value?.mcpServers ?? [],
			projectId: projectId.value,
			agentId: agentId.value,
			onConfirm: (tools: AgentJsonToolConfig[], mcpServers: AgentJsonMcpServerConfig[] = []) =>
				onConfigFieldUpdate({ tools, mcpServers }),
		},
	});
}

function onOpenToolFromList(target: ToolOpenTarget | number) {
	const tools = localConfig.value?.tools ?? [];

	const toolIndex =
		typeof target === 'number'
			? target
			: tools.findIndex((tool) => {
					if (target.kind !== 'tool') return false;
					if (tool.type !== target.toolType) return false;
					if (tool.type === 'node') return tool.name === target.id;
					if (tool.type === 'workflow') return tool.workflow === target.id;
					return tool.id === target.id;
				});

	if (toolIndex >= 0) {
		const tool = tools[toolIndex];
		if (!tool) return;
		builderTelemetry.trackOpenedToolFromList(tool.type);
		const customTool =
			tool.type === 'custom' && tool.id ? agent.value?.tools?.[tool.id] : undefined;
		uiStore.openModalWithData({
			name: AGENT_TOOL_CONFIG_MODAL_KEY,
			data: {
				toolRef: tool,
				customTool,
				projectId: projectId.value,
				agentId: agentId.value,
				existingToolNames: tools
					.map((toolRef, i) => (i === toolIndex || toolRef.type === 'custom' ? null : toolRef.name))
					.filter((name): name is string => !!name),
				onConfirm: (updatedTool: AgentJsonToolConfig) => {
					const nextTools = [...(localConfig.value?.tools ?? [])];
					nextTools[toolIndex] = updatedTool;
					onConfigFieldUpdate({ tools: nextTools });
				},
				onRemove: () => onRemoveTool(toolIndex),
			},
		});
		return;
	}

	const mcpServers = localConfig.value?.mcpServers ?? [];
	const mcpServerIndex =
		typeof target === 'number'
			? target - tools.length
			: target.kind === 'mcpServer'
				? mcpServers.findIndex((server) => server.name === target.serverName)
				: -1;
	const mcpServer = mcpServers[mcpServerIndex];
	if (!mcpServer) return;

	builderTelemetry.trackOpenedToolFromList('mcpServer');
	const preferredNodeTypeName = mcpServer.metadata?.nodeTypeName ?? AI_MCP_TOOL_NODE_TYPE;
	const nodeType =
		nodeTypesStore.getNodeType(preferredNodeTypeName) ??
		nodeTypesStore.getNodeType(AI_MCP_TOOL_NODE_TYPE);
	if (!nodeType) return;

	uiStore.openModalWithData({
		name: AGENT_TOOL_CONFIG_MODAL_KEY,
		data: {
			kind: 'mcpServer',
			mcpServer,
			initialNode: mcpServerToNode(mcpServer, nodeType),
			projectId: projectId.value,
			agentId: agentId.value,
			existingToolNames: mcpServers
				.filter((_, i) => i !== mcpServerIndex)
				.map((server) => server.name),
			onConfirm: (updatedServer: AgentJsonMcpServerConfig) => {
				const nextMcpServers = [...(localConfig.value?.mcpServers ?? [])];
				nextMcpServers[mcpServerIndex] = updatedServer;
				onConfigFieldUpdate({ mcpServers: nextMcpServers });
			},
			onRemove: () => {
				const nextMcpServers = (localConfig.value?.mcpServers ?? []).filter(
					(_, i) => i !== mcpServerIndex,
				);
				onConfigFieldUpdate({ mcpServers: nextMcpServers });
			},
		},
	});
}

const appliedSkills = computed<Array<{ id: string; skill: AgentSkill }>>(() => {
	const refs = localConfig.value?.skills ?? [];
	const seen = new Set<string>();
	const out: Array<{ id: string; skill: AgentSkill }> = [];

	for (const skillRef of refs) {
		if (!skillRef.id || seen.has(skillRef.id)) continue;
		seen.add(skillRef.id);
		out.push({
			id: skillRef.id,
			skill: agent.value?.skills?.[skillRef.id] ?? {
				name: skillRef.id,
				description: '',
				instructions: '',
			},
		});
	}

	return out;
});

function onOpenSkillFromList(id: string) {
	const skill = appliedSkills.value.find((s) => s.id === id)?.skill;
	if (!skill) return;
	builderTelemetry.trackOpenedSkillFromList(id);
	uiStore.openModalWithData({
		name: AGENT_SKILL_MODAL_KEY,
		data: {
			projectId: projectId.value,
			agentId: agentId.value,
			skill,
			skillId: id,
			onRemove: (skillId: string) => onRemoveSkill(skillId),
			onConfirm: ({ id: skillId, skill: updatedSkill }: { id?: string; skill: AgentSkill }) => {
				if (!skillId) return;
				if (agent.value?.id !== agentId.value) return;
				agent.value = {
					...agent.value,
					skills: {
						...(agent.value.skills ?? {}),
						[skillId]: updatedSkill,
					},
				};
				const nextSkills = [...(localConfig.value?.skills ?? [])];
				const skillRefIndex = nextSkills.findIndex((skillRef) => skillRef.id === id);
				if (skillRefIndex !== -1) {
					nextSkills[skillRefIndex] = { type: 'skill', id: skillId };
					onConfigFieldUpdate({ skills: nextSkills });
				}
			},
		},
	});
}

function onRemoveTool(index: number) {
	const currentTools = localConfig.value?.tools ?? [];
	if (index < 0 || index >= currentTools.length) return;
	const nextTools = currentTools.filter((_, i) => i !== index);
	onConfigFieldUpdate({ tools: nextTools });
}

function onRemoveSkill(id: string) {
	const currentSkills = localConfig.value?.skills ?? [];
	const nextSkills = currentSkills.filter((skillRef) => skillRef.id !== id);
	onConfigFieldUpdate({ skills: nextSkills });
}

function onToggleTask(payload: { id: string; enabled: boolean }) {
	const nextTasks = (localConfig.value?.tasks ?? []).map((taskRef) =>
		taskRef.id === payload.id ? { ...taskRef, enabled: payload.enabled } : taskRef,
	);
	onConfigFieldUpdate({ tasks: nextTasks });
}

function onOpenAddSkillModal() {
	builderTelemetry.trackOpenedAddSkillModal();
	uiStore.openModalWithData({
		name: AGENT_SKILL_MODAL_KEY,
		data: {
			projectId: projectId.value,
			agentId: agentId.value,
			onConfirm: ({ skill }: { id?: string; skill: AgentSkill }) => {
				void (async () => {
					let created: AgentSkill;
					let versionId: string | null;
					let skillId: string;
					try {
						const result = await createAgentSkill(
							rootStore.restApiContext,
							projectId.value,
							agentId.value,
							skill,
						);
						skillId = result.id;
						created = result.skill;
						versionId = result.versionId;
					} catch (error) {
						showError(error, locale.baseText('agents.builder.skills.create.error'));
						return;
					}
					if (agent.value?.id !== agentId.value) return;
					agent.value = {
						...agent.value,
						versionId,
						skills: {
							...(agent.value.skills ?? {}),
							[skillId]: created,
						},
					};
					onConfigFieldUpdate({
						skills: [...(localConfig.value?.skills ?? []), { type: 'skill', id: skillId }],
					});
					showMessage({
						title: locale.baseText('agents.builder.skills.added'),
						type: 'success',
					});
				})();
			},
		},
	});
}

function onQuickActionAddTool(tools: AgentJsonToolConfig[]) {
	onConfigFieldUpdate({ tools });
}

function onQuickActionAddMcpServers(mcpServers: AgentJsonMcpServerConfig[]) {
	onConfigFieldUpdate({ mcpServers });
}

function onConnectedTriggersUpdate(triggers: string[]) {
	connectedTriggers.value = triggers;
	builderTelemetry.trackTriggerListChanged(triggers);
}

function onTriggerAdded(payload: { triggerType: string; triggers: string[] }) {
	connectedTriggers.value = payload.triggers;
	builderTelemetry.trackTriggerAdded(payload);
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
			<N8nResizeWrapper
				v-else
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
					:is-full-width="isChatFullWidth"
					:can-edit-agent="canEditAgent"
					:before-build-send="flushAutosave"
					@config-updated="onConfigUpdated"
					@build-done="onBuildDone"
					@update:streaming="onBuildChatStreamingChange"
					@update:tools="onQuickActionAddTool"
					@update:mcp-servers="onQuickActionAddMcpServers"
					@update:connected-triggers="onConnectedTriggersUpdate"
					@update:full-width="isChatFullWidth = $event"
					@trigger-added="onTriggerAdded"
					@agent-published="onPublished"
					@agent-changed="refreshAgentAfterIntegrationChange"
				/>
			</N8nResizeWrapper>

			<AgentBuilderEditorColumn
				v-if="!isPreviewMode && !isChatFullWidth"
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
				@update:config="onConfigFieldUpdate"
				@open-tool="onOpenToolFromList"
				@open-skill="onOpenSkillFromList"
				@add-tool="onOpenAddToolModal"
				@add-skill="onOpenAddSkillModal"
				@upload-files="onUploadAgentFiles"
				@delete-file="onDeleteAgentFile"
				@remove-tool="onRemoveTool"
				@remove-skill="onRemoveSkill"
				@update:connected-triggers="onConnectedTriggersUpdate"
				@trigger-added="onTriggerAdded"
				@toggle-task="onToggleTask"
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
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.builder {
	display: flex;
	height: 100%;
	min-height: 0;
	overflow: hidden;
}

.previewBuilder {
	background-color: var(--background--surface);
}

.chatResizer {
	flex-shrink: 0;

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

.isResizingChat {
	.chatResizer {
		:global([data-test-id='resize-handle'])::after {
			opacity: 1;
		}
	}
}

.editorColumn {
	flex: 1 1 auto;
	min-width: 0;
}
</style>
