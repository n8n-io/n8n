<script lang="ts" setup>
import { toRef } from 'vue';
import type { InstanceAiCredentialFlow, InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { useInstanceAiSetupListExperiment } from '@/experiments/instanceAiSetupList';
import WorkflowSetupWizard from './components/WorkflowSetupWizard.vue';
import WorkflowSetupAccordion from './components/WorkflowSetupAccordion.vue';
import WorkflowSetupStatus from './components/WorkflowSetupStatus.vue';
import { provideWorkflowSetupContext } from './composables/useWorkflowSetupContext';

const props = defineProps<{
	requestId: string;
	setupRequests: InstanceAiWorkflowSetupNode[];
	projectId?: string;
	workflowId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
}>();

const ctx = provideWorkflowSetupContext({
	requestId: toRef(props, 'requestId'),
	setupRequests: toRef(props, 'setupRequests'),
	projectId: toRef(props, 'projectId'),
	workflowId: toRef(props, 'workflowId'),
	credentialFlow: toRef(props, 'credentialFlow'),
});

const { isFeatureEnabled: isSetupListEnabled } = useInstanceAiSetupListExperiment();
</script>

<template>
	<div data-test-id="instance-ai-workflow-setup">
		<WorkflowSetupStatus
			v-if="ctx.isReady.value && ctx.terminalState.value"
			:state="ctx.terminalState.value"
		/>
		<WorkflowSetupAccordion
			v-else-if="ctx.isReady.value && ctx.steps.value.length && isSetupListEnabled"
		/>
		<WorkflowSetupWizard v-else-if="ctx.isReady.value && ctx.steps.value.length" />
	</div>
</template>
