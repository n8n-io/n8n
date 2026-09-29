<script setup lang="ts">
import { ElSlider } from 'element-plus';

/**
 * Local slider for the monthly budget alert. The design system has no slider.
 * Keep this next to the budget modal. Do not promote it.
 */

defineProps<{
	modelValue: number;
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
		:max="100"
		:step="10"
		:show-stops="false"
		:show-tooltip="false"
		:disabled="disabled"
		:style="brandColor"
		data-testid="agent-budget-alert-slider"
		@update:model-value="onUpdate"
	/>
</template>
