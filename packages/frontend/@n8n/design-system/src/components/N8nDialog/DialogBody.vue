<script setup lang="ts">
import { useAttrs } from 'vue';

defineOptions({ name: 'DialogBody', inheritAttrs: false });

const attrs = useAttrs();

function forwardedAttrs() {
	const { class: _class, ...rest } = attrs;
	return rest;
}
</script>

<template>
	<div v-bind="forwardedAttrs()" :class="[$style.body, attrs.class]" data-slot="dialog-body">
		<slot />
	</div>
</template>

<style module>
.body {
	display: flex;
	flex: 1;
	flex-direction: column;
	/* The header's bottom padding is the space above the body. */
	padding: 0 var(--n8n-dialog-region--padding, var(--spacing--md))
		var(--n8n-dialog-region--padding, var(--spacing--md));
}
</style>
