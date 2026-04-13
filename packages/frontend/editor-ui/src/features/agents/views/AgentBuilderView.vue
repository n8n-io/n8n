<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nActionDropdown, N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { deepCopy } from 'n8n-workflow';
import {
	getAgent,
	updateAgent,
	deleteAgent,
	publishAgent,
	unpublishAgent,
} from '../composables/useAgentApi';
import type { AgentResource, AgentJsonConfig } from '../types';
import { AGENTS_LIST_VIEW } from '../constants';
import { useAgentConfig } from '../composables/useAgentConfig';
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
const { showMessage, showError } = useToast();

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);
const agentId = computed(() => route.params.agentId as string);

// UI state
const chatActive = ref(false);
const settingsVisible = ref(true);
const isBuilding = ref(false);
const agentName = ref('');
const agentDescription = ref<string | null>(null);
const agentIcon = ref<IconOrEmoji>({ type: 'icon', value: 'robot' });
const agent = ref<AgentResource | null>(null);
const updatedAt = ref<string>('');
const initialPrompt = ref<string | undefined>(undefined);
const chatEndpoint = ref<'build' | 'chat'>('build');

// Config
const { config, fetchConfig, updateConfig } = useAgentConfig();
const localConfig = ref<AgentJsonConfig | null>(null);
const originalConfigJson = ref('');
const isDirty = ref(false);

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
			originalConfigJson.value = JSON.stringify(c);
			isDirty.value = false;
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
			// Update the dirty-state baseline so the rename alone doesn't mark config as dirty
			originalConfigJson.value = JSON.stringify(localConfig.value);
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
	// Decide at send-time whether this is a build session or a chat session
	// with the already-built agent.
	chatEndpoint.value = isBuilt.value ? 'chat' : 'build';
	initialPrompt.value = msg;
	chatActive.value = true;
	if (chatEndpoint.value === 'build') {
		settingsVisible.value = true;
	}
	telemetry.track(
		chatEndpoint.value === 'build' ? 'User started agent build' : 'User started agent chat',
		{ agent_id: agentId.value },
	);
}

function onChatStreamingChange(streaming: boolean) {
	// Only treat streams as "building" when routed to the builder endpoint —
	// that's what the settings sidebar reacts to.
	isBuilding.value = chatEndpoint.value === 'build' && streaming;
}

function onConfigFieldUpdate(updates: Partial<AgentJsonConfig>) {
	if (!localConfig.value) return;
	Object.assign(localConfig.value, updates);
	isDirty.value = JSON.stringify(localConfig.value) !== originalConfigJson.value;
}

async function saveConfig() {
	if (!localConfig.value) return;
	await updateConfig(projectId.value, agentId.value, localConfig.value);
	originalConfigJson.value = JSON.stringify(localConfig.value);
	isDirty.value = false;
	telemetry.track('User saved agent settings', { agent_id: agentId.value });
}

function cancelConfig() {
	if (config.value) {
		localConfig.value = deepCopy(config.value);
		isDirty.value = false;
		telemetry.track('User cancelled agent settings', { agent_id: agentId.value });
	}
}

async function onConfigUpdated() {
	await Promise.all([fetchAgent(), fetchConfig(projectId.value, agentId.value)]);
	isDirty.value = false;
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
		await deleteAgent(rootStore.restApiContext, projectId.value, agentId.value);
		void router.push({ name: AGENTS_LIST_VIEW, params: { projectId: projectId.value } });
	}
}

async function onPublishClick() {
	if (publishing.value) return;
	publishing.value = true;
	try {
		const updated = await publishAgent(rootStore.restApiContext, projectId.value, agentId.value);
		agent.value = updated;
		showMessage({ title: 'Agent published', type: 'success' });
	} catch (error) {
		showError(error, 'Failed to publish agent');
	} finally {
		publishing.value = false;
	}
}

async function onDropdownSelect(action: string) {
	if (action === 'unpublish') {
		if (publishing.value) return;
		publishing.value = true;
		try {
			await unpublishAgent(rootStore.restApiContext, projectId.value, agentId.value);
			if (agent.value) {
				agent.value = { ...agent.value, publishedVersion: null };
			}
			showMessage({ title: 'Agent unpublished', type: 'success' });
		} catch (error) {
			showError(error, 'Failed to unpublish agent');
		} finally {
			publishing.value = false;
		}
	}
}

async function initialize() {
	agent.value = null;
	chatActive.value = false;
	isBuilding.value = false;
	agentIcon.value = { type: 'icon', value: 'robot' };
	initialPrompt.value = undefined;
	localConfig.value = null;
	originalConfigJson.value = '';
	isDirty.value = false;

	await fetchAgent();
	await fetchConfig(projectId.value, agentId.value);

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
					<!-- Publish button -->
					<template v-if="!isPublished">
						<N8nButton
							type="secondary"
							size="small"
							:loading="publishing"
							data-testid="publish-agent-button"
							@click="onPublishClick"
						>
							Publish
						</N8nButton>
					</template>
					<template v-else-if="hasUnpublishedChanges">
						<N8nButton
							type="secondary"
							size="small"
							:loading="publishing"
							data-testid="republish-agent-button"
							@click="onPublishClick"
						>
							Republish
						</N8nButton>
						<N8nActionDropdown
							:items="unpublishActions"
							data-testid="agent-publish-dropdown"
							@select="onDropdownSelect"
						/>
					</template>
					<template v-else>
						<span :class="$style.publishedBadge" data-testid="agent-published-badge"
							>Published</span
						>
						<N8nActionDropdown
							:items="unpublishActions"
							data-testid="agent-publish-dropdown"
							@select="onDropdownSelect"
						/>
					</template>
					<!-- End publish button -->
					<button
						v-if="chatActive"
						:class="$style.toggleBtn"
						data-testid="new-chat"
						@click="chatActive = false"
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
				<AgentHomeContent
					v-if="!chatActive"
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
				<AgentChatPanel
					v-else
					:project-id="projectId"
					:agent-id="agentId"
					mode="inline"
					:endpoint="chatEndpoint"
					:initial-message="initialPrompt"
					@config-updated="onConfigUpdated"
					@update:streaming="onChatStreamingChange"
				/>
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
			:is-dirty="isDirty"
			:building="isBuilding"
			@update:config="onConfigFieldUpdate"
			@save="saveConfig"
			@cancel="cancelConfig"
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

.publishedBadge {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--success);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border: var(--border-width) var(--border-style) var(--color--success);
	border-radius: var(--radius);
}
</style>
