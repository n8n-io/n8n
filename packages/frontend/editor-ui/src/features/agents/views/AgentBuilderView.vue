<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { N8nActionDropdown, N8nIcon, N8nTabs, N8nText } from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM, MODAL_CANCEL, getDebounceTime } from '@/app/constants';
import { deepCopy } from 'n8n-workflow';
import { getAgent, deleteAgent, publishAgent } from '../composables/useAgentApi';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import type { AgentResource, AgentJsonConfig, AgentJsonToolRef } from '../types';
import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import { useAgentBuilderTelemetry } from '../composables/useAgentBuilderTelemetry';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useAgentConfig } from '../composables/useAgentConfig';
import { useAgentSessionsStore } from '../agentSessions.store';
import { agentsEventBus } from '../agents.eventBus';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentConfigTree from '../components/AgentConfigTree.vue';
import AgentSectionEditor from '../components/AgentSectionEditor.vue';
import AgentChatQuickActions from '../components/AgentChatQuickActions.vue';
import AgentPublishButton from '../components/AgentPublishButton.vue';

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const sessionsStore = useAgentSessionsStore();
const { showError } = useToast();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);
const agentId = computed(() => route.params.agentId as string);

// UI state
type ChatMode = 'build' | 'test';
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
const selectedSection = ref<string | null>(null);
const agentName = ref('');
const agent = ref<AgentResource | null>(null);
const initialPrompt = ref<string | undefined>(undefined);
const continueSessionId = computed(() => route.query.continueSessionId as string | undefined);
/**
 * Ephemeral session id for the in-tab "current chat". Set when the user starts
 * a new chat from the home input; cleared when they hit the back button in the
 * chat sub-header. Persists across Test/Build toggles so both views stay bound
 * to the same thread, per product requirement.
 */
const activeChatSessionId = ref<string | null>(null);
/**
 * The session id whichever panel should be bound to — URL-supplied
 * (continueSessionId) takes precedence over the in-tab ephemeral one.
 */
const effectiveSessionId = computed<string | undefined>(
	() => continueSessionId.value ?? activeChatSessionId.value ?? undefined,
);

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
		// Mint a fresh thread id for the ephemeral session. Test and Build
		// remain visually linked via `chatModeOpened` (v-show) — Build doesn't
		// share the thread, it uses its own per-agent builder history.
		activeChatSessionId.value = crypto.randomUUID();
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

function onBuildChatStreamingChange(streaming: boolean) {
	isBuildChatStreaming.value = streaming;
}

function setChatMode(next: ChatMode) {
	if (chatMode.value === next) return;
	// Test is locked until the agent has instructions — see chatModeOptions
	// which surfaces a tooltip explaining why. No-op on the click so the
	// user doesn't get bounced into a half-configured chat.
	if (next === 'test' && !isBuilt.value) return;
	chatMode.value = next;
	if (next === 'test' && !continueSessionId.value && !activeChatSessionId.value) {
		activeChatSessionId.value = crypto.randomUUID();
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
const chatModeOptions = computed<Array<TabOptions<ChatMode>>>(() => [
	{
		value: 'build',
		label: locale.baseText('agents.builder.chatMode.build'),
		icon: 'wand-sparkles',
		notification: isBuildChatStreaming.value,
	},
	{
		value: 'test',
		label: locale.baseText('agents.builder.chatMode.test'),
		icon: isBuilt.value ? 'message-square' : 'triangle-alert',
		variant: isBuilt.value ? 'default' : 'danger',
		tooltip: isBuilt.value
			? undefined
			: locale.baseText('agents.builder.chatMode.test.lockedTooltip'),
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
			try {
				await saveConfig();
				telemetry.track('User saved agent settings', { agent_id: agentId.value });
				builderTelemetry.flushConfigEdits();
			} catch (error) {
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
	chatModeOpened.value = { test: false, build: false };
	activeChatSessionId.value = null;
	isBuildChatStreaming.value = false;
	initialPrompt.value = undefined;
	localConfig.value = null;
	connectedTriggers.value = [];

	await fetchAgent();
	await fetchConfig(projectId.value, agentId.value);
	builderTelemetry.captureToolsBaseline();
	void sessionsStore.fetchThreads(projectId.value, agentId.value);
	void (async () => {
		// Non-fatal — on failure, leave connectedTriggers empty; the sidebar emit
		// will correct it once the user expands the Triggers section.
		const integrations = await ensureIntegrationsCatalog(projectId.value).catch(() => []);
		const triggerTypes = integrations.map((i) => i.type);
		const connected = await builderTelemetry.fetchInitialTriggersBaseline(triggerTypes);
		if (connected) connectedTriggers.value = connected;
	})();

	// Pick the initial chat tab based on whether the agent is ready. Unbuilt
	// agents default to Build (Test is locked anyway); built agents default to
	// Test. Read from `config.value` directly rather than `isBuilt.value` —
	// `localConfig` is populated by a watcher that fires on the next flush, so
	// `isBuilt` would still be stale here.
	const hasInstructions = !!config.value?.instructions?.trim();
	chatMode.value = hasInstructions ? 'test' : 'build';
	if (chatMode.value === 'test' && !continueSessionId.value && !activeChatSessionId.value) {
		activeChatSessionId.value = crypto.randomUUID();
	}

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

watch(
	chatMode,
	(cm) => {
		chatModeOpened.value[cm] = true;
	},
	{ immediate: true },
);

function clearContinueSessionParam() {
	const { continueSessionId: _dropped, ...rest } = route.query;
	void router.replace({ query: rest });
}

function exitContinueMode() {
	clearContinueSessionParam();
}

function onTreeSelect(key: string) {
	selectedSection.value = key;
}

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
</script>

<template>
	<div :class="$style.builder">
		<!-- Column 1: chat -->
		<aside
			:class="$style.chatColumn"
			:aria-label="locale.baseText('agents.builder.chatColumn.ariaLabel')"
			data-testid="agent-builder-chat-column"
		>
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
						<N8nTabs
							v-if="initialized"
							:model-value="chatMode"
							:options="chatModeOptions"
							variant="modern"
							data-testid="agent-chat-mode-toggle"
							@update:model-value="setChatMode"
						/>
						<AgentChatQuickActions
							:tools="localConfig?.tools ?? []"
							:project-id="projectId"
							:agent-id="agentId"
							:connected-triggers="connectedTriggers"
							@update:tools="onQuickActionAddTool"
							@update:connected-triggers="onConnectedTriggersUpdate"
							@trigger-added="onTriggerAdded"
						/>
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
						<N8nTabs
							v-if="initialized"
							:model-value="chatMode"
							:options="chatModeOptions"
							variant="modern"
							data-testid="agent-chat-mode-toggle"
							@update:model-value="setChatMode"
						/>
						<AgentChatQuickActions
							:tools="localConfig?.tools ?? []"
							:project-id="projectId"
							:agent-id="agentId"
							:connected-triggers="connectedTriggers"
							@update:tools="onQuickActionAddTool"
							@update:connected-triggers="onConnectedTriggersUpdate"
							@trigger-added="onTriggerAdded"
						/>
					</template>
				</AgentChatPanel>
			</div>
		</aside>

		<!-- Column 2: tree -->
		<aside :class="$style.treeColumn" data-testid="agent-builder-tree-column">
			<div :class="$style.treeHeader">
				<N8nText tag="span" bold>{{ locale.baseText('agents.builder.tree.title') }}</N8nText>
			</div>
			<AgentConfigTree
				:config="localConfig"
				:selected-key="selectedSection"
				@select="onTreeSelect"
			/>
		</aside>

		<!-- Column 3: editor -->
		<section
			:class="$style.editorColumn"
			:aria-label="locale.baseText('agents.builder.editorColumn.ariaLabel')"
			data-testid="agent-builder-editor-column"
		>
			<div :class="$style.editorHeader">
				<div :class="$style.editorHeaderLeft">
					<N8nIcon icon="robot" :size="16" />
					<N8nText tag="span" bold>{{
						agentName || locale.baseText('agents.home.untitledAgent')
					}}</N8nText>
				</div>
				<div :class="$style.editorHeaderRight">
					<AgentPublishButton
						:agent="agent"
						:project-id="projectId"
						:agent-id="agentId"
						:is-saving="false"
						@published="onPublished"
						@unpublished="onUnpublished"
					/>
					<N8nActionDropdown
						:items="headerActions"
						activator-icon="ellipsis-vertical"
						data-testid="agent-header-actions"
						@select="onHeaderAction"
					/>
				</div>
			</div>
			<AgentSectionEditor :config="localConfig" @update:config="onConfigFieldUpdate" />
		</section>
	</div>
</template>

<style lang="scss" module>
.builder {
	display: grid;
	grid-template-columns: minmax(280px, 360px) minmax(200px, 260px) 1fr;
	height: 100%;
	min-height: 0;
	overflow: hidden;
}

.chatColumn {
	display: flex;
	flex-direction: column;
	border-right: var(--border);
	min-height: 0;
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
	border-right: var(--border);
	min-height: 0;
	overflow: auto;
}

.treeHeader {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.editorColumn {
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.editorHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.editorHeaderLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.editorHeaderRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
