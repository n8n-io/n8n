<script setup lang="ts">
// N8nDialogFooter - Styled container for action buttons
</script>

<template>
	<footer :class="$style.footer">
		<slot />
	</footer>
</template>

<style module>
.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
* + .footer {
	margin-top: var(--spacing--md);
}
</style>
