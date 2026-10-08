<script setup lang="ts">
defineProps<{
	modalName: string;
	open: boolean;
}>();
</script>

<template>
	<div data-test-id="example-feature-modal">Example feature modal ({{ modalName }})</div>
</template>
