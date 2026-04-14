<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nActionDropdown, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { getAgent, updateAgent, deleteAgent } from '../composables/useAgentApi';
import type { AgentResource, AgentJsonConfig } from '../types';
import { AGENTS_LIST_VIEW } from '../constants';
import { useAgentConfig } from '../composables/useAgentConfig';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { deepCopy } from 'n8n-workflow';
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

// Config
const { config, fetchConfig, updateConfig } = useAgentConfig();
const localConfig = ref<AgentJsonConfig | null>(null);

const originalConfigJson = ref('');
const isDirty = ref(false);

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

async function buildFromPrompt(msg: string) {
	if (isBuilding.value) return;

	isBuilding.value = true;
	settingsVisible.value = true;
	telemetry.track('User started agent build', { agent_id: agentId.value });

	try {
		const { baseUrl } = rootStore.restApiContext;
		const browserId = localStorage.getItem('n8n-browserId') ?? '';
		const url = `${baseUrl}/projects/${projectId.value}/agents/v2/${agentId.value}/build`;

		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'browser-id': browserId },
			credentials: 'include',
			body: JSON.stringify({ message: msg }),
		});

		if (!response.ok || !response.body) return;

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				try {
					const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
					if (data.configUpdated !== undefined || data.toolUpdated !== undefined) {
						await onConfigUpdated();
					}
				} catch {
					// skip malformed JSON
				}
			}
		}

		// Final refresh after stream ends
		await onConfigUpdated();
	} finally {
		isBuilding.value = false;
	}
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
		void buildFromPrompt(prompt);
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
					@send-message="buildFromPrompt"
					@update:name="updateName"
					@update:description="updateDescription"
					@update:icon="agentIcon = $event"
				/>
				<AgentChatPanel
					v-else
					:project-id="projectId"
					:agent-id="agentId"
					mode="inline"
					:initial-message="initialPrompt"
					@config-updated="onConfigUpdated"
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
</style>
