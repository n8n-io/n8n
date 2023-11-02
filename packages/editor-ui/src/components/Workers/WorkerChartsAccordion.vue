<template>
	<WorkerAccordion icon="tasks" icon-color="black" :initial-expanded="false">
		<template #title>
			{{ $locale.baseText('workerList.item.chartsTitle') }}
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

<script setup lang="ts">
import WorkerAccordion from './WorkerAccordion.vue';
import { useOrchestrationStore } from '../../stores/orchestration.store';
import { ref } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import {
	Chart as ChartJS,
	Title,
	Tooltip,
	Legend,
	BarElement,
	LineElement,
	PointElement,
	CategoryScale,
	LinearScale,
} from 'chart.js';
import type { ChartComponentRef } from 'vue-chartjs';
import { Chart } from 'vue-chartjs';
import { averageWorkerLoadFromLoads, memAsGb } from './helpers';

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	Title,
	Tooltip,
	Legend,
);

const props = defineProps<{
	workerId: string;
}>();

const blankDataSet = (label?: string, color?: string) => ({
	datasets: [
		{
			label: label ?? 'JobCount',
			backgroundColor: color ?? '#f87979',
			data: [],
		},
	],
	labels: [],
});

const orchestrationStore = useOrchestrationStore();
const chartRefJobs = ref<ChartComponentRef | undefined>(undefined);
const chartRefCPU = ref<ChartComponentRef | undefined>(undefined);
const chartRefMemory = ref<ChartComponentRef | undefined>(undefined);
const optionsJobs: Partial<ChartOptions<'line'>> = {
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
};
const optionsCPU: Partial<ChartOptions<'line'>> = {
	responsive: true,
	maintainAspectRatio: true,
	scales: {
		y: {
			type: 'linear',
			display: true,
			position: 'left',
			min: 0,
			suggestedMax: 100,
		},
	},
};
const maxMemory = memAsGb(orchestrationStore.workers[props.workerId]?.totalMem) ?? 1;
const optionsMemory: Partial<ChartOptions<'line'>> = {
	responsive: true,
	maintainAspectRatio: true,
	scales: {
		y: {
			type: 'linear',
			display: true,
			position: 'left',
			min: 0,
			suggestedMax: maxMemory,
		},
	},
};
const dataJobs = ref<ChartData>(blankDataSet('Job Count'));
const dataCPU = ref<ChartData>(blankDataSet('Processor Usage'));
const dataMemory = ref<ChartData>(blankDataSet('Memory Usage'));

orchestrationStore.$onAction(({ name, store }) => {
	if (name === 'updateWorkerStatus') {
		const newDataJobs: ChartData = blankDataSet('Job Count', 'rgb(255, 111, 92)');
		const newDataCPU: ChartData = blankDataSet('Processor Usage', 'rgb(19, 205, 103)');
		const newDataMemory: ChartData = blankDataSet('Memory Usage', 'rgb(244, 216, 174)');
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
	margin-bottom: var(--spacing-4xs);
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
