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
	position: absolute;
	display: block;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
}
</style>
