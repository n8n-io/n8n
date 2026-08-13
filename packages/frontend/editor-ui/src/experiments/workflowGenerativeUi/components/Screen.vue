<script setup lang="ts">
defineProps<{ title: string | null }>();
</script>

<template>
	<section :class="$style.screen">
		<h1 v-if="title" :class="$style.title">{{ title }}</h1>
		<div :class="$style.content"><slot /></div>
	</section>
</template>

<style lang="scss" module>
.screen {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	color: var(--text-color);
}
.title {
	margin: 0;
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--xl);
	letter-spacing: var(--letter-spacing--tightest);
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
