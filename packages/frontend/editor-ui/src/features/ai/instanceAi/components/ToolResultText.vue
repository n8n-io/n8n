<script lang="ts" setup>
defineProps<{
	text: string;
}>();
</script>

<template>
	<pre :class="$style.text" v-text="text" />
</template>

<style module>
.text {
	white-space: pre-wrap;
	margin: 0;
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
}
</style>
