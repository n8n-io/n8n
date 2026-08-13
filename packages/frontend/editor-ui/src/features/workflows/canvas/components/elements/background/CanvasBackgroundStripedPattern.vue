<script setup lang="ts">
/**
 * @see https://github.com/bcakmakoglu/vue-flow/blob/master/packages/background/src/Background.vue
 */
defineProps<{
	id: string;
	x: number;
	y: number;
	zoom: number;
}>();
</script>

<template>
	<pattern
		:id="id"
		patternUnits="userSpaceOnUse"
		width="20"
		height="20"
		:patternTransform="`translate(${x},${y}) scale(${zoom}) rotate(135) translate(-10,-10)`"
	>
		<path d="M0 10 H20" stroke-width="10" />
	</pattern>
</template>

<style scoped>
path {
	stroke: var(--canvas--read-only-line--color);
	opacity: 0.5;
}
</style>
