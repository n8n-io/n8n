<script setup lang="ts">
defineProps<{
	fromNodeId: string;
	toNodeId: string;
	type?: string | null;
	outputIndex?: number | null;
	inputIndex?: number | null;
	label?: string | null;
}>();
</script>

<template>
	<span v-if="false" />
</template>
