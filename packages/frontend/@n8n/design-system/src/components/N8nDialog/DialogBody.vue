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
	padding-block: 0 var(--n8n-dialog-region--padding, var(--spacing--md));
	padding-inline: var(--n8n-dialog-region--padding, var(--spacing--md));
}
</style>
