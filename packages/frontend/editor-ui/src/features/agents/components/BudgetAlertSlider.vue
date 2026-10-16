<script setup lang="ts">
import { ElSlider } from 'element-plus';

/**
 * Local slider for the monthly budget alert. The design system has no slider.
 * Keep this next to the budget modal. Do not promote it.
 */

defineProps<{
	modelValue: number;
	/** Accessible name for the slider; forwarded to ElSlider's `label` prop, which sets `aria-label`. */
	label: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: number];
}>();

const brandColor = {
	'--el-slider-main-bg-color': 'var(--background--brand)',
} as const;

function onUpdate(value: number | number[]) {
	const next = Array.isArray(value) ? value[0] : value;
	if (next === undefined) return;
	emit('update:modelValue', next);
}
</script>

<template>
	<ElSlider
		:model-value="modelValue"
		:min="10"
		:step="10"
		:show-stops="true"
		:show-tooltip="false"
		:disabled="disabled"
		:label="label"
		:style="brandColor"
		:class="$style.slider"
		data-testid="agent-budget-alert-slider"
		@update:model-value="onUpdate"
	/>
</template>

<style lang="scss" module>
/* A bar at 100% grows this flex item past the dialog and the track wraps. */
.slider {
	box-sizing: border-box;
	width: 100%;
	min-width: 0;
	max-width: 100%;
	flex-wrap: nowrap;
	/* The thumb's hit area (wrapper, not button) is centred on the value, so reserve half of it. */
	padding-inline: calc(var(--el-slider-button-wrapper-size) / 2);

	:global(.el-slider__runway) {
		flex: 1 1 0%;
		min-width: 0;
		max-width: 100%;
		margin: 0;
	}

	:global(.el-slider__bar) {
		max-width: 100%;
	}
}
</style>
