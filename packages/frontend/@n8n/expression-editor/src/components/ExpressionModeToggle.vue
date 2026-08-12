<script setup lang="ts">
import { N8nRadioButtons } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

export type ExpressionMode = 'fixed' | 'expression';

const props = withDefaults(
	defineProps<{
		modelValue: ExpressionMode;
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{ 'update:modelValue': [mode: ExpressionMode] }>();

const i18n = useI18n();

const options = computed(() => [
	{ label: i18n.baseText('parameterInput.fixed'), value: 'fixed' },
	{ label: i18n.baseText('parameterInput.expression'), value: 'expression' },
]);

// Re-emitting the already-selected mode is meaningful in the NDV: it reopens the
// expression editor rather than switching into it.
function onSelected(value: string) {
	if (value === 'fixed' || value === 'expression') emit('update:modelValue', value);
}
</script>

<template>
	<N8nRadioButtons
		size="small"
		:model-value="props.modelValue"
		:disabled="props.disabled"
		:options="options"
		@update:model-value="onSelected"
	/>
</template>
