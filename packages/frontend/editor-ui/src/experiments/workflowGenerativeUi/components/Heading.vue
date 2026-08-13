<script setup lang="ts">
defineProps<{ text: string }>();
</script>

<template>
	<h2 :class="$style.heading">{{ text }}</h2>
</template>

<style lang="scss" module>
.heading {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--xl);
	letter-spacing: var(--letter-spacing--tighter);
}
</style>
