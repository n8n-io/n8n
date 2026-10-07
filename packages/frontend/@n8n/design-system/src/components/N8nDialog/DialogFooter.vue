<script setup lang="ts">
import { useAttrs } from 'vue';

defineOptions({ name: 'DialogFooter', inheritAttrs: false });

const attrs = useAttrs();

function forwardedAttrs() {
	const { class: _class, ...rest } = attrs;
	return rest;
}
</script>

<template>
	<footer v-bind="forwardedAttrs()" :class="[$style.footer, attrs.class]" data-slot="dialog-footer">
		<slot />
	</footer>
</template>

<style module>
.footer {
	display: flex;
	flex-shrink: 0;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: var(--n8n-dialog-region--padding, var(--spacing--md));
	border-bottom-left-radius: inherit;
	border-bottom-right-radius: inherit;
}
</style>
