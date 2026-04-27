<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nInput, N8nText } from '@n8n/design-system';
import { computed } from 'vue';

const props = defineProps<{
	modelValue: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const i18n = useI18n();

const intent = computed({
	get: () => props.modelValue,
	set: (value) => emit('update:modelValue', value),
});
</script>

<template>
	<div :class="$style.step">
		<N8nText size="large" tag="h3" bold>
			{{ i18n.baseText('evaluation.wizard.intent.title') }}
		</N8nText>
		<N8nText size="small" color="text-base">
			{{ i18n.baseText('evaluation.wizard.intent.description') }}
		</N8nText>
		<N8nInput
			v-model="intent"
			type="textarea"
			:rows="6"
			:placeholder="i18n.baseText('evaluation.wizard.intent.placeholder')"
			data-test-id="eval-wizard-intent-input"
		/>
	</div>
</template>

<style module lang="scss">
.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
