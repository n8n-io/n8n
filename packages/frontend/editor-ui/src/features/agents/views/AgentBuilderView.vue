<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { getAgent, updateAgent, type AgentDto } from '../composables/useAgentApi';
import { useAgentSchema } from '../composables/useAgentSchema';
import type { AgentSchema } from '../types';
import AgentSidebar from '../components/AgentSidebar.vue';
import AgentCodeEditor from '../components/AgentCodeEditor.vue';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentIntegrationsPanel from '../components/AgentIntegrationsPanel.vue';
import AgentOverviewPanel from '../components/AgentOverviewPanel.vue';
import AgentToolsPanel from '../components/AgentToolsPanel.vue';
import AgentPromptsPanel from '../components/AgentPromptsPanel.vue';
import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';
import AgentEvalsPanel from '../components/AgentEvalsPanel.vue';

const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);
const agentId = route.params.agentId as string;

const activeTab = ref((route.query.tab as string) || 'code');

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
const code = ref('');
const agentName = ref('');
const agent = ref<AgentDto | null>(null);
const editingName = ref(false);
const updatedAt = ref<string>('');
let skipNextWatch = false;

const { schema, fetchSchema, updateSchema } = useAgentSchema();
const localSchema = ref<AgentSchema | null>(null);

watch(
	schema,
	(s) => {
		if (s) localSchema.value = JSON.parse(JSON.stringify(s)) as AgentSchema;
	},
	{ immediate: true },
);

async function fetchAgent() {
	const data = await getAgent(rootStore.restApiContext, projectId.value, agentId);
	agent.value = data;
	updatedAt.value = data.updatedAt;
	skipNextWatch = true;
	code.value = data.code;
	agentName.value = data.name;
}

const autoSave = useDebounceFn(async () => {
	if (!agent.value) return;
	const updated = await updateAgent(rootStore.restApiContext, projectId.value, agentId, {
		code: code.value,
	});
	if (updated) {
		updatedAt.value = updated.updatedAt;
		await fetchSchema(projectId.value, agentId);
	}
}, 1000);

watch(code, () => {
	if (skipNextWatch) {
		skipNextWatch = false;
		return;
	}
	void autoSave();
});

// Builder code streaming — accumulates codeDelta fragments from the set_code tool
let codeStreamBuffer = '';
let isCodeStreaming = false;

function onCodeDelta(delta: string) {
	if (!isCodeStreaming) {
		// First delta — start fresh
		isCodeStreaming = true;
		codeStreamBuffer = '';
	}
	codeStreamBuffer += delta;

	// Try to extract the "code" field value from the partial JSON
	// The builder streams JSON like: {"code":"import { Agent }...
	const match = codeStreamBuffer.match(/"code"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/s);
	if (match) {
		// Unescape the JSON string
		try {
			const parsed = JSON.parse(`"${match[1]}"`);
			code.value = parsed;
		} catch {
			// Partial string, show what we have (replace common escapes)
			code.value = match[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
		}
	}
}

function onCodeUpdated() {
	isCodeStreaming = false;
	codeStreamBuffer = '';
	void fetchAgent();
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

function onNameKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		event.preventDefault();
		void saveName();
	} else if (event.key === 'Escape') {
		agentName.value = agent.value?.name ?? '';
		editingName.value = false;
	}
}

function onSchemaFieldUpdate(updates: Partial<AgentSchema>) {
	if (!localSchema.value) return;
	Object.assign(localSchema.value, updates);
	if (updates.config) {
		localSchema.value.config = { ...localSchema.value.config, ...updates.config };
	}
	void debouncedSchemaSave();
}

const debouncedSchemaSave = useDebounceFn(async () => {
	if (!localSchema.value) return;
	const result = await updateSchema(projectId.value, agentId, localSchema.value, updatedAt.value);
	if (result) {
		skipNextWatch = true;
		code.value = result.code;
		updatedAt.value = result.updatedAt;
	} else {
		// 409 conflict — schema was refetched; also refresh agent to get latest updatedAt
		await fetchAgent();
	}
}, 1000);

onMounted(async () => {
	await fetchAgent();
	await fetchSchema(projectId.value, agentId);
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
			</div>
			<AgentCodeEditor v-if="activeTab === 'code'" v-model="code" />
			<AgentOverviewPanel
				v-else-if="activeTab === 'overview'"
				:schema="localSchema"
				@update:schema="onSchemaFieldUpdate"
			/>
			<AgentPromptsPanel
				v-else-if="activeTab === 'prompts'"
				:schema="localSchema"
				@update:schema="onSchemaFieldUpdate"
			/>
			<AgentToolsPanel
				v-else-if="activeTab === 'tools'"
				:schema="localSchema"
				@update:schema="onSchemaFieldUpdate"
			/>
			<AgentMemoryPanel
				v-else-if="activeTab === 'memory'"
				:schema="localSchema"
				@update:schema="onSchemaFieldUpdate"
			/>
			<AgentEvalsPanel v-else-if="activeTab === 'evaluations'" :schema="localSchema" />
			<AgentIntegrationsPanel
				v-else-if="activeTab === 'integrations'"
				:project-id="projectId"
				:agent-id="agentId"
			/>
			<AgentCodeEditor v-else v-model="code" />
		</div>
		<AgentChatPanel
			:visible="chatVisible"
			:project-id="projectId"
			:agent-id="agentId"
			@close="chatVisible = false"
			@code-updated="onCodeUpdated"
			@code-delta="onCodeDelta"
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
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--foreground--tint-2);
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
</style>
