<script setup lang="ts">
import { N8nRadioButtons, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import type { CompareMetricGroup, CompareVersion } from '../../composables/useCompareData';
import GroupedMetricChart from '../shared/GroupedMetricChart.vue';

const props = defineProps<{
	metricGroups: CompareMetricGroup[];
	versions: CompareVersion[];
}>();

const i18n = useI18n();

// Scores below this fraction paint in the danger color to flag a critical
// regression at a glance. Mirrors the master-spec 60% threshold.
const CRITICAL_THRESHOLD = 0.6;

// v1 ships the aggregate view only; "Per case" small-multiples is a follow-up.
const mode = ref<'average' | 'perCase'>('average');
const modeOptions = computed(() => [
	{ label: i18n.baseText('evaluation.compare.scoreChart.toggle.average'), value: 'average' },
	{
		label: i18n.baseText('evaluation.compare.scoreChart.toggle.perCase'),
		value: 'perCase',
		disabled: true,
	},
]);

// One panel per metric; letters mirror the version order so bars align with
// the legend without re-reading it.
const letters = computed(() => props.versions.map((version) => version.letter));
</script>

<template>
	<section :class="$style.card" data-test-id="compare-score-chart">
		<header :class="$style.header">
			<N8nText tag="h3" size="medium" bold>
				{{ i18n.baseText('evaluation.compare.scoreChart.heading') }}
			</N8nText>
			<!-- Tooltip stays enabled so the "coming soon" hint on the disabled
			     Per-case option is actually reachable. -->
			<N8nTooltip
				placement="top"
				:content="i18n.baseText('evaluation.compare.scoreChart.toggle.perCaseComingSoon')"
			>
				<N8nRadioButtons v-model="mode" size="small" :options="modeOptions" />
			</N8nTooltip>
		</header>

		<div v-if="metricGroups.length > 0" :class="$style.panels">
			<div
				v-for="group in metricGroups"
				:key="group.key"
				:class="$style.panel"
				data-test-id="compare-score-chart-panel"
			>
				<N8nText size="small" bold color="text-base" :class="$style.panelHeading">
					{{ group.label }}
				</N8nText>
				<GroupedMetricChart
					variant="detailed"
					:groups="[{ label: group.label, values: group.values, letters }]"
					:max="1"
					:critical-threshold="CRITICAL_THRESHOLD"
				/>
			</div>
		</div>
		<div v-else :class="$style.empty">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('evaluation.compare.scoreChart.empty') }}
			</N8nText>
		</div>
	</section>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	padding: var(--spacing--md) var(--spacing--lg);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.panels {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--lg) var(--spacing--2xl);
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.panelHeading {
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.empty {
	padding: var(--spacing--lg);
	text-align: center;
}
</style>
