<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';

import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
const emit = defineEmits<{
	'update:modelValue': [feedback: 'positive' | 'negative'];
}>();

defineProps<{
	modelValue?: 'positive' | 'negative';
}>();

const i18n = useI18n();

function onFeedback(feedback: 'positive' | 'negative') {
	emit('update:modelValue', feedback);
}
</script>
<template>
	<div class="feedback">
		<N8nText v-if="!modelValue" class="mr-2xs">
			{{ i18n.baseText('feedback.title') }}
		</N8nText>
		<N8nText v-else :color="modelValue === 'positive' ? 'success' : 'danger'">
			<N8nIcon :icon="modelValue === 'positive' ? 'thumbs-up' : 'thumbs-down'" class="mr-2xs" />
			{{ i18n.baseText(`feedback.${modelValue}`) }}
		</N8nText>
		<N8nTooltip v-if="!modelValue" :content="i18n.baseText('feedback.positive')">
			<span
				class="feedback-button"
				data-test-id="feedback-button-positive"
				@click="onFeedback('positive')"
			>
				<N8nIcon icon="thumbs-up" />
			</span>
		</N8nTooltip>
		<N8nTooltip v-if="!modelValue" :content="i18n.baseText('feedback.negative')">
			<span
				class="feedback-button"
				data-test-id="feedback-button-negative"
				@click="onFeedback('negative')"
			>
				<N8nIcon icon="thumbs-down" />
			</span>
		</N8nTooltip>
	</div>
</template>

<style lang="scss">
.feedback {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);

	.feedback-button {
		cursor: pointer;
		width: var(--spacing--lg);
		height: var(--spacing--lg);
		color: var(--color--text--tint-1);
		display: flex;
		justify-content: center;
		align-items: center;

		&:hover {
			color: var(--color--primary);
		}
	}
}
</style>
