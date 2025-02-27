<script setup lang="ts">
import { useTemplateRef, nextTick } from 'vue';
import type { TestMetricRecord } from '@/api/testDefinition.ee';
import { useI18n } from '@/composables/useI18n';
import { N8nInput, N8nButton, N8nIconButton } from '@n8n/design-system';

export interface MetricsInputProps {
	modelValue: Array<Partial<TestMetricRecord>>;
}
const props = defineProps<MetricsInputProps>();
const emit = defineEmits<{
	'update:modelValue': [value: MetricsInputProps['modelValue']];
	deleteMetric: [metric: TestMetricRecord];
}>();
const locale = useI18n();
const metricsRefs = useTemplateRef<Array<InstanceType<typeof N8nInput>>>('metric');

function addNewMetric() {
	emit('update:modelValue', [...props.modelValue, { name: '' }]);
	void nextTick(() => metricsRefs.value?.at(-1)?.focus());
}

function updateMetric(index: number, name: string) {
	const newMetrics = [...props.modelValue];
	newMetrics[index].name = name;
	emit('update:modelValue', newMetrics);
}

function onDeleteMetric(metric: Partial<TestMetricRecord>, index: number) {
	if (!metric.id) {
		const newMetrics = [...props.modelValue];
		newMetrics.splice(index, 1);
		emit('update:modelValue', newMetrics);
	} else {
		emit('deleteMetric', metric as TestMetricRecord);
	}
}
</script>

<template>
	<div>
		<div
			v-for="(metric, index) in modelValue"
			:key="index"
			:class="$style.metricItem"
			class="mb-xs"
		>
			<N8nInput
				ref="metric"
				data-test-id="evaluation-metric-item"
				:model-value="metric.name"
				:placeholder="locale.baseText('testDefinition.edit.metricsPlaceholder')"
				@update:model-value="(value: string) => updateMetric(index, value)"
			/>
			<N8nIconButton icon="trash" type="secondary" text @click="onDeleteMetric(metric, index)" />
		</div>
		<N8nButton
			type="secondary"
			:label="locale.baseText('testDefinition.edit.metricsNew')"
			@click="addNewMetric"
		/>
	</div>
</template>

<style module lang="scss">
.metricItem {
	display: flex;
	align-items: center;
}
</style>
