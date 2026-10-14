<script setup lang="ts">
import { computed } from 'vue';
import { ElScrollbar } from 'element-plus';
import type { MetricScale } from '@n8n/api-types';
import { normalizeMetricScore } from '@n8n/api-types';
import {
	getUserDefinedMetricNames,
	isUnscaledCustomMetric,
	normalizeMetricValue,
	type MetricSource,
} from '../../evaluation.utils';
import MetricSummaryCard from './MetricSummaryCard.vue';

const props = defineProps<{
	currentMetrics: Record<string, number> | null | undefined;
	previousMetrics: Record<string, number> | null | undefined;
	metricSources?: Record<string, MetricSource>;
	// Per-metric scale from the run's config snapshot — drives scale-correct
	// score formatting (a 1–5 metric → 100%, not 5%).
	metricScales?: Record<string, MetricScale>;
	// The previous run's scales, so the delta normalizes each side on its own
	// frozen scale rather than subtracting raw values across a scale change.
	previousMetricScales?: Record<string, MetricScale>;
	// Per-case raw values per metric — surfaces "sum/count" tooltips on each card.
	caseValuesByKey?: Record<string, Array<number | undefined>>;
}>();

const metricNames = computed(() => getUserDefinedMetricNames(props.currentMetrics));

// Compare score deltas on each run's own scale. Compare unscaled custom metrics
// as raw numbers so the delta uses the same unit as the displayed value.
function metricDelta(
	name: string,
	category: MetricSource['category'] | undefined,
): { value: number | undefined; scale?: MetricScale } {
	const current = normalizeMetricValue(props.currentMetrics?.[name]);
	const previous = normalizeMetricValue(props.previousMetrics?.[name]);
	if (current === undefined || previous === undefined) return { value: undefined };

	const currentScale = props.metricScales?.[name];
	const previousScale = props.previousMetricScales?.[name];
	const currentIsUnscaled = isUnscaledCustomMetric({
		key: name,
		category,
		scale: currentScale,
	});
	const previousIsUnscaled = isUnscaledCustomMetric({
		key: name,
		category,
		scale: previousScale,
	});
	if (currentIsUnscaled !== previousIsUnscaled) return { value: undefined };
	if (currentIsUnscaled) return { value: current - previous };

	const currentScore = normalizeMetricScore(name, current, currentScale);
	const previousScore = normalizeMetricScore(name, previous, previousScale);
	if (currentScore === null || previousScore === null) return { value: undefined };
	return { value: currentScore - previousScore, scale: 'unit' };
}

const cards = computed(() =>
	metricNames.value.map((name) => {
		const source = props.metricSources?.[name];
		const delta = metricDelta(name, source?.category);
		return {
			name,
			currentValue: normalizeMetricValue(props.currentMetrics?.[name]),
			delta: delta.value,
			deltaScale: delta.scale,
			category: source?.category,
			scale: props.metricScales?.[name],
			sourceNodeName: source?.nodeName,
			caseValues: props.caseValuesByKey?.[name] ?? [],
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
				:delta-scale="card.deltaScale"
				:category="card.category"
				:scale="card.scale"
				:source-node-name="card.sourceNodeName"
				:case-values="card.caseValues"
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
	min-width: 100%;
}
</style>
