<script setup lang="ts">
import type { WorkflowHistory } from '@/types/workflowHistory';
import WorkflowHistoryListItem from '@/components/WorkflowHistory/WorkflowHistoryListItem.vue';

const props = withDefaults(
	defineProps<{
		items: WorkflowHistory[];
	}>(),
	{
		items: () => [],
	},
);
</script>

<template>
	<div :class="$style.list">
		<workflow-history-list-item v-for="item in props.items" :key="item.id" :item="item" />
	</div>
</template>

<style module lang="scss">
.list {
	height: 100%;
	overflow: auto;
}
</style>
