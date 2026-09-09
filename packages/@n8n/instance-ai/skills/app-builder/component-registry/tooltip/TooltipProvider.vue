<script setup lang="ts">
// Ark UI's Tooltip needs no shared provider or context. This is a plain
// passthrough so code that wraps a tree in one TooltipProvider (a convention
// from other component libraries) doesn't need to change.
</script>

<template>
	<slot />
</template>
