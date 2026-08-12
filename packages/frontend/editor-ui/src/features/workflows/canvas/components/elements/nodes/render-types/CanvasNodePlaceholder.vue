<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { useCanvasNode } from '../../../../composables/useCanvasNode';

defineProps<{
	width: number;
	height: number;
}>();

const $style = useCssModule();

const { label, executionStatus, executionRunning, executionWaiting, hasRunData } = useCanvasNode();

const classes = computed(() => ({
	[$style.placeholder]: true,
	// success gated on run data to match CanvasNodeDefault; error approximated
	// from execution status alone (the full render checks execution issues).
	[$style.success]: Boolean(hasRunData.value && executionStatus.value === 'success'),
	[$style.error]: executionStatus.value === 'error',
	[$style.running]: executionRunning.value,
	[$style.waiting]: Boolean(executionWaiting.value || executionStatus.value === 'waiting'),
}));
</script>

<template>
	<div
		:class="classes"
		:style="{ width: `${width}px`, height: `${height}px` }"
		data-test-id="canvas-node-placeholder"
	>
		<div :class="$style.label">{{ label }}</div>
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
}
</style>
