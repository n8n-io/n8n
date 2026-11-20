<script lang="ts" setup>
import { computed, provide } from 'vue';
import {
	EditorEnabledFeaturesKey,
	type EditorEnabledFeatures,
} from '@/app/constants/injectionKeys';
import WorkflowCanvasHost from '@/app/components/WorkflowCanvasHost.vue';
import FirstWorkflowCanvasHeader from './FirstWorkflowCanvasHeader.vue';

withDefaults(
	defineProps<{
		workflowId: string;
		/** Incremented to run a test of the workflow. */
		testRequest?: number;
	}>(),
	{ testRequest: 0 },
);

const emit = defineEmits<{
	/** The workflow is open on the canvas. */
	loaded: [];
	tested: [succeeded: boolean, message?: string];
	published: [];
}>();

// Read-only canvas. The flow shows its own results, so the execution toasts stay off, and a
// read-only canvas has no Run button. The route query hides the controls and keeps the dotted
// background. See `FORCE_FIRST_WORKFLOW_QUERY`.
const enabledFeatures = computed<EditorEnabledFeatures>(() => ({
	aiAssistant: false,
	aiBuilder: false,
	askAi: false,
	readOnly: true,
	executionSuccessToasts: false,
	executionErrorToasts: false,
}));
provide(EditorEnabledFeaturesKey, enabledFeatures);
</script>

<template>
	<WorkflowCanvasHost minimal-chrome :workflow-id="workflowId" @workflow-loaded="emit('loaded')">
		<template #header>
			<FirstWorkflowCanvasHeader
				:workflow-id="workflowId"
				:test-request="testRequest"
				@tested="(succeeded, message) => emit('tested', succeeded, message)"
				@published="emit('published')"
			/>
		</template>
	</WorkflowCanvasHost>
</template>
