<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { EvaluationMetric, MetricOutputType } from '@n8n/api-types';
import { N8nInput, N8nInputLabel, N8nOption, N8nSelect } from '@n8n/design-system';
import MetricExpressionEditor from './MetricExpressionEditor.vue';

type ExpressionMetric = Extract<EvaluationMetric, { type: 'expression' }>;

const props = defineProps<{
	metric: ExpressionMetric;
	endNodeName: string;
}>();

const emit = defineEmits<{
	'update:metric': [metric: ExpressionMetric];
}>();

const locale = useI18n();

const name = computed({
	get: () => props.metric.name,
	set: (value: string) => emit('update:metric', { ...props.metric, name: value }),
});

const expression = computed({
	get: () => props.metric.config.expression,
	set: (value: string) =>
		emit('update:metric', {
			...props.metric,
			config: { ...props.metric.config, expression: value },
		}),
});

const outputType = computed({
	get: () => props.metric.config.outputType,
	set: (value: MetricOutputType) =>
		emit('update:metric', {
			...props.metric,
			config: { ...props.metric.config, outputType: value },
		}),
});

const editorPath = computed(() => `evaluations.metric.${props.metric.id}.expression`);
</script>

<template>
	<div :class="$style.metric">
		<div :class="$style.field">
			<N8nInputLabel :label="locale.baseText('evaluations.config.metricName')" :bold="false">
				<N8nInput v-model="name" size="medium" />
			</N8nInputLabel>
		</div>

		<div :class="$style.field">
			<N8nInputLabel :label="locale.baseText('evaluations.config.expression')" :bold="false">
				<MetricExpressionEditor
					:key="`${metric.id}::${endNodeName}`"
					:model-value="expression"
					mode="expression"
					:path="editorPath"
					:rows="3"
					:end-node-name="endNodeName"
					@update:model-value="expression = $event"
				/>
			</N8nInputLabel>
		</div>

		<div :class="$style.field">
			<N8nInputLabel :label="locale.baseText('evaluations.config.outputType')" :bold="false">
				<N8nSelect v-model="outputType" size="medium">
					<N8nOption
						:label="locale.baseText('evaluations.config.outputTypeNumeric')"
						value="numeric"
					/>
					<N8nOption
						:label="locale.baseText('evaluations.config.outputTypeBoolean')"
						value="boolean"
					/>
				</N8nSelect>
			</N8nInputLabel>
		</div>
	</div>
</template>

<style module lang="scss">
.metric {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
</style>
