<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import {
	N8nButton,
	N8nIcon,
	N8nNavigationDropdown,
	N8nRadioButtons,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { MODAL_CONFIRM, MODAL_CANCEL } from '@/app/constants';
import { deepCopy } from 'n8n-workflow';
import { getAgent, deleteAgent, publishAgent } from '../composables/useAgentApi';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import type { AgentResource, AgentJsonConfig, AgentJsonToolRef } from '../types';
import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import { useAgentBuilderTelemetry } from '../composables/useAgentBuilderTelemetry';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useAgentConfig } from '../composables/useAgentConfig';
import { useAgentSessionsStore } from '../agentSessions.store';
import { useAgentBuilderLayout } from '../composables/useAgentBuilderLayout';
import { useAgentBuilderSession } from '../composables/useAgentBuilderSession';
import { useAgentChatMode, type ChatMode } from '../composables/useAgentChatMode';
import { useAgentConfigAutosave } from '../composables/useAgentConfigAutosave';
import shared from '../styles/agent-panel.module.scss';
import { agentsEventBus } from '../agents.eventBus';
import {
	AGENTS_LIST_VIEW,
	AGENT_BUILDER_VIEW,
	AGENT_SECTION_KEY,
	ADVANCED_SECTION_KEY,
	EVALS_SECTION_KEY,
	CONFIG_JSON_SECTION_KEY,
	EXECUTIONS_SECTION_KEY,
	AGENT_TOOLS_MODAL_KEY,
	AGENT_ADD_TRIGGER_MODAL_KEY,
	CONTINUE_SESSION_ID_PARAM,
} from '../constants';
import AgentBuilderHeader from '../components/AgentBuilderHeader.vue';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentConfigTree from '../components/AgentConfigTree.vue';
import AgentSectionEditor from '../components/AgentSectionEditor.vue';
import AgentCustomToolViewer from '../components/AgentCustomToolViewer.vue';
import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';
import AgentSessionsListView from './AgentSessionsListView.vue';
import AgentIntegrationsPanel from '../components/AgentIntegrationsPanel.vue';
import AgentToolsListPanel from '../components/AgentToolsListPanel.vue';
import AgentInfoPanel from '../components/AgentInfoPanel.vue';
import AgentAdvancedPanel from '../components/AgentAdvancedPanel.vue';
import AgentEvalsPanel from '../components/AgentEvalsPanel.vue';
import AgentChatQuickActions from '../components/AgentChatQuickActions.vue';

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const sessionsStore = useAgentSessionsStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const { showError } = useToast();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);
const agentId = computed(() => route.params.agentId as string);

// UI state
const {
	chatMode,
	chatModeOpened,
	isBuildChatStreaming,
	initialPrompt,
	onBuildChatStreamingChange,
	resetForAgentSwitch: resetChatModeForAgentSwitch,
} = useAgentChatMode();
/**
 * Gate for the main body render. Stays false while `initialize()` is running so
 * we don't:
 *   - flash the home screen for users who arrive with a `?prompt=…` query that
 *     will immediately transition them to the build chat, and
 *   - render the Test tab first on unbuilt agents only to flip it to Build
 *     once the config fetch resolves.
 * Everything below the header is empty until we know the right starting state.
 */
const initialized = ref(false);
const selectedSection = ref<string | null>(AGENT_SECTION_KEY);
// Tracks which tabs the user has flipped into raw-JSON view. Keyed by section
// key so each tab remembers its own state independently.
const rawSectionByKey = ref<Record<string, boolean>>({});
const showRawSection = computed(() =>
	selectedSection.value ? !!rawSectionByKey.value[selectedSection.value] : false,
);
const agentName = ref('');
const agent = ref<AgentResource | null>(null);
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

const { chatColumnCollapsed, gridColumns, onToggleChatColumn } = useAgentBuilderLayout();

// Config
const { config, fetchConfig, updateConfig } = useAgentConfig();
const localConfig = ref<AgentJsonConfig | null>(null);
const connectedTriggers = ref<string[]>([]);

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
 * An agent is considered "built" once it has instructions configured.
 * In that state the home screen + send flow routes to the chat endpoint
 * instead of the builder.
 */
const isBuilt = computed(() => !!localConfig.value?.instructions?.trim());

watch(
	config,
	(c) => {
		if (c) {
			localConfig.value = deepCopy(c);
		}
	},
	{ immediate: true },
);

const projectName = computed<string | null>(() => {
	const current = projectsStore.currentProject;
	if (current && current.id === projectId.value) return current.name ?? null;
	const match = projectsStore.myProjects.find((p) => p.id === projectId.value);
	return match?.name ?? null;
});

async function fetchAgent() {
	const data = await getAgent(rootStore.restApiContext, projectId.value, agentId.value);
	agent.value = data;
	agentName.value = data.name;
}

function startChat(msg: string) {
	// Starting a fresh chat must never inherit a stale continue-session from a
	// previous URL — otherwise the new conversation would keep appending to the
	// old thread.
	if (continueSessionId.value) clearContinueSessionParam();
	if (isBuilt.value) {
		// Mint a fresh thread id and push it to the URL so the current chat is
		// persisted across reloads. Test and Build remain visually linked via
		// `chatModeOpened` (v-show) — Build doesn't share the thread, it uses
		// its own per-agent builder history.
		setSessionInUrl(crypto.randomUUID());
		initialPrompt.value = msg;
		chatMode.value = 'test';
		telemetry.track('User started agent chat', { agent_id: agentId.value });
	} else {
		// Fresh agent — route through the same build chat panel the Build tab
		// uses so the first-build experience matches the ongoing Build UX.
		initialPrompt.value = msg;
		chatMode.value = 'build';
		telemetry.track('User started agent build', { agent_id: agentId.value });
	}

	// Drop the seed prompt after the re-render that mounts the target panel.
	// Vue runs this child's setup during the render kicked off by the state
	// changes above, so `props.initialMessage` is captured synchronously in
	// the panel's setup before this callback fires. Leaving the prompt in
	// place would bleed the same message into whichever panel the user
	// opens next (e.g. clicking Build after starting a Test chat would
	// re-send the Test message to the builder and skip loadHistory).
	void nextTick(() => {
		initialPrompt.value = undefined;
	});
}

function onPublished(updated: AgentResource) {
	agent.value = updated;
}

function onUnpublished(updated: AgentResource) {
	agent.value = updated;
}

/**
 * Pick the session the Test tab should bind to when no explicit one has been
 * chosen yet. Prefer the most recent thread — users land back where they left
 * off — and only mint a fresh ephemeral session when there is no history.
 */
function bindTestSession() {
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

function setChatMode(next: ChatMode) {
	if (chatMode.value === next) return;
	// Test is locked until the agent has instructions — see chatModeOptions
	// which surfaces a tooltip explaining why. No-op on the click so the
	// user doesn't get bounced into a half-configured chat.
	if (next === 'test' && !isBuilt.value) return;
	chatMode.value = next;
	if (next === 'test') {
		// Restore the currently-bound Test session to the URL so refresh and
		// shared links point at the same chat.
		if (activeChatSessionId.value && !continueSessionId.value) {
			void router.replace({
				query: { ...route.query, [CONTINUE_SESSION_ID_PARAM]: activeChatSessionId.value },
			});
		} else {
			bindTestSession();
		}
	} else {
		// Build mode doesn't use continueSessionId — drop it from the URL so a
		// refresh while on Build doesn't bounce back to Test.
		if (continueSessionId.value) clearContinueSessionParam();
	}

	telemetry.track('User switched agent chat mode', {
		agent_id: agentId.value,
		mode: next,
	});
}

/**
 * Test is locked until the agent has instructions. Before that, chatting
 * would be meaningless — the agent has nothing to act on. Locking the tab
 * (rather than silently redirecting home→Build) keeps the UX honest: users
 * see WHY they can't chat yet instead of getting bounced to a different
 * surface after sending a message.
 *
 * This also closes the first-build cancellation hole: a mid-stream first
 * build is always `!isBuilt`, so the Test tab stays locked while the build
 * is in flight, preventing the tab-switch-unmounts-the-stream regression.
 */
const chatModeOptions = computed(() => [
	{ label: locale.baseText('agents.builder.chatMode.build'), value: 'build' as const },
	{
		label: locale.baseText('agents.builder.chatMode.test'),
		value: 'test' as const,
		disabled: !isBuilt.value,
	},
]);

function onOpenBuildFromChat() {
	// Triggered by the misconfigured-agent banner on the Test panel. Flip to
	// the Build tab so the user can finish setup without leaving the session.
	chatMode.value = 'build';
}

async function saveConfig(): Promise<void> {
	if (!localConfig.value) return;
	const result = await updateConfig(projectId.value, agentId.value, localConfig.value);
	// Keep agent.versionId in sync so hasUnpublishedChanges stays accurate
	if (agent.value && result.versionId !== undefined) {
		agent.value = { ...agent.value, versionId: result.versionId };
	}
}

// Debounce shorter than the workflow canvas' 1500ms — the publish button's
// "enabled" state is gated on the save landing, so a longer wait makes the
// UI feel laggy right after an edit.
const { saveStatus, scheduleAutosave, settleAutosave } = useAgentConfigAutosave({
	save: saveConfig,
	onSaved: () => {
		telemetry.track('User saved agent settings', { agent_id: agentId.value });
		builderTelemetry.flushConfigEdits();
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

function onSectionEditorUpdate(nextConfig: AgentJsonConfig) {
	if (!localConfig.value) return;
	builderTelemetry.recordConfigEdit(nextConfig);
	localConfig.value = nextConfig;
	scheduleAutosave();
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
	scheduleAutosave();
}

async function onConfigUpdated() {
	await Promise.all([fetchAgent(), fetchConfig(projectId.value, agentId.value)]);
	builderTelemetry.trackToolsAdded();
}

const headerActions = [{ id: 'delete', label: locale.baseText('agents.builder.deleteAgent') }];

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
		} catch (error) {
			showError(error, 'Could not delete agent');
			return;
		}

		// Clear local agent state BEFORE router.replace so `hasUnpublishedChanges`
		// is false and the route-leave guard doesn't intercept the navigation to
		// ask about publishing a now-deleted agent.
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

const hasUnpublishedChanges = computed(
	() =>
		!!agent.value?.publishedVersion &&
		agent.value.versionId !== agent.value.publishedVersion.publishedFromVersionId,
);

onBeforeRouteLeave(async (_to, _from, next) => {
	if (!hasUnpublishedChanges.value) {
		next();
		return;
	}

	const response = await openAgentConfirmationModal({
		title: locale.baseText('agents.builder.unsavedPublish.modal.title'),
		description: locale.baseText('agents.builder.unsavedPublish.modal.description'),
		confirmButtonText: locale.baseText('agents.builder.unsavedPublish.modal.button.publish'),
		cancelButtonText: locale.baseText('agents.builder.unsavedPublish.modal.button.leave'),
	});

	if (response === MODAL_CONFIRM) {
		try {
			// Drain the autosave pipeline first: cancel any scheduled-but-not-fired save,
			// and await any in-flight one. Without this, a save that fires after publish
			// would bump versionId and mark the agent dirty immediately after publishing.
			await settleAutosave();
			if (!localConfig.value) return;
			await saveConfig();
			builderTelemetry.flushConfigEdits();
			const updated = await publishAgent(rootStore.restApiContext, projectId.value, agentId.value);
			builderTelemetry.trackPublished(updated.publishedVersion?.schema);
		} catch (error) {
			showError(error, locale.baseText('agents.builder.unsavedPublish.error'));
			return; // stay on page
		}
		next();
	} else if (response === MODAL_CANCEL) {
		next();
	}
	// MODAL_CLOSE (X / Escape) → don't call next(), stay on page
});

async function initialize() {
	initialized.value = false;
	// Drop any per-agent telemetry state from the previous agent — an in-flight
	// save for the previous agent would've already flushed pending edits before
	// we got here, and a scheduled-but-not-fired save wouldn't flush correctly
	// against the new agent's id anyway.
	builderTelemetry.resetForAgentSwitch();

	agent.value = null;
	resetChatModeForAgentSwitch();
	activeChatSessionId.value = null;
	localConfig.value = null;
	connectedTriggers.value = [];

	await fetchAgent();
	await fetchConfig(projectId.value, agentId.value);
	builderTelemetry.captureToolsBaseline();
	// Fire-and-forget: the interactive ask_credential tool card reads these
	// stores. Failures are non-fatal — the cards stay disabled until data lands.
	void credentialsStore.fetchAllCredentials({ projectId: projectId.value }).catch(() => undefined);
	void credentialsStore.fetchCredentialTypes(false).catch(() => undefined);
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

	// Default landing is Build. If the URL pins a specific chat session
	// (e.g. refresh, shared link, deep link from elsewhere) we honor it and
	// open Test so the user sees the chat they linked to.
	chatMode.value = continueSessionId.value && isBuilt.value ? 'test' : 'build';
	// Explicitly open the target mode. The `chatMode` watcher only fires on a
	// value change, but on agent-switch we just reset `chatModeOpened` above —
	// if both agents share the same default mode the watcher doesn't fire and
	// the chat panel's v-if gate stays false, leaving the chat pane blank.
	chatModeOpened.value[chatMode.value] = true;

	// If the user arrived via NewAgentView with a seed prompt, jump straight
	// into the build chat.
	const prompt = route.query.prompt as string | undefined;
	if (prompt) {
		void router.replace({ query: { ...route.query, prompt: undefined } });
		startChat(prompt);
	}

	initialized.value = true;
}

watch(agentId, initialize, { immediate: true });

onBeforeUnmount(() => {
	sessionsStore.stopAutoRefresh();
});

watch(
	chatMode,
	(cm) => {
		chatModeOpened.value[cm] = true;
	},
	{ immediate: true },
);

// If the user is on Test before the sessions list finishes loading, latch onto
// the most recent thread as soon as it arrives. Also fires when loading
// finishes with no threads so we can mint a fresh ephemeral session instead
// of leaving the chat panel empty.
watch(
	() => sessionsStore.loading,
	(isLoading, wasLoading) => {
		if (!wasLoading || isLoading) return;
		if (chatMode.value !== 'test') return;
		if (continueSessionId.value || activeChatSessionId.value) return;
		bindTestSession();
	},
);

function exitContinueMode() {
	clearContinueSessionParam();
}

function onTreeSelect(key: string) {
	selectedSection.value = key;
}

/**
 * Whether the current tab has a non-raw custom view that the user can flip away
 * from. For plain JSON slices the toggle isn't offered (it's already raw).
 */
const canToggleRaw = computed(() => {
	const key = selectedSection.value;
	if (!key) return false;
	if (!localConfig.value) return false;
	if (key === AGENT_SECTION_KEY || key === ADVANCED_SECTION_KEY || key === 'memory') return true;
	return customToolSelection.value !== null;
});

const AGENT_RAW_PICK_KEYS = ['name', 'model', 'credential', 'instructions'];

/** Path passed to AgentSectionEditor when `showRawSection` is on. */
const rawSectionPath = computed<string | null>(() => {
	const key = selectedSection.value;
	if (!key) return null;
	// `__agent` is synthetic — its raw view uses `pickKeys` instead.
	if (key === AGENT_SECTION_KEY) return null;
	// `__advanced` maps to the `config` subtree in raw view.
	if (key === ADVANCED_SECTION_KEY) return 'config';
	return key;
});

const rawPickKeys = computed<string[] | null>(() =>
	selectedSection.value === AGENT_SECTION_KEY ? AGENT_RAW_PICK_KEYS : null,
);

function toggleRawSection() {
	const key = selectedSection.value;
	if (!key) return;
	rawSectionByKey.value = {
		...rawSectionByKey.value,
		[key]: !rawSectionByKey.value[key],
	};
}

function onOpenToolFromList(index: number) {
	selectedSection.value = `tools.${index}`;
}

function onRemoveTool(index: number) {
	const currentTools = localConfig.value?.tools ?? [];
	if (index < 0 || index >= currentTools.length) return;
	const nextTools = currentTools.filter((_, i) => i !== index);
	onConfigFieldUpdate({ tools: nextTools });
	// If the removed tool's per-slice tab was open, drop back to the Tools list.
	if (selectedSection.value === `tools.${index}`) {
		selectedSection.value = 'tools';
	}
}

function onOpenAddToolModal() {
	uiStore.openModalWithData({
		name: AGENT_TOOLS_MODAL_KEY,
		data: {
			tools: localConfig.value?.tools ?? [],
			projectId: projectId.value,
			agentId: agentId.value,
			onConfirm: (tools: AgentJsonToolRef[]) => onConfigFieldUpdate({ tools }),
		},
	});
}

function onOpenAddTriggerModal() {
	uiStore.openModalWithData({
		name: AGENT_ADD_TRIGGER_MODAL_KEY,
		data: {
			projectId: projectId.value,
			agentId: agentId.value,
			connectedTriggers: connectedTriggers.value,
			onConnectedTriggersChange: (triggers: string[]) => onConnectedTriggersUpdate(triggers),
			onTriggerAdded: (payload: { triggerType: string; triggers: string[] }) =>
				onTriggerAdded(payload),
		},
	});
}

/**
 * When the tree selects a custom-tool child (`tools.<i>` whose ref has
 * `type: 'custom'`), we show its compiled TS source instead of the JSON ref.
 * The source lives on `agent.tools[id].code` (populated server-side on compile).
 */
/** Active trigger type when the tree selection is `triggers.<type>`. */
const selectedTriggerType = computed<string | null>(() => {
	const key = selectedSection.value;
	if (!key?.startsWith('triggers.')) return null;
	return key.slice('triggers.'.length) || null;
});

/** True when a tree selection points at a specific tool slice (tools.<i>). */
const isToolSliceSelection = computed(() => selectedSection.value?.startsWith('tools.') ?? false);

/** Filename-like label for the currently-open tool. */
const toolHeaderTitle = computed(() => {
	const key = selectedSection.value;
	if (!key?.startsWith('tools.')) return '';
	const idx = Number(key.slice('tools.'.length));
	if (!Number.isInteger(idx)) return '';
	const ref = localConfig.value?.tools?.[idx];
	if (!ref) return `Tool ${idx + 1}`;
	const name = ref.name?.trim();
	if (ref.type === 'custom') {
		const base = name || ref.id || `tool-${idx + 1}`;
		return `${base}.ts`;
	}
	return name || `${ref.type ?? 'tool'}-${idx + 1}`;
});

const customToolSelection = computed<{ code: string } | null>(() => {
	const key = selectedSection.value;
	if (!key?.startsWith('tools.')) return null;
	const idx = Number(key.slice('tools.'.length));
	if (!Number.isInteger(idx)) return null;
	const ref = localConfig.value?.tools?.[idx];
	if (!ref || ref.type !== 'custom' || !ref.id) return null;
	const entry = agent.value?.tools?.[ref.id];
	if (!entry) return null;
	return { code: entry.code ?? '' };
});

function onQuickActionAddTool(tools: AgentJsonToolRef[]) {
	onConfigFieldUpdate({ tools });
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
	// Only kick back to home for a URL-supplied session that turned out to be
	// empty/stale. Ephemeral in-tab sessions always start empty and fill in as
	// the user chats, so the zero-count signal is expected there.
	if (count === 0 && continueSessionId.value) exitContinueMode();
}

function onHeaderBack() {
	void router.push({
		name: AGENTS_LIST_VIEW,
		params: { projectId: projectId.value },
	});
}

function onSwitchAgent(nextAgentId: string) {
	if (!nextAgentId || nextAgentId === agentId.value) return;
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: nextAgentId },
	});
}
</script>

<template>
	<div :class="$style.root">
		<AgentBuilderHeader
			:agent="agent"
			:project-id="projectId"
			:agent-id="agentId"
			:project-name="projectName"
			:header-actions="headerActions"
			:chat-column-collapsed="chatColumnCollapsed"
			:save-status="saveStatus"
			@back="onHeaderBack"
			@toggle-chat-column="onToggleChatColumn"
			@header-action="onHeaderAction"
			@published="onPublished"
			@unpublished="onUnpublished"
			@switch-agent="onSwitchAgent"
		/>
		<div :class="$style.builder" :style="{ gridTemplateColumns: gridColumns }">
			<!-- Column 1: chat -->
			<aside
				:class="$style.chatColumn"
				:aria-label="locale.baseText('agents.builder.chatColumn.ariaLabel')"
				data-testid="agent-builder-chat-column"
			>
				<div
					v-if="initialized && chatMode === 'test' && effectiveSessionId"
					:class="$style.sessionHeader"
					data-testid="agent-chat-session-header"
				>
					<N8nNavigationDropdown
						:menu="sessionMenu"
						submenu-class="agent-chat-session-menu"
						data-testid="agent-chat-session-picker"
						@select="onSessionPick"
					>
						<button
							type="button"
							:class="$style.sessionTitleBtn"
							:aria-label="locale.baseText('agents.builder.chat.sessionPicker.ariaLabel')"
							data-testid="agent-chat-session-picker-btn"
						>
							<N8nIcon icon="history" :size="14" />
							<span :class="$style.sessionTitleText">{{ currentSessionTitle }}</span>
							<N8nIcon icon="chevron-down" :size="12" />
						</button>
					</N8nNavigationDropdown>
					<button
						v-if="currentSessionHasMessages"
						type="button"
						:class="$style.newChatBtn"
						:aria-label="locale.baseText('agents.builder.chat.newChat.ariaLabel')"
						data-testid="agent-chat-new-chat-btn"
						@click="onNewChat"
					>
						<N8nIcon icon="plus" :size="14" />
						<span>{{ locale.baseText('agents.builder.chat.newChat.label') }}</span>
					</button>
				</div>
				<div :class="$style.chatBody">
					<AgentChatPanel
						v-if="initialized && chatModeOpened.test && effectiveSessionId"
						v-show="chatMode === 'test'"
						:key="`test-${effectiveSessionId}`"
						:project-id="projectId"
						:agent-id="agentId"
						mode="inline"
						endpoint="chat"
						:initial-message="initialPrompt"
						:continue-session-id="effectiveSessionId"
						:agent-config="localConfig"
						:agent-status="deriveAgentStatus(agent)"
						:connected-triggers="connectedTriggers"
						@config-updated="onConfigUpdated"
						@continue-loaded="onContinueLoaded"
						@open-build="onOpenBuildFromChat"
					>
						<template #above-input>
							<div :class="$style.quickActionsRow">
								<div :class="$style.quickActionsStart"></div>
								<N8nTooltip
									v-if="initialized"
									:class="$style.chatModeToggle"
									:disabled="isBuilt"
									:content="locale.baseText('agents.builder.chatMode.test.lockedTooltip')"
									:show-after="100"
									placement="top"
								>
									<N8nRadioButtons
										:model-value="chatMode"
										:options="chatModeOptions"
										:aria-label="locale.baseText('agents.builder.chatMode.ariaLabel')"
										data-testid="agent-chat-mode-toggle"
										@update:model-value="setChatMode"
									>
										<template #option="option">
											<span :class="$style.chatModeOption">
												<N8nIcon
													v-if="option.value === 'build' && isBuildChatStreaming"
													icon="loader-circle"
													:size="14"
													:spin="true"
												/>
												<N8nIcon
													v-else-if="option.value === 'test' && !isBuilt"
													icon="triangle-alert"
													:size="14"
													:class="$style.chatModeLockedIcon"
												/>
												<N8nIcon
													v-else
													:icon="option.value === 'build' ? 'wand-sparkles' : 'message-square'"
													:size="14"
												/>
												<span>{{ option.label }}</span>
											</span>
										</template>
									</N8nRadioButtons>
								</N8nTooltip>
							</div>
						</template>
					</AgentChatPanel>
					<AgentChatPanel
						v-if="initialized && chatModeOpened.build"
						v-show="chatMode === 'build'"
						:project-id="projectId"
						:agent-id="agentId"
						mode="inline"
						endpoint="build"
						:initial-message="chatMode === 'build' ? initialPrompt : undefined"
						:agent-config="localConfig"
						:agent-status="deriveAgentStatus(agent)"
						:connected-triggers="connectedTriggers"
						@config-updated="onConfigUpdated"
						@update:streaming="onBuildChatStreamingChange"
					>
						<template #above-input>
							<div :class="$style.quickActionsRow">
								<AgentChatQuickActions
									:tools="localConfig?.tools ?? []"
									:project-id="projectId"
									:agent-id="agentId"
									:connected-triggers="connectedTriggers"
									@update:tools="onQuickActionAddTool"
									@update:connected-triggers="onConnectedTriggersUpdate"
									@trigger-added="onTriggerAdded"
								/>
								<N8nTooltip
									v-if="initialized"
									:class="$style.chatModeToggle"
									:disabled="isBuilt"
									:content="locale.baseText('agents.builder.chatMode.test.lockedTooltip')"
									:show-after="100"
									placement="top"
								>
									<N8nRadioButtons
										:model-value="chatMode"
										:options="chatModeOptions"
										:aria-label="locale.baseText('agents.builder.chatMode.ariaLabel')"
										data-testid="agent-chat-mode-toggle"
										@update:model-value="setChatMode"
									>
										<template #option="option">
											<span :class="$style.chatModeOption">
												<N8nIcon
													v-if="option.value === 'build' && isBuildChatStreaming"
													icon="loader-circle"
													:size="14"
													:spin="true"
												/>
												<N8nIcon
													v-else-if="option.value === 'test' && !isBuilt"
													icon="triangle-alert"
													:size="14"
													:class="$style.chatModeLockedIcon"
												/>
												<N8nIcon
													v-else
													:icon="option.value === 'build' ? 'wand-sparkles' : 'message-square'"
													:size="14"
												/>
												<span>{{ option.label }}</span>
											</span>
										</template>
									</N8nRadioButtons>
								</N8nTooltip>
							</div>
						</template>
					</AgentChatPanel>
				</div>
			</aside>

			<!-- Column 2: editor -->
			<section
				:class="$style.editorColumn"
				:aria-label="locale.baseText('agents.builder.editorColumn.ariaLabel')"
				data-testid="agent-builder-editor-column"
			>
				<div :class="$style.panelArea">
					<div
						v-if="isToolSliceSelection"
						:class="$style.panelToolbar"
						data-testid="agent-tool-header"
					>
						<button
							type="button"
							:class="$style.backBtn"
							aria-label="Back to tools"
							data-testid="agent-tool-back"
							@click="selectedSection = 'tools'"
						>
							<N8nIcon icon="arrow-left" :size="16" />
						</button>
						<span :class="$style.panelToolbarTitle" data-testid="agent-tool-header-title">
							{{ toolHeaderTitle }}
						</span>
						<button
							v-if="canToggleRaw"
							type="button"
							:class="[
								$style.rawToggle,
								$style.rawToggleInline,
								showRawSection && $style.rawToggleActive,
							]"
							:aria-pressed="showRawSection"
							:title="showRawSection ? 'Show formatted view' : 'Show raw JSON'"
							data-testid="agent-section-raw-toggle"
							@click="toggleRawSection"
						>
							<N8nIcon icon="code" :size="12" />
							<span>Raw</span>
						</button>
					</div>
					<button
						v-if="canToggleRaw && !isToolSliceSelection"
						type="button"
						:class="[$style.rawToggle, showRawSection && $style.rawToggleActive]"
						:aria-pressed="showRawSection"
						:title="showRawSection ? 'Show formatted view' : 'Show raw JSON'"
						data-testid="agent-section-raw-toggle"
						@click="toggleRawSection"
					>
						<N8nIcon icon="code" :size="12" />
						<span>Raw</span>
					</button>
					<AgentSectionEditor
						v-if="showRawSection && canToggleRaw"
						:config="localConfig"
						:section-path="rawSectionPath"
						:pick-keys="rawPickKeys"
						:offset-copy-for-toggle="true"
						:read-only="isBuildChatStreaming"
						@update:config="onSectionEditorUpdate"
					/>
					<AgentCustomToolViewer v-else-if="customToolSelection" :code="customToolSelection.code" />
					<AgentAdvancedPanel
						v-else-if="selectedSection === ADVANCED_SECTION_KEY"
						:config="localConfig"
						:disabled="isBuildChatStreaming"
						@update:config="onConfigFieldUpdate"
					/>
					<AgentEvalsPanel v-else-if="selectedSection === EVALS_SECTION_KEY" />
					<AgentInfoPanel
						v-else-if="selectedSection === AGENT_SECTION_KEY"
						:config="localConfig"
						:disabled="isBuildChatStreaming"
						@update:config="onConfigFieldUpdate"
					/>
					<AgentSessionsListView
						v-else-if="selectedSection === EXECUTIONS_SECTION_KEY"
						data-testid="agent-executions-panel"
					/>
					<AgentToolsListPanel
						v-else-if="selectedSection === 'tools'"
						:tools="localConfig?.tools ?? []"
						:config="localConfig"
						:disabled="isBuildChatStreaming"
						@open-tool="onOpenToolFromList"
						@add-tool="onOpenAddToolModal"
						@remove-tool="onRemoveTool"
						@update:config="onConfigFieldUpdate"
					/>
					<div
						v-else-if="selectedTriggerType"
						:class="[$style.triggersTab, shared.scrollbarThin]"
						data-testid="agent-triggers-tab"
					>
						<AgentIntegrationsPanel
							:project-id="projectId"
							:agent-id="agentId"
							:agent-name="agentName"
							:focus-type="selectedTriggerType"
							@update:connected-triggers="onConnectedTriggersUpdate"
							@trigger-added="onTriggerAdded"
						/>
					</div>
					<div
						v-else-if="selectedSection === 'triggers'"
						:class="[$style.triggersTab, shared.scrollbarThin]"
						data-testid="agent-triggers-tab"
					>
						<div :class="$style.triggersHeader">
							<div :class="$style.triggersHeaderText">
								<N8nText tag="h3" size="large" :bold="true">Triggers</N8nText>
								<N8nText size="small" color="text-light">
									Channels that can invoke this agent
								</N8nText>
							</div>
							<N8nButton
								type="primary"
								size="small"
								data-testid="agent-triggers-add"
								@click="onOpenAddTriggerModal"
							>
								<template #prefix><N8nIcon icon="plus" :size="14" /></template>
								Add trigger
							</N8nButton>
						</div>
						<AgentIntegrationsPanel
							:project-id="projectId"
							:agent-id="agentId"
							:agent-name="agentName"
							:only-connected="true"
							@update:connected-triggers="onConnectedTriggersUpdate"
							@trigger-added="onTriggerAdded"
						/>
					</div>
					<AgentMemoryPanel
						v-else-if="selectedSection === 'memory'"
						:config="localConfig"
						:disabled="isBuildChatStreaming"
						@update:config="onConfigFieldUpdate"
					/>
					<AgentSectionEditor
						v-else
						:config="localConfig"
						:section-path="selectedSection === CONFIG_JSON_SECTION_KEY ? null : selectedSection"
						:read-only="isBuildChatStreaming"
						@update:config="onSectionEditorUpdate"
					/>
				</div>
			</section>

			<!-- Column 3: tree -->
			<aside
				:class="[$style.treeColumn, shared.scrollbarThin]"
				data-testid="agent-builder-tree-column"
			>
				<AgentConfigTree
					:config="localConfig"
					:selected-key="selectedSection"
					:connected-triggers="connectedTriggers"
					:executions-count="sessionsStore.threads.length"
					@select="onTreeSelect"
				/>
			</aside>
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
	display: grid;
	height: 100%;
	min-height: 0;
	overflow: hidden;
}

.chatColumn {
	position: relative;
	display: flex;
	flex-direction: column;
	border-right: var(--border);
	min-height: 0;
	min-width: 0;
	overflow: hidden;
}

.quickActionsRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.quickActionsStart {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.sessionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--sm);
	border-bottom: var(--border);
	min-height: 36px;
}

.sessionTitleBtn {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 100%;
	min-width: 0;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	background: transparent;
	border: var(--border-width) var(--border-style) transparent;
	border-radius: var(--radius);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	line-height: var(--line-height--md);

	&:hover {
		background: var(--color--background--light-2);
		border-color: var(--color--foreground);
	}

	&:focus-visible {
		outline: none;
		border-color: var(--color--primary);
	}
}

.sessionTitleText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.newChatBtn {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	background: transparent;
	border: var(--border-width) var(--border-style) transparent;
	border-radius: var(--radius);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	cursor: pointer;
	line-height: var(--line-height--md);

	&:hover {
		background: var(--color--background--light-2);
		color: var(--color--text);
		border-color: var(--color--foreground);
	}
}

.quickActionsRow > :first-child {
	flex: 1;
	min-width: 0;
}

/* The session picker can grow with the thread list — cap it at ~5 visible rows
   so it never eats the whole viewport. `.agent-chat-session-menu` is the
   popper class we pass through to `N8nNavigationDropdown`'s submenuClass prop;
   it's teleported, so the rule has to escape the CSS-module scope. */
:global(.agent-chat-session-menu) :global(.el-menu) {
	max-height: 220px;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--color--foreground--shade-1) transparent;
}

:global(.agent-chat-session-menu) :global(.el-menu)::-webkit-scrollbar {
	width: 6px;
}

:global(.agent-chat-session-menu) :global(.el-menu)::-webkit-scrollbar-thumb {
	background: var(--color--foreground--shade-1);
	border-radius: 999px;
}

.chatModeToggle {
	flex-shrink: 0;
}

.chatModeOption {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.chatModeLockedIcon {
	color: var(--color--warning);
}

.chatBody {
	flex: 1;
	min-height: 0;
	overflow: hidden;
	display: flex;
}

.chatBody > * {
	flex: 1;
	min-height: 0;
}

.treeColumn {
	display: flex;
	flex-direction: column;
	border-left: var(--border);
	min-height: 0;
	overflow: auto;
}

.editorColumn {
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.triggersTab {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	height: 100%;
	overflow-y: auto;
}

.triggersHeader {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.triggersHeaderText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.panelArea {
	position: relative;
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.panelArea > * {
	flex: 1;
	min-height: 0;
}

.panelToolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
	/* Overrides `.panelArea > *` which sets flex:1. The toolbar should size to
	   its content, not share height with the panel below. */
	flex: 0 0 auto !important;
	min-height: auto !important;
}

.panelToolbarTitle {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-family: var(--font-family--mono, monospace);
	font-size: var(--font-size--xs);
	color: var(--color--text);
}

.backBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	padding: 0;
	background: transparent;
	border: var(--border);
	border-color: transparent;
	border-radius: var(--radius);
	color: var(--color--text);
	cursor: pointer;
	flex-shrink: 0;

	&:hover {
		background: var(--color--background--light-2);
	}
}

.rawToggleInline {
	position: static;
	top: auto;
	right: auto;
}

.rawToggle {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--md);
	z-index: 1;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	cursor: pointer;

	&:hover {
		background: var(--color--background--light-2);
		color: var(--color--text);
	}
}

.rawToggleActive {
	background: var(--color--background--light-3);
	color: var(--color--text);
	border-color: var(--color--foreground);
}
</style>
