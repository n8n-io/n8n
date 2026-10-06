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
	align-items: center;
	column-gap: var(--spacing--xs);
	row-gap: var(--spacing--2xs);
}

.header.headerWithClose {
	/* Keep the title clear of the close button. The button is a later sibling. */
	padding-inline-end: var(
		--n8n-dialog-header--padding-inline-end,
		calc(
			var(
					--n8n-dialog-close--inset-inline-end,
					var(--n8n-dialog-region--padding, var(--spacing--md))
				) +
				var(--spacing--lg) + var(--spacing--xs)
		)
	);
}

.headerWithClose > :not(:global([data-slot='dialog-description'])) {
	min-width: 0;
}

.headerWithClose > :global([data-slot='dialog-description']) {
	flex: 1 0 100%;
	order: 1;
	min-width: 0;
	/* The button covers the title row only. Let the description use the full width. */
	margin-inline-end: calc(
		-1 *
			(
				var(
						--n8n-dialog-close--inset-inline-end,
						var(--n8n-dialog-region--padding, var(--spacing--md))
					) +
					var(--spacing--lg) + var(--spacing--xs) -
					var(--n8n-dialog-region--padding, var(--spacing--md))
			)
	);
}
</style>
