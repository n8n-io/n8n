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
	flex: 1;
	flex-direction: column;
	/* The header's bottom padding is the space above the body. */
	padding: 0 var(--n8n-dialog-region--padding, var(--spacing--md))
		var(--n8n-dialog-region--padding, var(--spacing--md));
}
</style>
