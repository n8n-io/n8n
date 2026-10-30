<script lang="ts" setup>
/**
 * The workflow setup card in a current Assistant thread. The card emits the
 * user's answer. This wrapper sends it through the thread, waits for the setup
 * tool result, and settles the card with the outcome.
 */
import { ref, toRef } from 'vue';
import type { InstanceAiCredentialFlow, InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { useThread } from '../instanceAi.store';
import InstanceAiWorkflowSetup from './InstanceAiWorkflowSetup.vue';
import { useWorkflowSetupApply } from './composables/useWorkflowSetupApply';
import type { WorkflowSetupApplyPayload, WorkflowSetupOutcome } from './workflowSetup.types';

const props = defineProps<{
	requestId: string;
	setupRequests: InstanceAiWorkflowSetupNode[];
	projectId?: string;
	workflowId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
	inputThreadId?: string;
}>();

const thread = useThread();
const applyMachine = useWorkflowSetupApply({ requestId: toRef(props, 'requestId'), thread });
const outcome = ref<WorkflowSetupOutcome>();

async function onApply(payload: WorkflowSetupApplyPayload) {
	const result = await applyMachine.apply(payload);
	outcome.value = {
		state: applyMachine.terminalState.value ?? 'failed',
		...(result ? { result } : {}),
	};
}

async function onDefer() {
	await applyMachine.defer();
	outcome.value = { state: applyMachine.terminalState.value ?? 'failed' };
}
</script>

<template>
	<InstanceAiWorkflowSetup
		:request-id="requestId"
		:setup-requests="setupRequests"
		:project-id="projectId"
		:workflow-id="workflowId"
		:credential-flow="credentialFlow"
		:thread-id="thread.id"
		:input-thread-id="inputThreadId"
		:outcome="outcome"
		@apply="onApply"
		@defer="onDefer"
	/>
</template>
