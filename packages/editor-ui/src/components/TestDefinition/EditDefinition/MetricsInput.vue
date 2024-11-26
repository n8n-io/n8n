<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

export interface MetricsInputProps {
	modelValue: string[];
}
const props = defineProps<MetricsInputProps>();
const emit = defineEmits<{ 'update:modelValue': [value: MetricsInputProps['modelValue']] }>();
const locale = useI18n();

function addNewMetric() {
	emit('update:modelValue', [...props.modelValue, '']);
}

function updateMetric(index: number, value: string) {
	const newMetrics = [...props.modelValue];
	newMetrics[index] = value;
	emit('update:modelValue', newMetrics);
}
</script>

<template>
	<div :class="[$style.metrics]">
		<n8n-input-label
			:label="locale.baseText('testDefinition.edit.metricsFields')"
			:bold="false"
			:class="$style.metricField"
		>
			<div :class="$style.metricsContainer">
				<div v-for="(metric, index) in modelValue" :key="index">
					<N8nInput
						:ref="`metric_${index}`"
						data-test-id="evaluation-metric-item"
						:model-value="metric"
						:placeholder="locale.baseText('testDefinition.edit.metricsPlaceholder')"
						@update:model-value="(value: string) => updateMetric(index, value)"
					/>
				</div>
				<n8n-button
					type="tertiary"
					:label="locale.baseText('testDefinition.edit.metricsNew')"
					:class="$style.newMetricButton"
					@click="addNewMetric"
				/>
			</div>
		</n8n-input-label>
	</div>
</template>

<style module lang="scss">
.metricsContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.metricField {
	width: 100%;
	margin-top: var(--spacing-xs);
}

.metricsDivider {
	margin-top: var(--spacing-4xs);
	margin-bottom: var(--spacing-3xs);
}

.newMetricButton {
	align-self: flex-start;
	margin-top: var(--spacing-2xs);
	width: 100%;
	background-color: var(--color-sticky-code-background);
	border-color: var(--color-button-secondary-focus-outline);
	color: var(--color-button-secondary-font);
}
</style>
