<script setup lang="ts">
import { DialogOverlay } from 'reka-ui';

export interface DialogOverlayProps {
	/**
	 * Force mount for animation control
	 */
	forceMount?: boolean;
	/**
	 * Render above another open dialog
	 */
	stacked?: boolean;
	/**
	 * Show the page behind without blur and with a very light dim
	 */
	plain?: boolean;
}

defineProps<DialogOverlayProps>();
</script>

<template>
	<DialogOverlay
		data-dialog-overlay
		:class="[$style.overlay, stacked && $style.stacked, plain && $style.plain]"
	/>
</template>

<style module lang="scss">
@use '../../css/mixins/motion';

@keyframes overlayFadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

@keyframes overlayFadeOut {
	from {
		opacity: 1;
	}
	to {
		opacity: 0;
	}
}

.overlay {
	position: fixed;
	inset: 0;
	background-color: light-dark(var(--color--black-alpha-300), var(--color--black-alpha-600));
	backdrop-filter: blur(8px);
	z-index: 1949; // See APP_Z_INDEXES in useStyles.ts
	transition:
		backdrop-filter var(--animation--duration--snappy) ease,
		background-color var(--animation--duration--snappy) ease;

	@include motion.reduced-motion;
}

.plain {
	background-color: light-dark(var(--color--black-alpha-100), var(--color--black-alpha-200));
	backdrop-filter: blur(0);
}

.stacked {
	z-index: 1951;
}

.overlay[data-state='open'] {
	animation: overlayFadeIn var(--animation--duration--snappy) ease;

	@include motion.reduced-motion;
}

.overlay[data-state='closed'] {
	animation: overlayFadeOut var(--animation--duration--snappy) ease;

	@include motion.reduced-motion;
}
</style>
