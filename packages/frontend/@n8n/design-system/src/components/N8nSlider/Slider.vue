<script setup lang="ts">
import { ElSlider } from 'element-plus';

interface SliderProps {
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	showStops?: boolean;
	showTooltip?: boolean;
}

withDefaults(defineProps<SliderProps>(), {
	min: 0,
	max: 100,
	step: 1,
	disabled: false,
	showStops: false,
	showTooltip: true,
});
</script>

<template>
	<ElSlider
		:min="min"
		:max="max"
		:step="step"
		:disabled="disabled"
		:show-stops="showStops"
		:show-tooltip="showTooltip"
		:class="$style.slider"
		v-bind="$attrs"
	/>
</template>

<style lang="scss" module>
.slider {
	// Map n8n design tokens onto element-plus's slider variables so the
	// component picks up the brand colour for the track + thumb instead of
	// the default element-plus blue. Tokens come from
	// `@n8n/design-system/src/css/_tokens.legacy.scss` (the `--color--*`
	// variables are the canonical brand tokens).
	--el-slider-main-bg-color: var(--color--primary);
	--el-slider-runway-bg-color: var(--color--foreground);
	--el-slider-stop-bg-color: var(--color--foreground--shade-1);
	--el-slider-disabled-color: var(--color--foreground--shade-1);
	--el-slider-button-size: 14px;
	--el-slider-button-wrapper-size: 28px;
	--el-slider-height: 4px;
}
</style>
