<script setup lang="ts">
// `path` and `title` belong to the router, not to the div. Inherited, `title`
// would land as an attribute and give the whole page a browser tooltip.
defineOptions({ name: 'UiPage', inheritAttrs: false });
</script>

<template>
	<div class="ui-page">
		<slot />
	</div>
</template>

<style scoped>
.ui-page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm, 16px);
	padding: var(--spacing--lg, 24px);
	font-family: var(--font-family, sans-serif);
	color: var(--color--text--shade-1, #2d2e2e);
}
</style>
