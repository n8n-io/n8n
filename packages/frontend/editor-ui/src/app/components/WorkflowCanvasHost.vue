<script lang="ts" setup>
import { computed, provide, shallowRef } from 'vue';
import type { IWorkflowDb } from '@/Interface';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { WorkflowDocumentStoreKey, WorkflowIdKey } from '@/app/constants/injectionKeys';
import { type WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import WorkflowCanvasHostBody from './WorkflowCanvasHostBody.vue';

const props = withDefaults(
	defineProps<{
		workflowId: string;
		/** Incremented to force re-init when the workflow id is unchanged but content has been modified. */
		refreshKey?: number;
		/** Workflow data to open without a fetch (e.g. an editor hand-off snapshot). Falls back to fetching by id. */
		initialWorkflow?: IWorkflowDb;
		/** Execution to display once on open, seeded directly (e.g. an editor hand-off snapshot). */
		initialExecution?: IExecutionResponse;
		/**
		 * Strip the editor chrome down to a `header` slot. It replaces the editor header, drops the
		 * logs panel, and the host then starts the push connection that the header normally starts.
		 * Experiment cleanup (151_force_first_workflow): remove with it, unless another host needs it.
		 */
		minimalChrome?: boolean;
	}>(),
	{ refreshKey: 0, initialWorkflow: undefined, initialExecution: undefined, minimalChrome: false },
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
		:initial-workflow="initialWorkflow"
		:initial-execution="initialExecution"
		:minimal-chrome="minimalChrome"
		@ready="emit('ready')"
		@workflow-loaded="(id) => emit('workflow-loaded', id)"
	>
		<template v-if="minimalChrome" #header><slot name="header" /></template>
	</WorkflowCanvasHostBody>
</template>
