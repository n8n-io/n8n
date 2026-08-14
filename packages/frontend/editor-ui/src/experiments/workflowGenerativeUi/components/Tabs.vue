<script setup lang="ts">
defineProps<{ title?: string | null }>();
</script>

<template>
	<section :class="$style.tabs">
		<div v-if="title" :class="$style.tab">{{ title }}</div>
		<div :class="$style.panel"><slot /></div>
	</section>
</template>

<style lang="scss" module>
.tabs {
	overflow: hidden;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
}
.tab {
	width: fit-content;
	padding: var(--spacing--2xs) var(--spacing--xs);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	border-bottom: var(--focus--border-width) solid var(--background--brand);
}
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-top: var(--border);
}
</style>
