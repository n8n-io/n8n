<script setup lang="ts">
/**
 * @see https://github.com/bcakmakoglu/vue-flow/blob/master/packages/background/src/Background.vue
 */
import { computed } from 'vue';
const props = defineProps<{
	id: string;
	x: number;
	y: number;
	zoom: number;
}>();

const scaledGap = computed(() => 20 * props.zoom || 1);
const patternOffset = computed(() => scaledGap.value / 2);
</script>

<template>
	<pattern
		:id="id"
		patternUnits="userSpaceOnUse"
		:x="x % scaledGap"
		:y="y % scaledGap"
		:width="scaledGap"
		:height="scaledGap"
		:patternTransform="`rotate(135) translate(-${patternOffset},-${patternOffset})`"
	>
		<path :d="`M0 ${scaledGap / 2} H${scaledGap}`" :stroke-width="scaledGap / 2" />
	</pattern>
</template>

<style scoped>
path {
	stroke: var(--color-canvas-read-only-line);
}
</style>
