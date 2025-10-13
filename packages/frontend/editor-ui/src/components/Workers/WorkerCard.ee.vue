<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import type { WorkerStatus } from '@n8n/api-types';

import { useOrchestrationStore } from '@/stores/orchestration.store';
import { averageWorkerLoadFromLoadsAsString, memAsGb } from '../../utils/workerUtils';
import WorkerJobAccordion from './WorkerJobAccordion.ee.vue';
import WorkerNetAccordion from './WorkerNetAccordion.ee.vue';
import WorkerChartsAccordion from './WorkerChartsAccordion.ee.vue';
import { sortByProperty } from '@n8n/utils/sort/sortByProperty';
import { useI18n } from '@n8n/i18n';

import { N8nCard, N8nHeading, N8nText } from '@n8n/design-system';
let interval: NodeJS.Timeout;

const orchestrationStore = useOrchestrationStore();

const i18n = useI18n();

const props = defineProps<{
	workerId: string;
}>();

const secondsSinceLastUpdateString = ref<string>('0');
const stale = ref<boolean>(false);

const worker = computed((): WorkerStatus | undefined => {
	return orchestrationStore.getWorkerStatus(props.workerId);
});

const sortedWorkerInterfaces = computed(() =>
	sortByProperty('family', worker.value?.interfaces.slice() ?? []),
);

function upTime(seconds: number): string {
	const days = Math.floor(seconds / (3600 * 24));
	seconds -= days * 3600 * 24;
	const hrs = Math.floor(seconds / 3600);
	seconds -= hrs * 3600;
	const mnts = Math.floor(seconds / 60);
	seconds -= mnts * 60;
	return `${days}d ${hrs}h ${mnts}m ${Math.floor(seconds)}s`;
}

onMounted(() => {
	interval = setInterval(() => {
		const lastUpdated = orchestrationStore.getWorkerLastUpdated(props.workerId);
		if (!lastUpdated) {
			return;
		}
		const secondsSinceLastUpdate = Math.ceil((Date.now() - lastUpdated) / 1000);
		stale.value = secondsSinceLastUpdate > 10;
		secondsSinceLastUpdateString.value = secondsSinceLastUpdate.toFixed(0);
	}, 500);
});

onBeforeUnmount(() => {
	clearInterval(interval);
});
</script>

<template>
	<N8nCard v-if="worker" :class="$style.cardLink">
		<template #header>
			<N8nHeading
				tag="h2"
				bold
				:class="stale ? [$style.cardHeading, $style.stale] : [$style.cardHeading]"
				data-test-id="worker-card-name"
			>
				Name: {{ worker.senderId }} ({{ worker.hostname }}) <br />
				Average Load: {{ averageWorkerLoadFromLoadsAsString(worker.loadAvg ?? [0]) }} | Free Memory:
				{{ memAsGb(worker.freeMem).toFixed(2) }}GB / {{ memAsGb(worker.totalMem).toFixed(2) }}GB
				{{ stale ? ' (stale)' : '' }}
			</N8nHeading>
		</template>
		<div :class="$style.cardDescription">
			<N8nText color="text-light" size="small" :class="$style.container">
				<span
					>{{ i18n.baseText('workerList.item.lastUpdated') }} {{ secondsSinceLastUpdateString }}s
					ago | n8n-Version: {{ worker.version }} | Architecture: {{ worker.arch }} (
					{{ worker.platform }}) | Uptime: {{ upTime(worker.uptime) }}</span
				>
				<WorkerJobAccordion :items="worker.runningJobsSummary" />
				<WorkerNetAccordion :items="sortedWorkerInterfaces" />
				<WorkerChartsAccordion :worker-id="worker.senderId" />
			</N8nText>
		</div>
		<template #append>
			<div ref="cardActions" :class="$style.cardActions">
				<!-- For future Worker actions -->
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.container {
	width: 100%;
}

.cardLink {
	transition: box-shadow 0.3s ease;
	cursor: pointer;
	padding: 0;
	align-items: stretch;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.cardHeading {
	font-size: var(--font-size--sm);
	word-break: break-word;
	padding: var(--spacing--sm) 0 0 var(--spacing--sm);
}

.stale {
	opacity: 0.5;
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);
}

.cardActions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	align-self: stretch;
	padding: 0 var(--spacing--sm) 0 0;
	cursor: default;
}
</style>
