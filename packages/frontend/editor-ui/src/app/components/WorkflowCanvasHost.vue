<script lang="ts" setup>
import { computed, provide, shallowRef } from 'vue';
import { WorkflowDocumentStoreKey, WorkflowIdKey } from '@/app/constants/injectionKeys';
import { type WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import WorkflowCanvasHostBody from './WorkflowCanvasHostBody.vue';

const props = withDefaults(
	defineProps<{
		workflowId: string;
		/** Incremented to force re-init when the workflow id is unchanged but content has been modified. */
		refreshKey?: number;
	}>(),
	{ refreshKey: 0 },
);

const emit = defineEmits<{
	ready: [];
	'workflow-loaded': [workflowId: string];
}>();

// Provides MUST live in an outer component: Vue's inject() only walks the
// parent chain, so a composable called in the same setup as its provide
// would inject from above this component instead. The body component runs
// the composables and sees these provides via its parent (us).

// Shadows App.vue's WorkflowIdKey for everything inside the host.
// useWorkflowId prefers injection over route (useWorkflowId.ts:7-8), so the
// existing init flow uses this id without modification.
const localWorkflowId = computed(() => props.workflowId);
provide(WorkflowIdKey, localWorkflowId);

// Document store ref is populated by useWorkflowInitialization in the body.
// NodeView and its descendants read it via WorkflowDocumentStoreKey.
const currentWorkflowDocumentStore = shallowRef<WorkflowDocumentStore | null>(null);
provide(WorkflowDocumentStoreKey, currentWorkflowDocumentStore);

const bodyRef = shallowRef<InstanceType<typeof WorkflowCanvasHostBody> | null>(null);

function requestFitView() {
	bodyRef.value?.requestFitView();
}

defineExpose({ requestFitView });
</script>

<template>
	<WorkflowCanvasHostBody
		ref="bodyRef"
		:workflow-id="workflowId"
		:refresh-key="refreshKey"
		@ready="emit('ready')"
		@workflow-loaded="(id) => emit('workflow-loaded', id)"
	/>
</template>
