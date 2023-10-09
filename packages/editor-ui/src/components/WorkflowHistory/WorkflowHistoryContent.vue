<script setup lang="ts">
import type { IWorkflowDb } from '@/Interface';
import WorkflowPreview from '@/components/WorkflowPreview.vue';

const props = defineProps<{
	workflowVersion: IWorkflowDb | null;
}>();
</script>

<template>
	<div :class="$style.content">
		<WorkflowPreview
			v-if="props.workflowVersion"
			:workflow="props.workflowVersion"
			:loading="false"
		/>
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
