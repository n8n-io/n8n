<script setup lang="ts">
import WorkerAccordion from './WorkerAccordion.ee.vue';
import { WORKER_HISTORY_LENGTH, useOrchestrationStore } from '@/stores/orchestration.store';
import { ref } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import type { ChartComponentRef } from 'vue-chartjs';
import { Chart } from 'vue-chartjs';
import { averageWorkerLoadFromLoads, memAsGb } from '@/utils/workerUtils';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	workerId: string;
}>();

const i18n = useI18n();

const blankDataSet = (label: string, color: string, prefill: number = 0) => ({
	datasets: [
		{
			label,
			backgroundColor: color,
			data: prefill ? Array<number>(Math.min(WORKER_HISTORY_LENGTH, prefill)).fill(0) : [],
		},
	],
	labels: Array<string>(Math.min(WORKER_HISTORY_LENGTH, prefill)).fill(''),
});

const orchestrationStore = useOrchestrationStore();
const chartRefJobs = ref<ChartComponentRef | undefined>(undefined);
const chartRefCPU = ref<ChartComponentRef | undefined>(undefined);
const chartRefMemory = ref<ChartComponentRef | undefined>(undefined);
const optionsBase: () => Partial<ChartOptions<'line'>> = () => ({
	responsive: true,
	maintainAspectRatio: true,
	scales: {
		y: {
			type: 'linear',
			display: true,
			position: 'left',
			min: 0,
			suggestedMax: 5,
		},
	},
	// uncomment to disable animation
	// animation: {
	// 	duration: 0,
	// },
});
const optionsJobs: Partial<ChartOptions<'line'>> = optionsBase();
const optionsCPU: Partial<ChartOptions<'line'>> = optionsBase();
if (optionsCPU.scales?.y) optionsCPU.scales.y.suggestedMax = 100;
const maxMemory = memAsGb(orchestrationStore.workers[props.workerId]?.totalMem) ?? 1;
const optionsMemory: Partial<ChartOptions<'line'>> = optionsBase();
if (optionsMemory.scales?.y) optionsMemory.scales.y.suggestedMax = maxMemory;

// prefilled initial arrays
const dataJobs = ref<ChartData>(
	blankDataSet('Job Count', 'rgb(255, 111, 92)', WORKER_HISTORY_LENGTH),
);
const dataCPU = ref<ChartData>(
	blankDataSet('Processor Usage', 'rgb(19, 205, 103)', WORKER_HISTORY_LENGTH),
);
const dataMemory = ref<ChartData>(
	blankDataSet('Memory Usage', 'rgb(244, 216, 174)', WORKER_HISTORY_LENGTH),
);

orchestrationStore.$onAction(({ name, store }) => {
	if (name === 'updateWorkerStatus') {
		const prefillCount =
			WORKER_HISTORY_LENGTH - (store.workersHistory[props.workerId]?.length ?? 0);
		const newDataJobs: ChartData = blankDataSet('Job Count', 'rgb(255, 111, 92)', prefillCount);
		const newDataCPU: ChartData = blankDataSet(
			'Processor Usage',
			'rgb(19, 205, 103)',
			prefillCount,
		);
		const newDataMemory: ChartData = blankDataSet(
			'Memory Usage',
			'rgb(244, 216, 174)',
			prefillCount,
		);
		store.workersHistory[props.workerId]?.forEach((item) => {
			newDataJobs.datasets[0].data.push(item.data.runningJobsSummary.length);
			newDataJobs.labels?.push(new Date(item.timestamp).toLocaleTimeString());
			newDataCPU.datasets[0].data.push(averageWorkerLoadFromLoads(item.data.loadAvg));
			newDataCPU.labels = newDataJobs.labels;
			newDataMemory.datasets[0].data.push(maxMemory - memAsGb(item.data.freeMem));
			newDataMemory.labels = newDataJobs.labels;
		});
		dataJobs.value = newDataJobs;
		dataCPU.value = newDataCPU;
		dataMemory.value = newDataMemory;
	}
});
</script>

<template>
	<WorkerAccordion icon="list-checks" icon-color="text-dark" :initial-expanded="false">
		<template #title>
			{{ i18n.baseText('workerList.item.chartsTitle') }}
		</template>
		<template #content>
			<div :class="$style.charts">
				<Chart
					ref="chartRefJobs"
					type="line"
					:data="dataJobs"
					:options="optionsJobs"
					:class="$style.chart"
				/>
				<Chart
					ref="chartRefCPU"
					type="line"
					:data="dataCPU"
					:options="optionsCPU"
					:class="$style.chart"
				/>
				<Chart
					ref="chartRefMemory"
					type="line"
					:data="dataMemory"
					:options="optionsMemory"
					:class="$style.chart"
				/>
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

.charts {
	width: 100%;
	flex-direction: column;
}

.chart {
	max-width: 100%;
	max-height: 200px;
	position: relative;
}
</style>
