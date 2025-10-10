<script setup lang="ts">
import type { RunningJobSummary } from '@n8n/api-types';
import WorkerAccordion from './WorkerAccordion.ee.vue';
import { useI18n } from '@n8n/i18n';

import { N8nText } from '@n8n/design-system';
const props = defineProps<{
	items: RunningJobSummary[];
}>();

const i18n = useI18n();

function runningSince(started: Date): string {
	let seconds = Math.floor((new Date().getTime() - started.getTime()) / 1000);
	const hrs = Math.floor(seconds / 3600);
	seconds -= hrs * 3600;
	const mnts = Math.floor(seconds / 60);
	seconds -= mnts * 60;
	return `${hrs}h ${mnts}m ${Math.floor(seconds)}s`;
}
</script>

<template>
	<WorkerAccordion icon="list-checks" icon-color="text-dark" :initial-expanded="true">
		<template #title>
			{{ i18n.baseText('workerList.item.jobListTitle') }} ({{ items.length }})
		</template>
		<template #content>
			<div v-if="props.items.length > 0" :class="$style.accordionItems">
				<div v-for="item in props.items" :key="item.executionId" :class="$style.accordionItem">
					<a :href="'/workflow/' + item.workflowId + '/executions/' + item.executionId">
						Execution {{ item.executionId }} - {{ item.workflowName }}</a
					>
					<N8nText color="text-base" size="small" align="left">
						| Started at:
						{{ new Date(item.startedAt)?.toLocaleTimeString() }} | Running for
						{{ runningSince(new Date(item.startedAt)) }}
						{{ item.retryOf ? `| Retry of: ${item.retryOf}` : '' }} |
					</N8nText>
					<a target="_blank" :href="'/workflow/' + item.workflowId"> (Open workflow)</a>
				</div>
			</div>
			<div v-else :class="$style.accordionItems">
				<span :class="$style.empty">
					{{ i18n.baseText('workerList.item.jobList.empty') }}
				</span>
			</div>
		</template>
	</WorkerAccordion>
</template>

<style lang="scss" module>
.accordionItems {
	display: flex;
	flex-direction: column !important;
	align-items: flex-start !important;
	width: 100%;
}

.accordionItem {
	display: block !important;
	text-align: left;
	margin-bottom: var(--spacing--4xs);
}

.empty {
	display: block !important;
	text-align: left;
	margin-top: var(--spacing--2xs);
	margin-left: var(--spacing--4xs);
}
</style>
