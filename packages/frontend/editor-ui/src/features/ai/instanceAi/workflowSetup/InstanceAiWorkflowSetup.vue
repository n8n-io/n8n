<script lang="ts" setup>
import { toRef } from 'vue';
import type { InstanceAiCredentialFlow, InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import WorkflowSetupWizard from './components/WorkflowSetupWizard.vue';
import WorkflowSetupStatus from './components/WorkflowSetupStatus.vue';
import { provideWorkflowSetupContext } from './composables/useWorkflowSetupContext';

const props = defineProps<{
	requestId: string;
	setupRequests: InstanceAiWorkflowSetupNode[];
	workflowId: string;
	message: string;
	projectId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
}>();

const ctx = provideWorkflowSetupContext({
	requestId: toRef(props, 'requestId'),
	setupRequests: toRef(props, 'setupRequests'),
	workflowId: toRef(props, 'workflowId'),
	projectId: toRef(props, 'projectId'),
	credentialFlow: toRef(props, 'credentialFlow'),
});
</script>

<template>
	<div data-test-id="instance-ai-workflow-setup">
		<div v-if="!ctx.isReady.value && !ctx.terminalState.value" />

		<WorkflowSetupStatus
			v-else-if="ctx.terminalState.value"
			:state="ctx.terminalState.value"
			:credential-flow="credentialFlow"
		/>

		<WorkflowSetupWizard v-else-if="ctx.cards.value.length" />
	</div>
</template>
