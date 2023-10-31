<template>
	<div :class="['accordion', $style.container]">
		<div :class="{ [$style.header]: true, [$style.expanded]: expanded }" @click="toggle">
			<n8n-icon :icon="'tasks'" :color="'black'" size="small" class="mr-2xs" />
			<n8n-text :class="$style.headerText" color="text-base" size="small" align="left" bold
				>{{ $locale.baseText('workerList.item.listTitle') }} ({{ items.length }})</n8n-text
			>
			<n8n-icon :icon="expanded ? 'chevron-up' : 'chevron-down'" bold />
		</div>
		<div v-if="expanded" :class="{ [$style.description]: true, [$style.collapsed]: !expanded }">
			<!-- Info accordion can display list of items with icons or just a HTML description -->
			<div v-if="props.items.length > 0" :class="$style.accordionItems">
				<div v-for="item in props.items" :key="item.executionId" :class="$style.accordionItem">
					<a :href="'/workflow/' + item.workflowId + '/executions/' + item.executionId">
						Execution {{ item.executionId }} - {{ item.workflowName }}</a
					>

					<n8n-text color="text-base" size="small" align="left">
						| Started at:
						{{ new Date(item.startedAt)?.toLocaleTimeString() }} | Running for
						{{ runningSince(new Date(item.startedAt)) }}
						{{ item.retryOf ? `| Retry of: ${item.retryOf}` : '' }} |
					</n8n-text>
					<a target="_blank" :href="'/workflow/' + item.workflowId"> (Open workflow)</a>
				</div>
			</div>
			<slot name="customContent"></slot>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { WorkerJobStatusSummary } from '../Interface';

const props = defineProps<{
	items: WorkerJobStatusSummary[];
}>();

const expanded = ref<boolean>(true);

function toggle() {
	expanded.value = !expanded.value;
}

function runningSince(started: Date): string {
	let seconds = Math.floor((new Date().getTime() - started.getTime()) / 1000);
	const hrs = Math.floor(seconds / 3600);
	seconds -= hrs * 3600;
	const mnts = Math.floor(seconds / 60);
	seconds -= mnts * 60;
	return `${hrs}h ${mnts}m ${Math.floor(seconds)}s`;
}
</script>

<style lang="scss" module>
.container {
	width: 100%;
}

.header {
	cursor: pointer;
	display: flex;
	padding-top: var(--spacing-s);
	align-items: center;

	.headerText {
		flex-grow: 1;
	}
}

.expanded {
	padding: var(--spacing-s) 0 var(--spacing-2xs) 0;
}

.accordionItems {
	display: flex;
	flex-direction: column !important;
	align-items: flex-start !important;
	width: 100%;
}

.accordionItem {
	display: block !important;
	text-align: left;
	margin-bottom: var(--spacing-4xs);
}

.description {
	display: flex;
	padding: 0 var(--spacing-s) var(--spacing-s) var(--spacing-s);

	b {
		font-weight: var(--font-weight-bold);
	}
}
</style>
