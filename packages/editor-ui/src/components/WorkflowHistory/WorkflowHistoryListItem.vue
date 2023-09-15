<script setup lang="ts">
import type { WorkflowHistory } from '@/types/workflowHistory';

const props = defineProps<{
	item: WorkflowHistory;
}>();
</script>
<template>
	<div :class="$style.item">{{ props.item.updatedAt }}</div>
</template>
<style module lang="scss">
.item {
	display: grid;
}
</style>
