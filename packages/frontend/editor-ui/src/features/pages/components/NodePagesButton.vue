<script setup lang="ts">
import { computed } from 'vue';

import { usePagesWorkflowId } from '../composables/usePagesWorkflowId';
import { useWorkflowPagesProjectId } from '../composables/useWorkflowPagesProjectId';
import { useNodePagesStore } from '../nodePages.store';
import type { PagesResource } from '../resourcePages';
import ResourcePagesButton from './ResourcePagesButton.vue';

/**
 * Shows how many pages link to a node of the open workflow and lists them in a popover.
 * The popover also creates a page that links to the node, in the project of the workflow.
 * Renders nothing until the workflow is saved, and when the page module is off.
 */
const props = defineProps<{
	nodeId: string;
	nodeName: string;
}>();

const nodePagesStore = useNodePagesStore();
const workflowId = usePagesWorkflowId();
const projectId = useWorkflowPagesProjectId();

const node = computed<PagesResource | undefined>(() =>
	workflowId.value === undefined
		? undefined
		: { resourceType: 'node', resourceId: props.nodeId, workflowId: workflowId.value },
);

function refreshCanvasBadges(): void {
	if (workflowId.value !== undefined) {
		void nodePagesStore.refresh(workflowId.value);
	}
}
</script>

<template>
	<ResourcePagesButton
		v-if="node"
		:resource="node"
		:resource-name="nodeName"
		:project-id="projectId"
		test-id-prefix="node-pages"
		align="end"
		@open="refreshCanvasBadges"
	/>
</template>
