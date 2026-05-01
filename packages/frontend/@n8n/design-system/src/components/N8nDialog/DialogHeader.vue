<script setup lang="ts">
// N8nDialogHeader - Styled container for title and description
</script>

<template>
	<header :class="$style.header">
		<slot />
	</header>
</template>

<style module>
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
