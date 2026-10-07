<script setup lang="ts">
import { computed, inject, useAttrs } from 'vue';

import { dialogCloseButtonKey } from './dialogContext';

defineOptions({ name: 'DialogHeader', inheritAttrs: false });

const attrs = useAttrs();
const closeButton = inject(dialogCloseButtonKey, null);
const showCloseButton = computed(() => closeButton?.show.value ?? false);

function forwardedAttrs() {
	const { class: _class, ...rest } = attrs;
	return rest;
}
</script>

<template>
	<header
		v-bind="forwardedAttrs()"
		:class="[$style.header, showCloseButton && $style.headerWithClose, attrs.class]"
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
</style>
