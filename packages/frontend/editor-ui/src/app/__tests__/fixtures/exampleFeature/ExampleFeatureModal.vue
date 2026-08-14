<script setup lang="ts">
/**
 * Stand-in for a feature's modal component. Deliberately trivial: what the
 * contract test proves is that a modal reaches the screen through the fragment
 * path, not anything about this component.
 */
defineProps<{
	modalName: string;
	open: boolean;
}>();
</script>

<template>
	<div data-test-id="example-feature-modal">Example feature modal ({{ modalName }})</div>
</template>
