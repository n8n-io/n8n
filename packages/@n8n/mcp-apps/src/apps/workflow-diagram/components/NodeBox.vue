<script setup lang="ts">
defineProps<{
	x: number;
	y: number;
	width: number;
	height: number;
	name: string;
	type: string;
}>();
</script>

<template>
	<g :transform="`translate(${x}, ${y})`" class="node-box">
		<rect class="node-card" :width="width" :height="height" rx="14" />
		<text class="node-name" x="18" y="30">{{ name }}</text>
		<text class="node-type" x="18" y="54">{{ type }}</text>
	</g>
</template>
