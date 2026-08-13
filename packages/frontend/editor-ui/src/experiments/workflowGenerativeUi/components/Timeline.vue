<script setup lang="ts">
defineProps<{ title: string | null }>();
</script>

<template>
	<section :class="$style.timeline">
		<h2 v-if="title" :class="$style.title">{{ title }}</h2>
		<div :class="$style.content"><slot /></div>
	</section>
</template>

<style lang="scss" module>
.timeline {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
.title {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-left: var(--spacing--sm);
	border-left: var(--focus--border-width) solid var(--border-color--strong);
}
</style>
