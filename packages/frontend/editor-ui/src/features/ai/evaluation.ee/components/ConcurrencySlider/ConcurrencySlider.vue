<script setup lang="ts">
import { ElSlider } from 'element-plus';

// Feature-local slider for the parallel-evaluation concurrency control.
// Lives here (not in `@n8n/design-system`) because it bakes in a single
// hard-coded brand-token theme — that bypasses the variant story DS
// components are expected to support and would need design sign-off
// before being promoted. Promote when both conditions hold.

interface ConcurrencySliderProps {
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	showStops?: boolean;
	showTooltip?: boolean;
}

withDefaults(defineProps<ConcurrencySliderProps>(), {
	min: 0,
	max: 100,
	step: 1,
	disabled: false,
	showStops: false,
	showTooltip: true,
});

// Element-plus's `.el-slider` rule sets these CSS vars at class-level
// specificity. Inline `:style` wins by specificity, guaranteeing the
// override regardless of stylesheet load order.
//
// Discord-like pill aesthetic: tall rounded runway, white thumb sitting
// inside the track without a visible coloured border ring, and subtle
// stops as dots rather than dividers.
//
// `--background--brand` is the semantic alias for the n8n orange. The
// runway/disabled tokens fall back to legacy `--color--foreground*`
// because the design system has no semantic alias for the
// "neutral surface behind an interactive control" role yet.
const brandTokens = {
	'--el-slider-main-bg-color': 'var(--background--brand)',
	'--el-slider-runway-bg-color': 'var(--color--foreground)',
	'--el-slider-stop-bg-color': 'rgba(0, 0, 0, 0.28)',
	'--el-slider-disabled-color': 'var(--color--foreground--shade-1)',
	'--el-color-white': '#fff',
	'--el-slider-button-size': '16px',
	'--el-slider-button-wrapper-size': '28px',
	'--el-slider-height': '20px',
	'--el-slider-border-radius': '20px',
	// Vertically centre the thumb wrapper inside the runway. Element-plus's
	// default `-15px` was tuned for a 6px runway and 36px wrapper. With our
	// 20px runway and 28px wrapper, the offset is `(runway - wrapper) / 2`
	// = `(20 - 28) / 2` = -4px.
	'--el-slider-button-wrapper-offset': '-4px',
} as const;
</script>

<template>
	<ElSlider
		:min="min"
		:max="max"
		:step="step"
		:disabled="disabled"
		:show-stops="showStops"
		:show-tooltip="showTooltip"
		:style="brandTokens"
		:class="$style.slider"
		v-bind="$attrs"
	/>
</template>

<style lang="scss" module>
// Element-plus's slider thumb has `border: 2px solid var(--el-slider-main-bg-color)`,
// which puts a primary-coloured ring around the thumb. The Discord-like look
// the design wants is a borderless white thumb sitting inside the track. Force
// the border to match the thumb fill (effectively removing the ring) and add
// a subtle shadow for depth. `:global` is needed because the .el-slider__button
// class is rendered by ElSlider (outside this component's scoped CSS).
.slider {
	:global(.el-slider__button) {
		border-color: var(--el-color-white);
		box-shadow:
			0 2px 4px rgba(0, 0, 0, 0.12),
			0 0 0 1px rgba(0, 0, 0, 0.04);
	}

	// Element-plus's default stops are 4px-wide vertical rectangles spanning
	// the full runway height, which look like dividers on a tall pill track.
	// Rounded dots match the Discord-style visual.
	:global(.el-slider__stop) {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
	}
}
</style>
