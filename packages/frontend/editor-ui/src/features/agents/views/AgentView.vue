<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useI18n } from '@n8n/i18n';
import { N8nRadioButtons } from '@n8n/design-system';
import { getAgent, updateAgent } from '../composables/useAgentApi';
import {
	AGENT_BUILDER_VIEW,
	AGENT_SESSIONS_LIST_VIEW,
	AGENT_SESSION_DETAIL_VIEW,
} from '../constants';

const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const i18n = useI18n();

const agentId = computed(() => route.params.agentId as string);
const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);

// Agent name (editable inline)
const agentName = ref('');
const editingName = ref(false);

onMounted(async () => {
	const data = await getAgent(rootStore.restApiContext, projectId.value, agentId.value);
	agentName.value = data.name;
});

async function saveName() {
	if (!agentName.value.trim()) return;
	const updated = await updateAgent(rootStore.restApiContext, projectId.value, agentId.value, {
		name: agentName.value.trim(),
	});
	if (updated) {
		agentName.value = updated.name;
	}
	editingName.value = false;
}

function onNameKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		event.preventDefault();
		void saveName();
	} else if (event.key === 'Escape') {
		editingName.value = false;
	}
}

// Tab switching
const tabItems = [
	{ label: i18n.baseText('agentView.tab.editor'), value: 'editor' },
	{ label: i18n.baseText('agentView.tab.sessions'), value: 'sessions' },
];

const activeTab = computed(() => {
	if (route.name === AGENT_SESSIONS_LIST_VIEW || route.name === AGENT_SESSION_DETAIL_VIEW) {
		return 'sessions';
	}
	return 'editor';
});

function onTabChange(tab: string) {
	if (tab === 'sessions') {
		void router.push({
			name: AGENT_SESSIONS_LIST_VIEW,
			params: { projectId: projectId.value, agentId: agentId.value },
		});
	} else {
		void router.push({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: projectId.value, agentId: agentId.value },
		});
	}
}
</script>

<template>
	<div :class="$style.agentView">
		<div :class="$style.topBar">
			<div :class="$style.topBarLeft">
				<input
					v-if="editingName"
					v-model="agentName"
					:class="$style.nameInput"
					autofocus
					@blur="saveName"
					@keydown="onNameKeydown"
				/>
				<span v-else :class="$style.nameDisplay" @click="editingName = true">
					{{ agentName || 'Untitled Agent' }}
				</span>
			</div>
			<div :class="$style.topBarRight">
				<N8nRadioButtons
					:model-value="activeTab"
					:options="tabItems"
					@update:model-value="onTabChange"
				/>
			</div>
		</div>
		<div :class="$style.content">
			<RouterView />
		</div>
	</div>
</template>

<style module>
.agentView {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	min-height: 0;
}

.topBar {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--foreground--tint-2);
	flex-shrink: 0;
}

.topBarLeft {
	flex: 1;
	display: flex;
	align-items: center;
	min-width: 0;
}

.topBarRight {
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.nameDisplay {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	cursor: pointer;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border-radius: var(--radius);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
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

.content {
	flex: 1;
	min-height: 0;
	overflow: auto;
}
</style>
