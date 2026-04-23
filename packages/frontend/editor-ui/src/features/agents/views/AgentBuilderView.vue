<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import {
	N8nActionDropdown,
	N8nIcon,
	N8nRadioButtons,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM, MODAL_CANCEL, getDebounceTime } from '@/app/constants';
import { deepCopy } from 'n8n-workflow';
import { getAgent, updateAgent, deleteAgent, publishAgent } from '../composables/useAgentApi';
import type { AgentResource, AgentJsonConfig } from '../types';
import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import { useAgentBuilderTelemetry } from '../composables/useAgentBuilderTelemetry';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { AGENT_SESSION_DETAIL_VIEW } from '../constants';
import { useAgentConfig } from '../composables/useAgentConfig';
import { useAgentSessionsStore } from '../agentSessions.store';
import { agentsEventBus } from '../agents.eventBus';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentHomeContent from '../components/AgentHomeContent.vue';
import AgentSettingsSidebar from '../components/AgentSettingsSidebar.vue';

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const sessionsStore = useAgentSessionsStore();
const credentialsStore = useCredentialsStore();
const { showError } = useToast();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);
const agentId = computed(() => route.params.agentId as string);

// UI state
type Mode = 'home' | 'chat';
type ChatMode = 'build' | 'test';
const mode = ref<Mode>('home');
const chatMode = ref<ChatMode>('test');
const isBuildChatStreaming = ref(false);
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
// Track which chat panels have been activated so we can lazy-mount them.
// Both panels used to mount together on first chat entry and each fire a
// loadHistory() call — only mount one until the user actually opens the other.
const chatModeOpened = ref<Record<ChatMode, boolean>>({ test: false, build: false });
const settingsVisible = ref(true);
const agentName = ref('');
const agentDescription = ref<string | null>(null);
const agentIcon = ref<IconOrEmoji>({ type: 'icon', value: 'robot' });
const agent = ref<AgentResource | null>(null);
const updatedAt = ref<string>('');
const initialPrompt = ref<string | undefined>(undefined);
const buildInitialPrompt = ref<string | undefined>(undefined);
const continueSessionId = computed(() => route.query.continueSessionId as string | undefined);
/**
 * Ephemeral session id for the in-tab "current chat". Set when the user starts
 * a new chat from the home input; cleared when they hit the back button in the
 * chat sub-header. Persists across Test/Build toggles so both views stay bound
 * to the same thread, per product requirement.
 */
const activeChatSessionId = ref<string | null>(null);
// Whether the build panel has been opened at least once (for lazy mounting)
const buildPanelOpened = ref(false);
/**
 * The session id whichever panel should be bound to — URL-supplied
 * (continueSessionId) takes precedence over the in-tab ephemeral one.
 */
const effectiveSessionId = computed<string | undefined>(
	() => continueSessionId.value ?? activeChatSessionId.value ?? undefined,
);
const sessionThread = computed(() => {
	const id = effectiveSessionId.value;
	if (!id) return undefined;
	return sessionsStore.threads.find((t) => t.id === id);
});
const sessionTitle = computed(() => {
	const thread = sessionThread.value;
	if (!thread) return undefined;
	return thread.title ?? `Session ${thread.sessionNumber}`;
});
const sessionEmoji = computed(() => sessionThread.value?.emoji ?? undefined);
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');

// Config
const { config, fetchConfig, updateConfig } = useAgentConfig();
const localConfig = ref<AgentJsonConfig | null>(null);
const connectedTriggers = ref<string[]>([]);

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

// Keep in sync with AgentIntegrationsPanel.integrationConfigs
const KNOWN_TRIGGER_TYPES = ['slack', 'telegram'] as const;

function onConnectedTriggersUpdate(list: string[]) {
	connectedTriggers.value = list;
	builderTelemetry.trackTriggerListChanged(list);
}

async function fetchAgent() {
	const data = await getAgent(rootStore.restApiContext, projectId.value, agentId.value);
	agent.value = data;
	updatedAt.value = data.updatedAt;
	agentName.value = data.name;
	agentDescription.value = data.description ?? null;
}

async function updateName(name: string) {
	const updated = await updateAgent(rootStore.restApiContext, projectId.value, agentId.value, {
		name,
	});
	if (updated) {
		agent.value = updated;
		agentName.value = updated.name;
		updatedAt.value = updated.updatedAt;
		// Keep config name in sync so it persists on next config save
		if (localConfig.value) {
			localConfig.value.name = updated.name;
		}
		agentsEventBus.emit('agentUpdated');
		builderTelemetry.trackNameEdited();
	}
}

async function updateDescription(description: string) {
	const updated = await updateAgent(rootStore.restApiContext, projectId.value, agentId.value, {
		description,
	} as Record<string, unknown>);
	if (updated) {
		agent.value = updated;
		agentDescription.value = updated.description ?? null;
		updatedAt.value = updated.updatedAt;
		builderTelemetry.trackDescriptionEdited();
	}
}

function startChat(msg: string) {
	// Starting a fresh chat must never inherit a stale continue-session from a
	// previous URL — otherwise the new conversation would keep appending to the
	// old thread.
	if (continueSessionId.value) clearContinueSessionParam();

	if (isBuilt.value) {
		// Mint a fresh thread id for the ephemeral session. Test and Build
		// remain visually linked via `chatModeOpened` (v-show) — Build doesn't
		// share the thread, it uses its own per-agent builder history.
		activeChatSessionId.value = crypto.randomUUID();
		initialPrompt.value = msg;
		chatMode.value = 'test';
		mode.value = 'chat';
		// We don't clear initialPrompt here — the panel reads it during its
		// own onMounted (which runs after the home → chat <Transition mode=
		// "out-in"> finishes) and then emits `initial-consumed`, at which
		// point the parent clears the ref. Clearing here on nextTick would
		// wipe the prompt before the panel mounts; clearing on `consumed`
		// is the right ordering and also prevents an HMR re-mount from
		// re-sending the message.
		telemetry.track('User started agent chat', { agent_id: agentId.value });
	} else {
		// Fresh (unbuilt) agent — navigate straight into the build chat panel.
		// The builder now uses interactive cards (ask_llm, ask_credential,
		// etc.) for all setup steps instead of a separate progress screen.
		// `buildInitialPrompt` is kept separate from `initialPrompt` so the
		// two panels (Test, Build) never bleed each other's seed messages
		// when the user toggles tabs mid-session.
		buildInitialPrompt.value = msg;
		buildPanelOpened.value = true;
		chatMode.value = 'build';
		mode.value = 'chat';
		settingsVisible.value = true;
		telemetry.track('User started agent build', { agent_id: agentId.value });
	}
}

/**
 * Back button handler for the chat sub-header. Discards the in-tab ephemeral
 * session (and the URL continueSessionId, if present) and returns the user to
 * the home screen so subsequent Test/Build toggles don't re-open the old chat.
 */
function onBackFromChat() {
	if (continueSessionId.value) clearContinueSessionParam();
	activeChatSessionId.value = null;
	chatModeOpened.value = { test: false, build: false };
	buildPanelOpened.value = false;
	buildInitialPrompt.value = undefined;
	chatMode.value = 'test';
	mode.value = 'home';
	// Refresh so the recent-sessions list on the home screen picks up any
	// threads the just-ended chat created on the backend.
	void sessionsStore.fetchThreads(projectId.value, agentId.value);
}

function onBuildChatStreamingChange(streaming: boolean) {
	isBuildChatStreaming.value = streaming;
}

/**
 * Clear the seed prompt once the panel has consumed it. We rely on the
 * panel emitting AFTER it has read the prop, so subsequent re-mounts
 * (HMR, route reactivation) don't re-send the same first message.
 */
function onInitialPromptConsumed() {
	initialPrompt.value = undefined;
}

function onBuildInitialPromptConsumed() {
	buildInitialPrompt.value = undefined;
}

function setChatMode(next: ChatMode) {
	if (chatMode.value === next) return;
	chatMode.value = next;

	// Build uses per-agent history, no session id required — clicking Build
	// drops straight into the builder panel. Test, by contrast, needs an
	// active session: home is its landing page, so clicking Test without a
	// session either stays on home or kicks back to home from a session-less
	// chat mode (e.g. they were in Build with no session).
	if (next === 'build' && mode.value !== 'chat') {
		buildPanelOpened.value = true;
		mode.value = 'chat';
	} else if (next === 'test' && mode.value === 'chat' && !effectiveSessionId.value) {
		mode.value = 'home';
		chatModeOpened.value = { test: false, build: false };
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
const disableTestOption = computed(() => !isBuilt.value);

const chatModeOptions = computed(() => [
	{ label: locale.baseText('agents.builder.chatMode.build'), value: 'build' as const },
	{
		label: locale.baseText('agents.builder.chatMode.test'),
		value: 'test' as const,
		disabled: disableTestOption.value,
	},
]);

function onOpenBuildFromChat() {
	// Triggered by the misconfigured-agent banner on the Test panel. Flip to
	// the Build tab so the user can finish setup without leaving the session.
	chatMode.value = 'build';
	buildPanelOpened.value = true;
}

async function saveConfig(): Promise<void> {
	if (!localConfig.value) return;
	const result = await updateConfig(projectId.value, agentId.value, localConfig.value);
	// Keep agent.versionId in sync so hasUnpublishedChanges stays accurate
	if (agent.value && result.versionId !== undefined) {
		agent.value = { ...agent.value, versionId: result.versionId };
	}
}

// Debounced autosave. We roll our own instead of useDebounceFn so we can cancel a
// pending save and await an in-flight one — both are needed in the route-leave
// guard, where a scheduled save that fires after publish would bump versionId and
// immediately re-mark the agent as having unpublished changes.
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let autosaveInFlight: Promise<void> | null = null;

function scheduleAutosave() {
	if (autosaveTimer !== null) clearTimeout(autosaveTimer);
	autosaveTimer = setTimeout(() => {
		autosaveTimer = null;
		autosaveInFlight = (async () => {
			saveStatus.value = 'saving';
			try {
				await saveConfig();
				saveStatus.value = 'saved';
				telemetry.track('User saved agent settings', { agent_id: agentId.value });
				builderTelemetry.flushConfigEdits();
			} catch (error) {
				saveStatus.value = 'idle';
				// Intentionally keep pending parts: `localConfig` still holds the
				// failed edit, so the next successful autosave will persist it.
				// Clearing here would drop telemetry for edits that do end up
				// saved on the retry.
				// Surface backend validation errors (e.g. incompatible workflow-tool
				// triggers or body nodes) so the user isn't left wondering why their
				// edit didn't stick.
				showError(error, locale.baseText('agents.builder.saveError'));
			} finally {
				autosaveInFlight = null;
			}
		})();
		// Shorter than the workflow canvas' 1500ms autosave: the publish button's
		// "enabled" state is gated on the save landing, so a longer wait makes the
		// UI feel laggy right after an edit.
	}, getDebounceTime(500));
}

async function settleAutosave() {
	if (autosaveTimer !== null) {
		clearTimeout(autosaveTimer);
		autosaveTimer = null;
	}
	if (autosaveInFlight) await autosaveInFlight;
}

function onConfigFieldUpdate(updates: Partial<AgentJsonConfig>) {
	if (!localConfig.value) return;
	// Record BEFORE assigning so the composable can diff against the pre-update state.
	builderTelemetry.recordConfigEdit(updates);
	Object.assign(localConfig.value, updates);
	scheduleAutosave();
}

async function onConfigUpdated() {
	await Promise.all([fetchAgent(), fetchConfig(projectId.value, agentId.value)]);
	builderTelemetry.trackToolsAdded();
}

function onTriggerAdded(payload: { triggerType: string; triggers: string[] }) {
	builderTelemetry.trackTriggerAdded(payload);
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

function openSession(threadId: string) {
	void router.push({
		name: AGENT_SESSION_DETAIL_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value, threadId },
	});
}

function onPublished(updated: AgentResource) {
	agent.value = updated;
}

function onUnpublished(updated: AgentResource) {
	agent.value = updated;
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
	mode.value = 'home';
	chatModeOpened.value = { test: false, build: false };
	buildPanelOpened.value = false;
	activeChatSessionId.value = null;
	isBuildChatStreaming.value = false;
	agentIcon.value = { type: 'icon', value: 'robot' };
	initialPrompt.value = undefined;
	buildInitialPrompt.value = undefined;
	localConfig.value = null;
	connectedTriggers.value = [];
	saveStatus.value = 'idle';

	await fetchAgent();
	await fetchConfig(projectId.value, agentId.value);
	builderTelemetry.captureToolsBaseline();
	void sessionsStore.fetchThreads(projectId.value, agentId.value);
	// Warm the credentials store so AskCredentialCard (rendered inside the
	// build chat panel) can render its picker without a per-card fetch.
	// Best-effort — failures here just mean the picker shows its empty state
	// until the user creates one. fetchCredentialTypes(false) short-circuits
	// when types are already loaded, so it's safe to call on every agent switch.
	void credentialsStore.fetchAllCredentials({ projectId: projectId.value }).catch(() => undefined);
	void credentialsStore.fetchCredentialTypes(false).catch(() => undefined);
	void (async () => {
		// Non-fatal — on failure, leave connectedTriggers empty; the sidebar emit
		// will correct it once the user expands the Triggers section.
		const connected = await builderTelemetry.fetchInitialTriggersBaseline(KNOWN_TRIGGER_TYPES);
		if (connected) connectedTriggers.value = connected;
	})();

	// Pick the initial chat tab based on whether the agent is ready. Unbuilt
	// agents default to Build (Test is locked anyway); built agents default to
	// Test. Read from `config.value` directly rather than `isBuilt.value` —
	// `localConfig` is populated by a watcher that fires on the next flush, so
	// `isBuilt` would still be stale here.
	const hasInstructions = !!config.value?.instructions?.trim();
	chatMode.value = hasInstructions ? 'test' : 'build';

	// Unbuilt agents skip the home screen entirely and land in the build
	// chat. The home screen is designed for agents you can chat with (Test
	// mode) or a "new chat" surface for the built case — neither of which
	// applies to an unbuilt agent. Dropping the user into the build panel
	// means `loadHistory()` fires, so any prior builder conversation is
	// immediately visible instead of appearing lost until the agent is
	// eventually built.
	if (!hasInstructions) {
		mode.value = 'chat';
	}

	// If the user arrived via NewAgentView with a seed prompt, skip home and
	// jump straight into the build chat. Doing this before flipping the
	// `initialized` gate means the mainBody renders straight into chat mode —
	// no home-screen flash between mount and the prompt-triggered startChat.
	const prompt = route.query.prompt as string | undefined;
	if (prompt) {
		void router.replace({ query: { ...route.query, prompt: undefined } });
		startChat(prompt);
	}

	initialized.value = true;
}

watch(agentId, initialize, { immediate: true });

// Only react to the arrival of a session id — clearing the param is always
// accompanied by an explicit `mode` assignment from the caller (exitContinueMode,
// startChat), so auto-resetting to 'home' here would race and override those.
watch(
	continueSessionId,
	(id) => {
		if (id) {
			mode.value = 'chat';
		}
	},
	{ immediate: true },
);

watch(
	[mode, chatMode],
	([m, cm]) => {
		if (m === 'chat') {
			chatModeOpened.value[cm] = true;
			if (cm === 'build') {
				buildPanelOpened.value = true;
			}
		}
	},
	{ immediate: true },
);

function clearContinueSessionParam() {
	const { continueSessionId: _dropped, ...rest } = route.query;
	void router.replace({ query: rest });
}

function exitContinueMode() {
	clearContinueSessionParam();
	mode.value = 'home';
}

function onContinueLoaded(count: number) {
	// Only kick back to home for a URL-supplied session that turned out to be
	// empty/stale. Ephemeral in-tab sessions always start empty and fill in as
	// the user chats, so the zero-count signal is expected there.
	if (count === 0 && continueSessionId.value) exitContinueMode();
}
</script>

<template>
	<div :class="$style.builder">
		<!-- Left column: center content with its own header -->
		<div :class="$style.mainColumn">
			<div :class="$style.mainHeader">
				<div :class="$style.mainHeaderLeft">
					<N8nIcon icon="robot" :size="16" />
					<N8nText tag="span" bold>{{
						agentName || locale.baseText('agents.home.untitledAgent')
					}}</N8nText>
				</div>
				<N8nTooltip
					v-if="initialized"
					:class="$style.chatModeToggleCenter"
					:disabled="isBuilt"
					:content="locale.baseText('agents.builder.chatMode.test.lockedTooltip')"
					:show-after="100"
					placement="bottom"
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
				<div :class="$style.mainHeaderRight">
					<button
						v-if="mode === 'chat'"
						:class="$style.toggleBtn"
						data-testid="new-chat"
						@click="onBackFromChat"
					>
						<N8nIcon icon="message-circle-plus" :size="16" />
					</button>
					<button
						:class="[$style.toggleBtn, settingsVisible && $style.toggleBtnActive]"
						data-testid="toggle-settings"
						@click="settingsVisible = !settingsVisible"
					>
						<N8nIcon icon="panel-right" :size="16" />
					</button>
					<N8nActionDropdown
						:items="headerActions"
						activator-icon="ellipsis-vertical"
						data-testid="agent-header-actions"
						@select="onHeaderAction"
					/>
				</div>
			</div>
			<!--
				No cross-mode transition: animating a 260ms opacity fade between
				home and chat leaves the home screen visibly lingering after the
				user hits send, which reads as a glitch. Instant swap feels more
				responsive.

				The mainBody stays empty until `initialize()` resolves, so we
				never flash the home screen for users arriving with a seed
				prompt in the URL, and never render the Test tab while we still
				don't know whether the agent is built.
			-->
			<div :class="$style.mainBody">
				<template v-if="initialized && mode === 'home'">
					<AgentHomeContent
						key="home"
						:agent-name="agentName"
						:agent-description="agentDescription"
						:agent-icon="agentIcon"
						:project-id="projectId"
						:agent-id="agentId"
						:sessions="sessionsStore.threads"
						:show-recent="isBuilt"
						@send-message="startChat"
						@update:name="updateName"
						@update:description="updateDescription"
						@update:icon="agentIcon = $event"
						@select-session="openSession"
					/>
				</template>
				<template v-else-if="initialized && mode === 'chat'">
					<div key="chat" :class="$style.chatHost">
						<!--
							v-if on `chatModeOpened` / `buildPanelOpened` lazy-mounts each
							panel the first time its tab is activated; v-show then preserves
							state (messages, input, scroll) without re-firing loadHistory on
							every toggle. Test additionally requires an active session id —
							Build is per-agent and needs no session.
						-->
						<AgentChatPanel
							v-if="chatModeOpened.test && effectiveSessionId"
							v-show="chatMode === 'test'"
							:key="`test-${effectiveSessionId}`"
							:project-id="projectId"
							:agent-id="agentId"
							mode="inline"
							endpoint="chat"
							:initial-message="initialPrompt"
							:continue-session-id="effectiveSessionId"
							:session-title="sessionTitle"
							:session-emoji="sessionEmoji"
							:agent-config="localConfig"
							:agent-status="deriveAgentStatus(agent)"
							:connected-triggers="connectedTriggers"
							@config-updated="onConfigUpdated"
							@continue-loaded="onContinueLoaded"
							@initial-consumed="onInitialPromptConsumed"
							@open-build="onOpenBuildFromChat"
							@back="onBackFromChat"
						/>
						<AgentChatPanel
							v-if="buildPanelOpened"
							v-show="chatMode === 'build'"
							:project-id="projectId"
							:agent-id="agentId"
							mode="inline"
							endpoint="build"
							:initial-message="buildInitialPrompt"
							:agent-config="localConfig"
							:agent-status="deriveAgentStatus(agent)"
							:connected-triggers="connectedTriggers"
							@config-updated="onConfigUpdated"
							@update:streaming="onBuildChatStreamingChange"
							@initial-consumed="onBuildInitialPromptConsumed"
							@back="onBackFromChat"
						/>
					</div>
				</template>
			</div>
		</div>

		<!-- Right column: settings sidebar with its own header -->
		<AgentSettingsSidebar
			v-if="settingsVisible"
			:config="localConfig"
			:agent-tools="agent?.tools ?? {}"
			:project-id="projectId"
			:agent-id="agentId"
			:agent-name="agentName"
			:updated-at="updatedAt"
			:agent="agent"
			:save-status="saveStatus"
			:building="isBuildChatStreaming"
			:code-only="mode === 'chat' && chatMode === 'build'"
			:agent-status="deriveAgentStatus(agent)"
			@update:config="onConfigFieldUpdate"
			@published="onPublished"
			@unpublished="onUnpublished"
			@update:connected-triggers="onConnectedTriggersUpdate"
			@trigger-added="onTriggerAdded"
		/>
	</div>
</template>

<style module>
.builder {
	display: flex;
	height: 100%;
	width: 100%;
	overflow: hidden;
}

.mainColumn {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
}

.mainHeader {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 56px;
	min-height: 56px;
	padding: 0 var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.mainHeaderLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--text);
}

.mainHeaderRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.mainBody {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow: hidden;
}

.chatHost {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow: hidden;
}

.toggleBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text--tint-1);
	border-radius: var(--radius);
}

.toggleBtn:hover {
	background-color: var(--color--foreground--tint-2);
	color: var(--color--text);
}

.toggleBtnActive {
	color: var(--color--text);
	background-color: var(--color--foreground--tint-1);
}

.chatModeToggleCenter {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
}

.chatModeOption {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.chatModeLockedIcon {
	color: var(--color--warning);
}
</style>
