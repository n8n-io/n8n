<script setup lang="ts">
import { N8nButton, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';

import TaskCard from '../components/TaskCard.vue';

import type { DesktopAssistantTasksResponse } from '../../shared/types';

const i18n = useI18n();

const tasks = ref<DesktopAssistantTasksResponse | null>(null);
const loading = ref(true);
const error = ref(false);

const isEmpty = computed(
	() =>
		tasks.value !== null &&
		!tasks.value.actionNeeded?.length &&
		!tasks.value.upcoming?.length &&
		!tasks.value.readyToRun?.length,
);

async function load() {
	loading.value = true;
	error.value = false;
	try {
		tasks.value = await window.electronAPI.getTasks();
	} catch (e) {
		// Surface the cause in devtools — the inline state only shows a generic message.
		console.error('Failed to load desktop-assistant tasks', e);
		error.value = true;
	} finally {
		loading.value = false;
	}
}

function openWorkflow(workflowId: string) {
	void window.electronAPI.openWorkflow(workflowId);
}

async function runTask(workflowId: string) {
	await window.electronAPI.runTask(workflowId);
	// Reflect the new run (e.g. the "Last run" line) without a manual refresh.
	await load();
}

onMounted(load);
</script>

<template>
	<div :class="$style.view">
		<div v-if="loading" :class="$style.state">
			<N8nSpinner />
			<N8nText color="text-light" size="small">{{
				i18n.baseText('desktopAssistant.tasks.loading')
			}}</N8nText>
		</div>

		<div v-else-if="error" :class="$style.state">
			<N8nText color="text-light" size="small">{{
				i18n.baseText('desktopAssistant.tasks.error')
			}}</N8nText>
			<N8nButton variant="outline" size="small" @click="load">{{
				i18n.baseText('desktopAssistant.tasks.retry')
			}}</N8nButton>
		</div>

		<div v-else-if="isEmpty" :class="$style.state">
			<N8nText color="text-light" size="small">{{
				i18n.baseText('desktopAssistant.tasks.empty')
			}}</N8nText>
		</div>

		<template v-else-if="tasks">
			<section v-if="tasks.actionNeeded.length" :class="$style.section">
				<TaskCard
					v-for="card in tasks.actionNeeded"
					:key="card.workflowId"
					:card="card"
					variant="actionNeeded"
					@open="openWorkflow"
					@run="runTask"
				/>
			</section>

			<section v-if="tasks.upcoming.length" :class="$style.section">
				<N8nText :class="$style.sectionTitle">{{
					i18n.baseText('desktopAssistant.sections.upcoming')
				}}</N8nText>
				<TaskCard
					v-for="card in tasks.upcoming"
					:key="card.workflowId"
					:card="card"
					variant="upcoming"
					@open="openWorkflow"
					@run="runTask"
				/>
			</section>

			<section v-if="tasks.readyToRun.length" :class="$style.section">
				<N8nText :class="$style.sectionTitle">{{
					i18n.baseText('desktopAssistant.sections.readyToRun')
				}}</N8nText>
				<TaskCard
					v-for="card in tasks.readyToRun"
					:key="card.workflowId"
					:card="card"
					variant="readyToRun"
					@open="openWorkflow"
					@run="runTask"
				/>
			</section>
		</template>
	</div>
</template>

<style module>
.view {
	display: flex;
	flex-direction: column;
	padding: 4px 8px 8px;
}

.section {
	display: flex;
	flex-direction: column;
}

/* Scoped under `.section` so font-size/weight win over N8nText's own size/weight
   classes (2 classes vs 1); color/transform/spacing have no N8nText equivalent. */
.section .sectionTitle {
	padding: 10px 6px 4px;
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.8px;
	color: var(--da-subtlest);
}

.state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--md);
}
</style>
