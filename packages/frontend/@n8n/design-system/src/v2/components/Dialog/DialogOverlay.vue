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
	<Transition name="n8n-dialog-backdrop-fade">
		<DialogOverlay :force-mount="forceMount" :class="$style.overlay" />
	</Transition>
</template>

<style module>
.overlay {
	position: fixed;
	inset: 0;
	background-color: light-dark(var(--color--black-alpha-300), var(--color--black-alpha-600));
	backdrop-filter: blur(8px);
	z-index: 999998;
}

/** TODO (@heymynameisrob): Move to global animations library **/
:global(.n8n-dialog-backdrop-fade-enter-active, .n8n-dialog-backdrop-fade-leave-active) {
	transition: opacity 0.2s;
}

:global(.n8n-dialog-backdrop-fade-enter-from, .n8n-dialog-backdrop-fade-leave-to) {
	opacity: 0;
}
</style>
