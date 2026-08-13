<script setup lang="ts">
import { DialogTitle } from 'reka-ui';

export interface DialogTitleProps {
	/**
	 * Merge props onto child element
	 */
	asChild?: boolean;
}

defineProps<DialogTitleProps>();
</script>

<template>
	<DialogTitle :as-child="asChild" :class="$style.title">
		<slot />
	</DialogTitle>
</template>

<style module>
.title {
	margin: 0;
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	color: light-dark(var(--color--neutral-900), var(--color--neutral-100));
}
</style>
