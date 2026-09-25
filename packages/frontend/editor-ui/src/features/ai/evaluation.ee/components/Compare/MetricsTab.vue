<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { CompareMetricGroup, CompareVersion } from '../../composables/useCompareData';
import { formatMetricPercent } from '../../evaluation.utils';
import { versionColorVar } from '../shared/versionPalette';
import MetricCriteria from './MetricCriteria.vue';

defineProps<{
	versions: CompareVersion[];
	metricGroups: CompareMetricGroup[];
	// metric name → its custom LLM-judge prompt, when configured.
	metricPrompts?: Record<string, string>;
}>();

const i18n = useI18n();
</script>

<template>
	<div data-test-id="compare-metrics-tab">
		<table v-if="metricGroups.length > 0" :class="$style.table">
			<thead>
				<tr>
					<th>{{ i18n.baseText('evaluation.compare.metrics.col.metric') }}</th>
					<th v-for="version in versions" :key="version.testRunId" :class="$style.value">
						<span :class="$style.head">
							<span :class="$style.dot" :style="{ background: versionColorVar(version.index) }" />
							{{ version.letter }}
						</span>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="group in metricGroups" :key="group.key" data-test-id="compare-metrics-row">
					<td>
						<div :class="$style.metric">
							<N8nText size="xsmall">{{ group.label }}</N8nText>
							<MetricCriteria :metric-key="group.key" :prompt="metricPrompts?.[group.key]" />
						</div>
					</td>
					<td
						v-for="(value, versionIndex) in group.values"
						:key="versionIndex"
						:class="$style.value"
					>
						<N8nText size="xsmall" :bold="versionIndex === group.bestIndex">
							{{ formatMetricPercent(value ?? undefined) }}
						</N8nText>
					</td>
				</tr>
			</tbody>
		</table>
		<N8nText v-else size="small" color="text-light">
			{{ i18n.baseText('evaluation.compare.metrics.empty') }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--xs);

	th,
	td {
		text-align: left;
		padding: var(--spacing--2xs) var(--spacing--xs);
		border-bottom: 1px solid var(--border-color--subtle);
	}

	th {
		color: var(--text-color--subtle);
		font-weight: var(--font-weight--medium);
	}
}

.value {
	text-align: center;
	vertical-align: top;
}

.metric {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	max-width: 320px;
}

.head {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.dot {
	width: 8px;
	height: 8px;
	border-radius: var(--radius--full);
}
</style>
