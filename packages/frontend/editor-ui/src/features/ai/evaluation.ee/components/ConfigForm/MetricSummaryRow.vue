<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { EvaluationMetric } from '@n8n/api-types';
import { N8nIconButton, N8nText } from '@n8n/design-system';

const props = defineProps<{
	metric: EvaluationMetric;
}>();

const emit = defineEmits<{
	edit: [];
	remove: [];
}>();

const locale = useI18n();

const typeLabel = computed(() => {
	if (props.metric.type === 'expression') {
		return locale.baseText('evaluations.config.addExpressionMetric');
	}
	return locale.baseText('evaluations.config.addLlmJudgeMetric');
});

const subtypeLabel = computed(() => {
	if (props.metric.type === 'expression') {
		return props.metric.config.outputType === 'boolean'
			? locale.baseText('evaluations.config.outputTypeBoolean')
			: locale.baseText('evaluations.config.outputTypeNumeric');
	}
	return props.metric.config.preset === 'correctness'
		? locale.baseText('evaluations.config.presetCorrectness')
		: locale.baseText('evaluations.config.presetHelpfulness');
});

const displayName = computed(
	() => props.metric.name || locale.baseText('evaluations.config.metricName'),
);
</script>

<template>
	<div :class="$style.row">
		<div :class="$style.details">
			<N8nText :class="$style.name" size="small" :bold="true">{{ displayName }}</N8nText>
			<N8nText size="xsmall" color="text-light">{{ typeLabel }} · {{ subtypeLabel }}</N8nText>
		</div>
		<div :class="$style.actions">
			<N8nIconButton
				icon="pencil"
				type="tertiary"
				size="small"
				:title="locale.baseText('generic.edit')"
				@click="emit('edit')"
			/>
			<N8nIconButton
				icon="trash-2"
				type="tertiary"
				size="small"
				:title="locale.baseText('evaluations.config.remove')"
				@click="emit('remove')"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	display: flex;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
}
</style>
