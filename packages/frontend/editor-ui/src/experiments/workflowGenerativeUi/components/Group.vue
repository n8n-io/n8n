<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
	<section :class="$style.group">
		<h2 :class="$style.title">{{ title }}</h2>
		<div :class="$style.content"><slot /></div>
	</section>
</template>

<style lang="scss" module>
.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	background: var(--background--subtle);
	border: var(--border);
	border-radius: var(--radius--md);
}
.title {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
