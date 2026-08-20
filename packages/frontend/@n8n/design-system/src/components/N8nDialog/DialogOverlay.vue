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
}

defineProps<DialogOverlayProps>();
</script>

<template>
	<DialogOverlay :class="[$style.overlay, stacked && $style.stacked]" />
</template>

<style module lang="scss">
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
}

.stacked {
	z-index: 1951;
}

.overlay[data-state='open'] {
	animation: overlayFadeIn var(--animation--duration--snappy) ease;
}

.overlay[data-state='closed'] {
	animation: overlayFadeOut var(--animation--duration--snappy) ease;
}
</style>
