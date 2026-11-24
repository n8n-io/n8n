<script setup lang="ts">
import { N8nSlider, type SliderValue } from '@n8n/design-system';

interface ConcurrencySliderProps {
	modelValue?: number;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	/** @deprecated Accepted for compatibility. Fixed percentage markers do not represent concurrency steps. */
	showStops?: boolean;
	label?: string;
}

withDefaults(defineProps<ConcurrencySliderProps>(), {
	min: 0,
	max: 100,
	step: 1,
	disabled: false,
	showStops: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: number];
	change: [value: number];
}>();

function onUpdate([value]: SliderValue) {
	emit('update:modelValue', value);
}

function onCommit([value]: SliderValue) {
	emit('change', value);
}
</script>

<template>
	<N8nSlider
		:model-value="modelValue === undefined ? undefined : [modelValue]"
		:min-value="min"
		:max-value="max"
		:step="step"
		:disabled="disabled"
		:show-step-markers="false"
		:aria-label="label"
		hide-value
		size="small"
		:class="$style.slider"
		@update:model-value="onUpdate"
		@value-commit="onCommit"
	/>
</template>

<style lang="scss" module>
.slider {
	--n8n-slider--fill: var(--background--brand);
	--n8n-slider--radius: var(--radius--full);
	min-width: 0;
}
</style>
