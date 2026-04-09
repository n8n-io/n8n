<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nButton } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { getAgent, updateAgent } from '../composables/useAgentApi';
import type { AgentResource, AgentJsonConfig } from '../types';
import { useAgentConfig } from '../composables/useAgentConfig';
import AgentSidebar from '../components/AgentSidebar.vue';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentCodeEditor from '../components/AgentCodeEditor.vue';
import AgentIntegrationsPanel from '../components/AgentIntegrationsPanel.vue';
import AgentOverviewPanel from '../components/AgentOverviewPanel.vue';
import AgentToolsPanel from '../components/AgentToolsPanel.vue';
import AgentPromptsPanel from '../components/AgentPromptsPanel.vue';
import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';

const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);
const agentId = route.params.agentId as string;

const activeTab = ref((route.query.tab as string) || 'overview');

watch(activeTab, (tab) => {
	void router.replace({ query: { ...route.query, tab } });
});
watch(
	() => route.query.tab as string | undefined,
	(tab) => {
		if (tab && tab !== activeTab.value) activeTab.value = tab;
	},
);

const chatVisible = ref(true);
const agentName = ref('');
const agent = ref<AgentResource | null>(null);
const editingName = ref(false);

const isDirty = ref(false);
const saving = ref(false);

const { config, fetchConfig, updateConfig } = useAgentConfig();

async function fetchAgent() {
	const data = await getAgent(rootStore.restApiContext, projectId.value, agentId);
	agent.value = data;
	agentName.value = data.name;
}

function onConfigUpdate(partial: Partial<AgentJsonConfig>) {
	// Optimistically merge so the UI stays responsive
	if (config.value) {
		Object.assign(config.value, partial);
		if (partial.config !== undefined) {
			config.value.config = { ...config.value.config, ...partial.config };
		}
	}
	isDirty.value = true;
}

function onConfigJsonChange(newConfig: AgentJsonConfig) {
	config.value = newConfig;
	isDirty.value = true;
}

async function saveConfig() {
	if (!config.value || saving.value) return;
	saving.value = true;
	try {
		await updateConfig(projectId.value, agentId, config.value);
		isDirty.value = false;
	} finally {
		saving.value = false;
	}
}

async function saveName() {
	if (!agentName.value.trim()) return;
	const updated = await updateAgent(rootStore.restApiContext, projectId.value, agentId, {
		name: agentName.value.trim(),
	});
	if (updated) {
		agent.value = updated;
		agentName.value = updated.name;
	}
	editingName.value = false;
}

async function onConfigUpdated() {
	await Promise.all([fetchAgent(), fetchConfig(projectId.value, agentId)]);
	isDirty.value = false;
}

function onNameKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		event.preventDefault();
		void saveName();
	} else if (event.key === 'Escape') {
		agentName.value = agent.value?.name ?? '';
		editingName.value = false;
	}
}

function onKeydown(event: KeyboardEvent) {
	if ((event.metaKey || event.ctrlKey) && event.key === 's') {
		event.preventDefault();
		if (isDirty.value) void saveConfig();
	}
}

onMounted(async () => {
	await fetchAgent();
	await fetchConfig(projectId.value, agentId);
	window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
	window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
	<div :class="$style.builder">
		<AgentSidebar :active-tab="activeTab" @select="activeTab = $event" />
		<div :class="$style.main">
			<div :class="$style.nameBar">
				<input
					v-if="editingName"
					v-model="agentName"
					:class="$style.nameInput"
					autofocus
					@blur="saveName"
					@keydown="onNameKeydown"
				/>
				<h2 v-else :class="$style.nameDisplay" @click="editingName = true">
					{{ agentName || 'Untitled Agent' }}
				</h2>

				<div :class="$style.nameBarActions">
					<span v-if="isDirty && !saving" :class="$style.unsavedDot" title="Unsaved changes" />
					<N8nButton
						v-if="isDirty || saving"
						type="primary"
						size="small"
						:loading="saving"
						:disabled="saving"
						data-testid="save-config-btn"
						@click="saveConfig"
					>
						{{ saving ? 'Saving…' : 'Save' }}
					</N8nButton>
				</div>
			</div>

			<AgentOverviewPanel
				v-if="activeTab === 'overview'"
				:config="config"
				@update:config="onConfigUpdate"
			/>
			<AgentPromptsPanel
				v-else-if="activeTab === 'prompts'"
				:config="config"
				@update:config="onConfigUpdate"
			/>
			<AgentToolsPanel
				v-else-if="activeTab === 'tools'"
				:config="config"
				:agent-tools="agent?.tools ?? {}"
				@update:config="onConfigUpdate"
			/>
			<AgentMemoryPanel
				v-else-if="activeTab === 'memory'"
				:config="config"
				@update:config="onConfigUpdate"
			/>
			<div v-else-if="activeTab === 'config'" :class="$style.configPanel">
				<AgentCodeEditor
					:config="config"
					:agent-tools="agent?.tools ?? {}"
					@update:config="onConfigJsonChange"
				/>
			</div>
			<AgentIntegrationsPanel
				v-else-if="activeTab === 'integrations'"
				:project-id="projectId"
				:agent-id="agentId"
			/>
		</div>
		<AgentChatPanel
			:visible="chatVisible"
			:project-id="projectId"
			:agent-id="agentId"
			@close="chatVisible = false"
			@config-updated="onConfigUpdated"
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

.main {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
}

.nameBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--foreground--tint-2);
}

.nameBarActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-left: auto;
}

.unsavedDot {
	display: inline-block;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background-color: var(--color--warning);
}

.nameDisplay {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	margin: 0;
	cursor: pointer;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border-radius: var(--radius);
}

.nameDisplay:hover {
	background-color: var(--color--foreground--tint-1);
}

.nameInput {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	background-color: var(--color--foreground--tint-2);
	border: var(--border-width) var(--border-style) var(--color--primary);
	border-radius: var(--radius);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	outline: none;
	font-family: var(--font-family);
}

.configPanel {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
}
</style>
