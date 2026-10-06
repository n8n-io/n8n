<script setup lang="ts">
defineOptions({ name: 'DialogFooter' });
</script>

<template>
	<footer :class="$style.footer" data-slot="dialog-footer">
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
