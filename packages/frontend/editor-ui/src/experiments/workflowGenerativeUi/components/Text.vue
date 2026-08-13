<script setup lang="ts">
defineProps<{ text: string }>();
</script>

<template>
	<p :class="$style.text">{{ text }}</p>
</template>

<style lang="scss" module>
.text {
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}
</style>
