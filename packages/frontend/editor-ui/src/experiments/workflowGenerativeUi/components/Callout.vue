<script setup lang="ts">
defineProps<{ text: string }>();
</script>

<template>
	<aside :class="$style.callout">{{ text }}</aside>
</template>

<style lang="scss" module>
.callout {
	padding: var(--spacing--xs) var(--spacing--sm);
	color: var(--text-color--info);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	background: var(--background--info);
	border: var(--border);
	border-color: var(--border-color--info);
	border-radius: var(--radius--xs);
}
</style>
