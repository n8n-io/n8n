<script setup lang="ts">
import { DialogClose } from 'reka-ui';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

export interface DialogCloseProps {
	/**
	 * Merge props onto child element instead of rendering a button
	 */
	asChild?: boolean;
}

defineProps<DialogCloseProps>();
</script>

<template>
	<DialogClose v-if="asChild" as-child>
		<slot />
	</DialogClose>
	<DialogClose
		v-else
		:class="$style['close-button']"
		aria-label="Close dialog"
		data-test-id="dialog-close-button"
	>
		<slot>
			<Icon icon="x" />
		</slot>
	</DialogClose>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';

.close-button {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	padding: 0;
	border: none;
	border-radius: var(--radius);
	background-color: transparent;
	color: var(--color--text);
	cursor: pointer;

	&:hover {
		background-color: var(--color--background);
	}

	@include focus.focus-visible-ring;
}
</style>
