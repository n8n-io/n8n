<script setup lang="ts">
import { computed } from 'vue';
import { ElScrollbar } from 'element-plus';
import {
	computeDelta,
	getUserDefinedMetricNames,
	normalizeMetricValue,
	type MetricSource,
} from '../../evaluation.utils';
import MetricSummaryCard from './MetricSummaryCard.vue';

const props = defineProps<{
	currentMetrics: Record<string, number | boolean> | null | undefined;
	previousMetrics: Record<string, number | boolean> | null | undefined;
	metricSources?: Record<string, MetricSource>;
}>();

const metricNames = computed(() => getUserDefinedMetricNames(props.currentMetrics));

const cards = computed(() =>
	metricNames.value.map((name) => {
		const source = props.metricSources?.[name];
		return {
			name,
			currentValue: normalizeMetricValue(props.currentMetrics?.[name]),
			delta: computeDelta(props.currentMetrics?.[name], props.previousMetrics?.[name]),
			category: source?.category,
			sourceNodeName: source?.nodeName,
		};
	}),
);
</script>

<template>
	<ElScrollbar
		v-if="cards.length > 0"
		always
		:class="$style.scroll"
		data-test-id="metric-summary-strip"
	>
		<div :class="$style.row">
			<MetricSummaryCard
				v-for="card in cards"
				:key="card.name"
				:name="card.name"
				:current-value="card.currentValue"
				:delta="card.delta"
				:category="card.category"
				:source-node-name="card.sourceNodeName"
			/>
		</div>
	</ElScrollbar>
</template>

<style module lang="scss">
.scroll {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--border-radius--base);
	background-color: var(--color--background--light-3);

	:global(.el-scrollbar__bar) {
		opacity: 1;
	}
	:global(.el-scrollbar__thumb) {
		background-color: var(--color--foreground);
		&:hover {
			background-color: var(--color--foreground--shade-1);
		}
	}
}

.row {
	display: flex;
}
</style>
