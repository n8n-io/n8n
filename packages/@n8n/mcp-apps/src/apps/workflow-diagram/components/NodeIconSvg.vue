<!-- eslint-disable vue/no-v-html -->
<script setup lang="ts">
defineProps<{
	svg: string;
	x: number;
	y: number;
	size: number;
	color?: string;
}>();
</script>

<template>
	<g
		class="node-icon-glyph node-icon-svg"
		:transform="`translate(${x}, ${y}) scale(${size / 24})`"
		:style="{ color }"
		v-html="svg"
	/>
</template>
