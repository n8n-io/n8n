<script setup lang="ts">
import { N8nSlider, type SliderValue } from '@n8n/design-system';

defineProps<{
	modelValue: number;
	/** Names the slider for assistive technology. */
	label: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: number];
}>();

function onUpdate([value]: SliderValue) {
	emit('update:modelValue', value);
}
</script>

<template>
	<N8nSlider
		:model-value="[modelValue]"
		:min-value="10"
		:step="10"
		show-step-markers
		hide-value
		size="small"
		:disabled="disabled"
		:aria-label="label"
		:class="$style.slider"
		data-testid="agent-budget-alert-slider"
		@update:model-value="onUpdate"
	/>
</template>

<style lang="scss" module>
.slider {
	width: 100%;
	min-width: 0;
	max-width: 100%;
}
</style>
