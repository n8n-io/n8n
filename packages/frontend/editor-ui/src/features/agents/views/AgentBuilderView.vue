<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { N8nActionDropdown, N8nIcon, N8nRadioButtons, N8nText } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM, MODAL_CANCEL, DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';
import { deepCopy } from 'n8n-workflow';
import { getAgent, updateAgent, deleteAgent, publishAgent } from '../composables/useAgentApi';
import type { AgentResource, AgentJsonConfig } from '../types';
import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import { useAgentBuilderTelemetry } from '../composables/useAgentBuilderTelemetry';
import { PROJECT_AGENTS, AGENT_SESSION_DETAIL_VIEW } from '../constants';
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
const message = useMessage();
const sessionsStore = useAgentSessionsStore();
const credentialsStore = useCredentialsStore();
const { showError } = useToast();

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
		return;
	}

	// Fresh (unbuilt) agent — navigate straight into the build chat panel.
	// The builder now uses interactive cards (ask_llm, ask_credential, etc.)
	// for all setup steps instead of a separate progress screen.
	buildInitialPrompt.value = msg;
	buildPanelOpened.value = true;
	chatMode.value = 'build';
	mode.value = 'chat';
	settingsVisible.value = true;
	telemetry.track('User started agent build', { agent_id: agentId.value });
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

const chatModeOptions = computed(() => [
	{ label: locale.baseText('agents.builder.chatMode.build'), value: 'build' as const },
	{ label: locale.baseText('agents.builder.chatMode.test'), value: 'test' as const },
]);

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
				showError(error, locale.baseText('agents.builder.saveError'));
			} finally {
				autosaveInFlight = null;
			}
		})();
	}, getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE));
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

const headerActions = [{ id: 'delete', label: 'Delete agent' }];

async function onHeaderAction(action: string) {
	if (action === 'delete') {
		const confirmed = await message.confirm(
			`Are you sure you want to delete "${agentName.value}"?`,
			'Delete agent',
			{ confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' },
		);
		if (confirmed !== MODAL_CONFIRM) return;
		// Cancel any pending autosave so it doesn't fire against the now-deleted
		// agent mid-navigation.
		await settleAutosave();
		const capturedProjectId = projectId.value;
		await deleteAgent(rootStore.restApiContext, capturedProjectId, agentId.value);
		// Clear local agent state so `hasUnpublishedChanges` is false and the
		// route-leave guard lets the navigation through.
		agent.value = null;
		localConfig.value = null;
		agentsEventBus.emit('agentUpdated');
		await router.push({ name: PROJECT_AGENTS, params: { projectId: capturedProjectId } });
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

	const response = await message.confirm(
		locale.baseText('agents.builder.unsavedPublish.modal.description'),
		locale.baseText('agents.builder.unsavedPublish.modal.title'),
		{
			confirmButtonText: locale.baseText('agents.builder.unsavedPublish.modal.button.publish'),
			cancelButtonText: locale.baseText('agents.builder.unsavedPublish.modal.button.leave'),
			showClose: true,
			type: 'warning',
		},
	);

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
	// Drop any per-agent telemetry state from the previous agent — an in-flight
	// save for the previous agent would've already flushed pending edits before
	// we got here, and a scheduled-but-not-fired save wouldn't flush correctly
	// against the new agent's id anyway.
	builderTelemetry.resetForAgentSwitch();

	agent.value = null;
	mode.value = 'home';
	chatMode.value = 'test';
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

	// Always land on the home screen. Users enter chat mode by sending a
	// message, picking a recent session, clicking the Test/Build toggle, or
	// via a `continueSessionId` URL param — each of which sets `mode` explicitly.

	const prompt = route.query.prompt as string | undefined;
	if (prompt) {
		void router.replace({ query: { ...route.query, prompt: undefined } });
		startChat(prompt);
	}
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
				<N8nRadioButtons
					:class="$style.chatModeToggleCenter"
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
								v-else
								:icon="option.value === 'build' ? 'wand-sparkles' : 'message-square'"
								:size="14"
							/>
							<span>{{ option.label }}</span>
						</span>
					</template>
				</N8nRadioButtons>
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
			<div :class="$style.mainBody">
				<Transition name="agent-builder-mode" mode="out-in">
					<AgentHomeContent
						v-if="mode === 'home'"
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
					<div v-else-if="mode === 'chat'" key="chat" :class="$style.chatHost">
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
				</Transition>
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
</style>

<style>
.agent-builder-mode-enter-active,
.agent-builder-mode-leave-active {
	transition: opacity 260ms ease;
}
.agent-builder-mode-enter-from,
.agent-builder-mode-leave-to {
	opacity: 0;
}
</style>
