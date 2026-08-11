<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nBadge, N8nIcon, N8nRadioButtons, N8nText } from '@n8n/design-system';
import type { FieldProfile } from '../dataProfiling.types';
import ProfileFrequencyBars from './ProfileFrequencyBars.vue';
import ProfileFrequencyPie from './ProfileFrequencyPie.vue';
import ProfileHistogramChart from './ProfileHistogramChart.vue';
import ProfileHistogramPie from './ProfileHistogramPie.vue';

const props = defineProps<{
	field: FieldProfile;
}>();

const i18n = useI18n();

const hasMixedType = computed(() => props.field.mixedTypeCount > 0);
const fieldTotal = computed(() => props.field.presentCount + props.field.missingCount);

const chartMode = ref<'bar' | 'pie'>('bar');
const chartModeOptions = [
	{ label: i18n.baseText('runData.profile.chartModeBar'), value: 'bar' as const },
	{ label: i18n.baseText('runData.profile.chartModePie'), value: 'pie' as const },
];
</script>

<template>
	<div :class="$style.card">
		<div :class="$style.header">
			<N8nText bold color="text-dark">{{ field.path }}</N8nText>
			<N8nBadge size="small" :show-border="false">{{ field.type }}</N8nBadge>
			<N8nText v-if="hasMixedType" size="small" color="text-light">
				{{
					i18n.baseText('runData.profile.mixedTypeNote', {
						interpolate: { count: field.mixedTypeCount },
					})
				}}
			</N8nText>

			<N8nRadioButtons
				v-model="chartMode"
				:options="chartModeOptions"
				size="small"
				square-buttons
				:class="$style.chartModeToggle"
			>
				<template #option="option">
					<N8nIcon
						:icon="option.value === 'bar' ? 'chart-column-decreasing' : 'chart-pie'"
						size="small"
					/>
				</template>
			</N8nRadioButtons>
		</div>

		<template v-if="field.stats.kind === 'histogram'">
			<ProfileHistogramChart
				v-if="chartMode === 'bar'"
				:bins="field.stats.bins"
				:missing-count="field.missingCount"
			/>
			<ProfileHistogramPie v-else :bins="field.stats.bins" :missing-count="field.missingCount" />
		</template>
		<template v-else-if="field.stats.kind === 'frequency'">
			<ProfileFrequencyBars
				v-if="chartMode === 'bar'"
				:entries="field.stats.entries"
				:missing-count="field.missingCount"
				:total="fieldTotal"
			/>
			<ProfileFrequencyPie
				v-else
				:entries="field.stats.entries"
				:missing-count="field.missingCount"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--2xs);
	background-color: var(--color--background--light-3);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}

.chartModeToggle {
	margin-left: auto;
}
</style>
