<script lang="ts" setup>
import { provide, toRef } from 'vue';
import type { InstanceAiCredentialFlow, InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import WorkflowSetupWizard from './components/WorkflowSetupWizard.vue';
import WorkflowSetupStatus from './components/WorkflowSetupStatus.vue';
import { provideWorkflowSetupContext } from './composables/useWorkflowSetupContext';
import type { WorkflowSetupApplyPayload, WorkflowSetupOutcome } from './workflowSetup.types';
import { ResourceLocatorDropdownTeleportedKey } from '@/app/constants';

const props = defineProps<{
	requestId: string;
	setupRequests: InstanceAiWorkflowSetupNode[];
	projectId?: string;
	workflowId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
	/** The thread that the telemetry reports. */
	threadId: string;
	/** Joins the telemetry with the "Builder asked for input" event of this card. */
	inputThreadId?: string;
	/** How the parent settled the last answer. A new object for each answer. */
	outcome?: WorkflowSetupOutcome;
}>();

// The parent sends the answer, and settles the card through `outcome`.
const emit = defineEmits<{
	apply: [payload: WorkflowSetupApplyPayload];
	defer: [];
}>();

provide(ResourceLocatorDropdownTeleportedKey, true);

const ctx = provideWorkflowSetupContext({
	requestId: toRef(props, 'requestId'),
	setupRequests: toRef(props, 'setupRequests'),
	projectId: toRef(props, 'projectId'),
	workflowId: toRef(props, 'workflowId'),
	credentialFlow: toRef(props, 'credentialFlow'),
	threadId: toRef(props, 'threadId'),
	inputThreadId: toRef(props, 'inputThreadId'),
	outcome: toRef(props, 'outcome'),
	emitApply: (payload) => emit('apply', payload),
	emitDefer: () => emit('defer'),
});
</script>

<template>
	<div data-test-id="instance-ai-workflow-setup">
		<WorkflowSetupStatus
			v-if="ctx.isReady.value && ctx.terminalState.value"
			:state="ctx.terminalState.value"
		/>
		<WorkflowSetupWizard v-else-if="ctx.isReady.value && ctx.activeSection.value" />
	</div>
</template>
