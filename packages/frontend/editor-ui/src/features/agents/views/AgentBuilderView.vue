<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { N8nActionDropdown, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM, MODAL_CANCEL, DEBOUNCE_TIME, getDebounceTime } from '@/app/constants';
import { deepCopy } from 'n8n-workflow';
import { getAgent, updateAgent, deleteAgent, publishAgent } from '../composables/useAgentApi';
import type { AgentResource, AgentJsonConfig } from '../types';
import { PROJECT_AGENTS } from '../constants';
import { useAgentConfig } from '../composables/useAgentConfig';
import { agentsEventBus } from '../agents.eventBus';
import AgentBuilderProgress from '../components/AgentBuilderProgress.vue';
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
const { showError } = useToast();

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);
const agentId = computed(() => route.params.agentId as string);

// UI state
type Mode = 'home' | 'building' | 'chat';
type ChatMode = 'build' | 'test';
const mode = ref<Mode>('home');
const chatMode = ref<ChatMode>('test');
const isChatStreaming = ref(false);
const settingsVisible = ref(true);
const isBuilding = ref(false);
const agentName = ref('');
const agentDescription = ref<string | null>(null);
const agentIcon = ref<IconOrEmoji>({ type: 'icon', value: 'robot' });
const agent = ref<AgentResource | null>(null);
const updatedAt = ref<string>('');
const initialPrompt = ref<string | undefined>(undefined);
const buildPrompt = ref<string>('');
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');

// Config
const { config, fetchConfig, updateConfig } = useAgentConfig();
const localConfig = ref<AgentJsonConfig | null>(null);

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
	}
}

function startChat(msg: string) {
	if (isBuilt.value) {
		// Agent already built — go straight into the chat experience.
		initialPrompt.value = msg;
		mode.value = 'chat';
		telemetry.track('User started agent chat', { agent_id: agentId.value });
		return;
	}
	// Fresh agent — run the builder with a dedicated progress UI, then
	// transition into chat mode once the build finishes.
	buildPrompt.value = msg;
	initialPrompt.value = undefined;
	mode.value = 'building';
	settingsVisible.value = true;
	telemetry.track('User started agent build', { agent_id: agentId.value });
}

function onBuildStreamingChange(streaming: boolean) {
	isBuilding.value = streaming;
}

function setChatMode(next: ChatMode) {
	if (isChatStreaming.value) return;
	const chatModeChanged = chatMode.value !== next;
	const enteringChat = mode.value !== 'chat';
	if (!chatModeChanged && !enteringChat) return;
	chatMode.value = next;
	if (enteringChat) {
		mode.value = 'chat';
	}
	telemetry.track('User switched agent chat mode', {
		agent_id: agentId.value,
		mode: next,
	});
}

function onBuildDone() {
	// Build stream finished. Let the fade-out animation play, then drop the
	// user straight into the chat experience with the newly built agent.
	mode.value = 'chat';
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
			} catch {
				saveStatus.value = 'idle';
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
	Object.assign(localConfig.value, updates);
	scheduleAutosave();
}

async function onConfigUpdated() {
	await Promise.all([fetchAgent(), fetchConfig(projectId.value, agentId.value)]);
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
			await publishAgent(rootStore.restApiContext, projectId.value, agentId.value);
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
	agent.value = null;
	mode.value = 'home';
	chatMode.value = 'test';
	isBuilding.value = false;
	agentIcon.value = { type: 'icon', value: 'robot' };
	initialPrompt.value = undefined;
	buildPrompt.value = '';
	localConfig.value = null;
	saveStatus.value = 'idle';

	await fetchAgent();
	await fetchConfig(projectId.value, agentId.value);

	if (config.value?.instructions?.trim()) {
		mode.value = 'chat';
	}

	const prompt = route.query.prompt as string | undefined;
	if (prompt) {
		void router.replace({ query: { ...route.query, prompt: undefined } });
		startChat(prompt);
	}
}

watch(agentId, initialize, { immediate: true });
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
				<div :class="$style.mainHeaderRight">
					<div
						v-if="mode !== 'building'"
						:class="$style.chatModeToggle"
						role="group"
						:aria-label="locale.baseText('agents.builder.chatMode.ariaLabel')"
						data-testid="agent-chat-mode-toggle"
					>
						<button
							type="button"
							:class="[$style.chatModeBtn, chatMode === 'build' && $style.chatModeBtnActive]"
							:disabled="isChatStreaming"
							:aria-pressed="chatMode === 'build'"
							data-testid="agent-chat-mode-build"
							@click="setChatMode('build')"
						>
							<N8nIcon icon="wand-sparkles" :size="14" />
							<span>{{ locale.baseText('agents.builder.chatMode.build') }}</span>
						</button>
						<button
							type="button"
							:class="[$style.chatModeBtn, chatMode === 'test' && $style.chatModeBtnActive]"
							:disabled="isChatStreaming"
							:aria-pressed="chatMode === 'test'"
							data-testid="agent-chat-mode-test"
							@click="setChatMode('test')"
						>
							<N8nIcon icon="message-square" :size="14" />
							<span>{{ locale.baseText('agents.builder.chatMode.test') }}</span>
						</button>
					</div>
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
						:show-recent="isBuilt"
						@send-message="startChat"
						@update:name="updateName"
						@update:description="updateDescription"
						@update:icon="agentIcon = $event"
					/>
					<AgentBuilderProgress
						v-else-if="mode === 'building'"
						key="building"
						:project-id="projectId"
						:agent-id="agentId"
						:initial-message="buildPrompt"
						@config-updated="onConfigUpdated"
						@update:streaming="onBuildStreamingChange"
						@done="onBuildDone"
					/>
					<AgentChatPanel
						v-else
						:key="`chat-${chatMode}`"
						:project-id="projectId"
						:agent-id="agentId"
						mode="inline"
						:endpoint="chatMode === 'build' ? 'build' : 'chat'"
						:initial-message="initialPrompt"
						@config-updated="onConfigUpdated"
						@update:streaming="isChatStreaming = $event"
					/>
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
			:building="isBuilding"
			@update:config="onConfigFieldUpdate"
			@published="onPublished"
			@unpublished="onUnpublished"
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

.chatModeToggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--5xs);
	border-radius: var(--radius);
	background-color: var(--color--foreground--tint-2);
}

.chatModeBtn {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: 26px;
	padding: 0 var(--spacing--2xs);
	border: none;
	background: none;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	border-radius: var(--radius);
	cursor: pointer;
}

.chatModeBtn:hover:not(:disabled) {
	color: var(--color--text);
}

.chatModeBtn:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}

.chatModeBtnActive {
	background-color: var(--color--background);
	color: var(--color--text);
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
