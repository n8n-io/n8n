<script setup lang="ts">
import { DialogDescription } from 'reka-ui';

export interface DialogDescriptionProps {
	/**
	 * Merge props onto child element
	 */
	asChild?: boolean;
}

defineProps<DialogDescriptionProps>();
</script>

<template>
	<DialogDescription :as-child="asChild" :class="$style.description" data-slot="dialog-description">
		<slot />
	</DialogDescription>
</template>

<style module>
.description {
	margin: 0 0 var(--spacing--sm);
	font-size: var(--font-size--md);
	line-height: var(--line-height--md);
	color: light-dark(var(--color--neutral-800), var(--color--neutral-200));
}
</style>
