<script setup lang="ts">
import { FocusScope } from 'reka-ui';

export interface FocusScopeProps {
	/**
	 * Render the child element instead of a wrapper element.
	 */
	asChild?: boolean;
	/**
	 * When true, Tab from the last focusable item moves to the first, and
	 * Shift+Tab from the first moves to the last.
	 */
	loop?: boolean;
	/**
	 * When true, focus cannot leave the scope through keyboard, pointer, or
	 * programmatic focus.
	 */
	trapped?: boolean;
}

export interface FocusScopeEmits {
	/**
	 * Fires when the scope tries to auto-focus on mount. Call preventDefault to
	 * stop that focus move.
	 */
	mountAutoFocus: [event: Event];
	/**
	 * Fires when the scope tries to restore focus on unmount. Call
	 * preventDefault to stop that focus move.
	 */
	unmountAutoFocus: [event: Event];
}

defineOptions({ name: 'N8nFocusScope' });

withDefaults(defineProps<FocusScopeProps>(), {
	asChild: false,
	loop: false,
	trapped: false,
});

const emit = defineEmits<FocusScopeEmits>();
</script>

<template>
	<FocusScope
		:as-child="asChild"
		:loop="loop"
		:trapped="trapped"
		@mount-auto-focus="emit('mountAutoFocus', $event)"
		@unmount-auto-focus="emit('unmountAutoFocus', $event)"
	>
		<slot />
	</FocusScope>
</template>
