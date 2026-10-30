<script setup lang="ts">
defineOptions({ name: 'DialogBody' });
</script>

<template>
	<div :class="$style.body" data-slot="dialog-body">
		<slot />
	</div>
</template>

<style module>
.body {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-height: 0;
	overflow: auto;
	/* The header supplies the gap above the body, so this edge has no region padding.
	   Reserve the focus outline inside the scrollport, including when a field scrolls into view. */
	scroll-padding-block: var(--focus--border-width);
	padding-block-start: var(--n8n-dialog-body--padding-block-start, var(--focus--border-width));
	padding-block-end: var(
		--n8n-dialog-body--padding-block-end,
		var(--n8n-dialog-region--padding, var(--spacing--md))
	);
	margin-block-start: calc(var(--focus--border-width) * -1);
	padding-inline: var(
		--n8n-dialog-body--padding-inline,
		var(--n8n-dialog-region--padding, var(--spacing--md))
	);
}
</style>
