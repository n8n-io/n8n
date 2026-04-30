<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';
import {
	formatMetricPercent,
	getUserDefinedMetricNames,
	normalizeMetricValue,
	type DeltaTone,
} from '../../evaluation.utils';

const props = defineProps<{
	metrics: Record<string, number | boolean> | null | undefined;
	/**
	 * Per-metric tone derived from the run-level delta. Keyed by metric name.
	 * Per-case rows inherit the aggregate run's tone for the same metric so a
	 * metric that's declining run-over-run is highlighted everywhere it appears.
	 */
	metricTones: Record<string, DeltaTone>;
}>();

const locale = useI18n();

const rows = computed(() =>
	getUserDefinedMetricNames(props.metrics).map((name) => {
		const tone = props.metricTones[name] ?? 'default';
		return {
			name,
			value: normalizeMetricValue(props.metrics?.[name]),
			tone,
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
					<N8nText size="medium">{{ row.name }}</N8nText>
				</td>
				<td :class="[$style.cell, $style.numeric, $style[`tone-${row.tone}`]]">
					{{ formatMetricPercent(row.value) }}
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
	padding: var(--spacing--xs) var(--spacing--sm);
	background-color: var(--color--background--light-3);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--regular);
	font-size: var(--font-size--xs);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.cell {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);

	&:last-child {
		border-bottom: none;
	}
}

tr:last-child .cell {
	border-bottom: none;
}

.numeric {
	text-align: right;
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
