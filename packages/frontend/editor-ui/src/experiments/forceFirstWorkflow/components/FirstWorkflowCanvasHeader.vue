<script lang="ts" setup>
import { computed, inject, watch } from 'vue';
import { getResourcePermissions } from '@n8n/permissions';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import WorkflowHeaderDraftPublishActions from '@/app/components/MainHeader/WorkflowHeaderDraftPublishActions.vue';
import { useFirstWorkflowTest } from '../composables/useFirstWorkflowTest';

const props = defineProps<{
	workflowId: string;
	/** Incremented by the flow to run a test. The canvas has no Run button of its own. */
	testRequest: number;
}>();

const emit = defineEmits<{
	tested: [succeeded: boolean, message?: string];
	published: [];
}>();

const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);

const isNewWorkflow = computed(() => !workflowsStore.isWorkflowSaved[props.workflowId]);
const isArchived = computed(() => workflowDocumentStore?.value?.isArchived ?? false);
const workflowPermissions = computed(
	() => getResourcePermissions(workflowDocumentStore?.value?.scopes).workflow,
);

const { test } = useFirstWorkflowTest((succeeded, message) => emit('tested', succeeded, message));

watch(
	() => props.testRequest,
	async () => await test(),
);

// Publishing has no event. The document gets an active version once it succeeds.
watch(
	() => workflowDocumentStore?.value?.activeVersionId,
	(activeVersionId) => {
		if (activeVersionId) emit('published');
	},
);
</script>

<template>
	<div :class="$style.header" data-test-id="first-workflow-canvas-header">
		<WorkflowHeaderDraftPublishActions
			:id="workflowId"
			:is-archived="isArchived"
			:is-new-workflow="isNewWorkflow"
			:workflow-permissions="workflowPermissions"
		/>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: var(--spacing--xs);
}
</style>
