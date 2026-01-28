<script setup lang="ts">
import { DialogOverlay } from 'reka-ui';

export interface DialogOverlayProps {
	/**
	 * Force mount for animation control
	 */
	forceMount?: boolean;
}

defineProps<DialogOverlayProps>();
</script>

<template>
	<DialogOverlay :class="$style.overlay" />
</template>

<style module lang="scss">
.overlay {
	position: fixed;
	inset: 0;
	background-color: light-dark(var(--color--black-alpha-300), var(--color--black-alpha-600));
	backdrop-filter: blur(8px);
	z-index: 999998;

	& [data-state='open'] {
		animation: fadeIn 0.2s ease;
	}

	& [data-state='closed'] {
		animation: fadeOut 0.2s ease;
	}
}
@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

@keyframes fadeOut {
	from {
		opacity: 1;
	}
	to {
		opacity: 0;
	}
}
</style>
