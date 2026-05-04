<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import {
	formatMetricLabel,
	formatMetricPercent,
	formatMetricRawScore,
	getUserDefinedMetricNames,
	type DeltaTone,
	type MetricSource,
} from '../../evaluation.utils';

const props = defineProps<{
	metrics: Record<string, number | boolean> | null | undefined;
	/**
	 * Per-metric tone derived from the run-level delta. Keyed by metric name.
	 * Per-case rows inherit the aggregate run's tone for the same metric so a
	 * metric that's declining run-over-run is highlighted everywhere it appears.
	 */
	metricTones: Record<string, DeltaTone>;
	metricSources?: Record<string, MetricSource>;
}>();

const locale = useI18n();

const rows = computed(() =>
	getUserDefinedMetricNames(props.metrics).map((name) => {
		const tone = props.metricTones[name] ?? 'default';
		const source = props.metricSources?.[name];
		return {
			name,
			label: formatMetricLabel(name),
			tone,
			category: source?.category,
			sourceNodeName: source?.nodeName,
			percent: formatMetricPercent(props.metrics?.[name], { category: source?.category }),
			rawScore: formatMetricRawScore(props.metrics?.[name], { category: source?.category }),
		};
	}),
);
</script>

<template>
	<table v-if="rows.length > 0" :class="$style.table" data-test-id="test-case-metrics-table">
		<thead>
			<tr>
				<th :class="$style.headerCell">
					{{ locale.baseText('evaluation.runDetail.metrics.name') }}
				</th>
				<th :class="[$style.headerCell, $style.numeric]">
					{{ locale.baseText('evaluation.runDetail.metrics.result') }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="row in rows" :key="row.name">
				<td :class="$style.cell">
					<div :class="$style.labelRow">
						<N8nText size="medium" bold>{{ row.label }}</N8nText>
						<N8nTooltip v-if="row.sourceNodeName" :content="row.sourceNodeName" placement="top">
							<N8nIcon icon="circle-check" :class="$style.checkIcon" size="small" />
						</N8nTooltip>
						<N8nIcon
							v-else-if="row.category"
							icon="circle-check"
							:class="$style.checkIcon"
							size="small"
						/>
					</div>
				</td>
				<td :class="[$style.cell, $style.numeric, $style[`tone-${row.tone}`]]">
					<span>{{ row.percent }}</span>
					<span v-if="row.rawScore" :class="$style.rawScore">{{ row.rawScore }}</span>
				</td>
			</tr>
		</tbody>
	</table>
</template>

<style module lang="scss">
.table {
	width: 100%;
	border-collapse: collapse;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--border-radius--base);
	overflow: hidden;
}

.headerCell {
	text-align: left;
	padding: var(--spacing--xs) var(--spacing--md);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--regular);
	font-size: var(--font-size--xs);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.cell {
	padding: var(--spacing--sm) var(--spacing--md);
	background-color: var(--color--background--light-3);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

tr:last-child .cell {
	border-bottom: none;
}

.numeric {
	text-align: right;
}

.labelRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.checkIcon {
	color: var(--icon-color--success);
}

.rawScore {
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--regular);
	margin-left: var(--spacing--2xs);
}

.tone-default {
	color: var(--color--text);
}

.tone-positive {
	color: var(--text-color--success);
}

.tone-negative {
	color: var(--text-color--danger);
}
</style>
