<script lang="ts" setup>
import { provide, toRef } from 'vue';
import type { InstanceAiCredentialFlow, InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import WorkflowSetupWizard from './components/WorkflowSetupWizard.vue';
import WorkflowSetupStatus from './components/WorkflowSetupStatus.vue';
import { provideWorkflowSetupContext } from './composables/useWorkflowSetupContext';
import { ResourceLocatorDropdownTeleportedKey } from '@/app/constants';
import type { ConfirmationSubmit } from '../confirmationTransport';

const props = defineProps<{
	requestId: string;
	setupRequests: InstanceAiWorkflowSetupNode[];
	projectId?: string;
	workflowId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
	/** Sends the answer through the caller (Agents chat resume) instead of the thread. */
	submit: ConfirmationSubmit;
}>();

provide(ResourceLocatorDropdownTeleportedKey, true);

const ctx = provideWorkflowSetupContext({
	requestId: toRef(props, 'requestId'),
	setupRequests: toRef(props, 'setupRequests'),
	projectId: toRef(props, 'projectId'),
	workflowId: toRef(props, 'workflowId'),
	credentialFlow: toRef(props, 'credentialFlow'),
	submit: props.submit,
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
