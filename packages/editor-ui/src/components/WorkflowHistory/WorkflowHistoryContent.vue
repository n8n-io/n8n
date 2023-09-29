<script setup lang="ts">
import type { WorkflowVersion } from '@/types/workflowHistory';

const props = defineProps<{
	workflowVersion: WorkflowVersion | null;
}>();
</script>

<template>
	<div :class="$style.content">
		{{ props.workflowVersion }}
	</div>
</template>

<style module lang="scss">
.content {
	display: block;
}
</style>
