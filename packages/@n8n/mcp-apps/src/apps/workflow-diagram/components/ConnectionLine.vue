<script setup lang="ts">
defineProps<{
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
}>();
</script>

<template>
	<line
		class="connection-line"
		:x1="sourceX"
		:y1="sourceY"
		:x2="targetX"
		:y2="targetY"
		marker-end="url(#arrowhead)"
	/>
</template>
