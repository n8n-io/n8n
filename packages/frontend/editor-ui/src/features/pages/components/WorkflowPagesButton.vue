<script setup lang="ts">
import { computed, watch } from 'vue';

import { useNodePagesStore } from '../nodePages.store';
import type { PagesResource } from '../resourcePages';
import DocumentWorkflowWithAiButton from './DocumentWorkflowWithAiButton.vue';
import ResourcePagesButton from './ResourcePagesButton.vue';

/**
 * Shows how many pages link to a workflow and lists them in a popover.
 * The popover also creates a page that links to the workflow, in `projectId`.
 * It also loads the pages that link to each node of the workflow, for the canvas.
 */
const props = defineProps<{
	workflowId: string;
	workflowName: string;
	/** The project that gets a new page. Without it the popover offers no creation. */
	projectId?: string;
}>();

const nodePagesStore = useNodePagesStore();

function refreshNodePages(): void {
	void nodePagesStore.refresh(props.workflowId);
}

watch(() => props.workflowId, refreshNodePages, { immediate: true });

const workflow = computed<PagesResource>(() => ({
	resourceType: 'workflow',
	resourceId: props.workflowId,
}));
</script>

<template>
	<ResourcePagesButton
		:resource="workflow"
		:resource-name="workflowName"
		:project-id="projectId"
		test-id-prefix="workflow-pages"
		@open="refreshNodePages"
	>
		<template #actions="{ close }">
			<DocumentWorkflowWithAiButton
				v-if="projectId"
				:workflow="{ id: workflowId, name: workflowName }"
				:project-id="projectId"
				@started="close"
			/>
		</template>
	</ResourcePagesButton>
</template>
