<script lang="ts" setup>
import type { InstanceAiCredentialFlow, InstanceAiWorkflowSetupNode } from '@n8n/api-types';

defineProps<{
	requestId: string;
	setupRequests: InstanceAiWorkflowSetupNode[];
	workflowId: string;
	message: string;
	projectId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
}>();
</script>

<template>
	<div data-test-id="instance-ai-workflow-setup-placeholder" :class="$style.placeholder">
		Workflow setup is being rewritten.
	</div>
</template>

<style lang="scss" module>
.placeholder {
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
}
</style>
