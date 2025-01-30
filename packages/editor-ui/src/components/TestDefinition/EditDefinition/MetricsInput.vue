<script setup lang="ts">
import type { TestMetricRecord } from '@/api/testDefinition.ee';
import { useI18n } from '@/composables/useI18n';

export interface MetricsInputProps {
	modelValue: Array<Partial<TestMetricRecord>>;
}
const props = defineProps<MetricsInputProps>();
const emit = defineEmits<{
	'update:modelValue': [value: MetricsInputProps['modelValue']];
	deleteMetric: [metric: Partial<TestMetricRecord>];
}>();
const locale = useI18n();

function addNewMetric() {
	emit('update:modelValue', [...props.modelValue, { name: '' }]);
}

function updateMetric(index: number, name: string) {
	const newMetrics = [...props.modelValue];
	newMetrics[index].name = name;
	emit('update:modelValue', newMetrics);
}

function onDeleteMetric(metric: Partial<TestMetricRecord>) {
	emit('deleteMetric', metric);
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
				<div v-for="(metric, index) in modelValue" :key="index" :class="$style.metricItem">
					<N8nInput
						:ref="`metric_${index}`"
						data-test-id="evaluation-metric-item"
						:model-value="metric.name"
						:placeholder="locale.baseText('testDefinition.edit.metricsPlaceholder')"
						@update:model-value="(value: string) => updateMetric(index, value)"
					/>
					<n8n-icon-button icon="trash" type="text" @click="onDeleteMetric(metric)" />
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

.metricItem {
	display: flex;
	align-items: center;
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
