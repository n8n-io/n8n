<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { useCanvasNode } from '../../../../composables/useCanvasNode';

defineProps<{
	width: number;
	height: number;
	configurable?: boolean;
}>();

const $style = useCssModule();

const {
	label,
	executionStatus,
	executionRunning,
	executionWaiting,
	executionWaitingForNext,
	hasRunData,
} = useCanvasNode();

const classes = computed(() => ({
	[$style.placeholder]: true,
	// success gated on run data to match CanvasNodeDefault; error approximated
	// from execution status alone (the full render checks execution issues),
	// and pinned-data nodes tint success instead of the pinned color.
	[$style.success]: Boolean(hasRunData.value && executionStatus.value === 'success'),
	[$style.error]: executionStatus.value === 'error',
	[$style.running]: Boolean(executionRunning.value || executionWaitingForNext.value),
	[$style.waiting]: Boolean(executionWaiting.value || executionStatus.value === 'waiting'),
}));
</script>

<template>
	<div
		:class="classes"
		:style="{ width: `${width}px`, height: `${height}px` }"
		data-test-id="canvas-node-placeholder"
	>
		<div :class="[$style.label, configurable ? $style.labelInside : '']">{{ label }}</div>
	</div>
</template>

<style lang="scss" module>
@use './_canvasNodeStyles.scss' as styles;

.placeholder {
	@include styles.canvas-node-border-defaults;
	position: relative;
	background: var(--canvas-node--color--background, var(--node--color--background));
	@include styles.canvas-node-border;
	border-radius: var(--radius--lg);

	&.success {
		@include styles.status-success;
	}

	&.error {
		@include styles.status-error;
	}

	// Not status-running-border: it makes the border transparent and relies on
	// the animated ::after indicator, which the placeholder skips.
	&.running {
		--canvas-node--border-width: var(--spacing--5xs);
		--canvas-node--border-color: var(
			--color-canvas-node-running-border-color,
			var(--node--border-color--running)
		);
	}

	// The real waiting look is animation-only (transparent border), invisible
	// without the animated ::after; use the warning tint instead.
	&.waiting {
		@include styles.status-warning;
	}
}

// Mirrors CanvasNodeDefault .description/.label so the name sits in the same
// place across the swap; absolute so it never affects the measured box.
.label {
	position: absolute;
	top: 100%;
	left: 50%;
	transform: translateX(-50%);
	margin-top: var(--spacing--2xs);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	text-align: center;
	pointer-events: none;
	// Same 2-line clamp as CanvasNodeDefault .description so long names don't
	// grow arbitrarily wide at overview zoom.
	max-width: 200%;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	overflow-wrap: anywhere;
}

// Configurable nodes show the name inside the card (CanvasNodeDefault
// &.configurable .description), not below it.
.labelInside {
	top: 50%;
	left: 0;
	right: 0;
	transform: translateY(-50%);
	margin-top: 0;
	padding: 0 var(--spacing--sm);
	text-align: left;
	max-width: 100%;
}
</style>
