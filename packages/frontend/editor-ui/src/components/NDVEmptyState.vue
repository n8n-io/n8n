<script setup lang="ts">
defineProps<{ title: string }>();

defineSlots<{
	icon(): unknown;
	description(): unknown;
}>();
</script>

<template>
	<article :class="$style.empty">
		<slot name="icon" />
		<h1 :class="$style.title">{{ title }}</h1>
		<p :class="$style.description"><slot name="description" /></p>
	</article>
</template>

<style lang="css" module>
.empty {
	display: flex;
	flex-flow: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-2xs);

	line-height: 2;
	color: var(--color-text-base);
}

.title {
	font-size: var(--font-size-m);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-base);
	margin: 0;
}

.description {
	font-size: var(--font-size-s);
	max-width: 180px;
	margin: 0;
}
</style>
