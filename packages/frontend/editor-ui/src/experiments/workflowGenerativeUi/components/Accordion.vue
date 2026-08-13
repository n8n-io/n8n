<script setup lang="ts">
defineProps<{ title: string | null }>();
</script>

<template>
	<details :class="$style.accordion" open>
		<summary :class="$style.summary">{{ title ?? 'Details' }}</summary>
		<div :class="$style.content"><slot /></div>
	</details>
</template>

<style lang="scss" module>
.accordion {
	overflow: hidden;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
}
.summary {
	padding: var(--spacing--xs) var(--spacing--sm);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	cursor: pointer;
	background: var(--background--subtle);
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-top: var(--border);
}
</style>
