<script setup lang="ts">
import { computed, inject } from 'vue';

import { dialogCloseButtonKey } from './dialogContext';

defineOptions({ name: 'DialogHeader' });

const closeButton = inject(dialogCloseButtonKey, null);
const showCloseButton = computed(() => closeButton?.show.value ?? false);
</script>

<template>
	<header
		:class="[$style.header, showCloseButton && $style.headerWithClose]"
		data-slot="dialog-header"
	>
		<slot />
	</header>
</template>

<style module>
.header {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	gap: var(--spacing--2xs);
	padding: var(--n8n-dialog-region--padding, var(--spacing--md));
}

.headerWithClose {
	flex-direction: row;
	flex-wrap: wrap;
	align-items: flex-start;
	column-gap: var(--spacing--xs);
	row-gap: var(--spacing--2xs);
	padding-inline-end: calc(
		var(--n8n-dialog-region--padding, var(--spacing--md)) +
			var(--n8n-dialog-close--size, var(--spacing--lg)) + var(--spacing--xs)
	);
}
</style>
