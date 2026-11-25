<script setup lang="ts">
import { ref } from 'vue';
import { N8nSettingsRowGroup } from '@n8n/design-system';

import AgentToolConfigApprovalSetting from './AgentToolConfigApprovalSetting.vue';
import WorkflowToolConfigContent from './WorkflowToolConfigContent.vue';
import type { WorkflowToolRef } from '../types';

const props = defineProps<{
	initialRef: WorkflowToolRef;
	projectId?: string;
	showApprovalSetting?: boolean;
	approvalRequired?: boolean;
	submitCount?: number;
}>();

const emit = defineEmits<{
	'update:valid': [valid: boolean];
	'update:node-name': [name: string];
	'update:approvalRequired': [required: boolean];
}>();

const contentRef = ref<InstanceType<typeof WorkflowToolConfigContent> | null>(null);

function handleChangeName(value: string) {
	contentRef.value?.handleChangeName(value);
}

function getName() {
	return contentRef.value?.name ?? '';
}

function getDescription() {
	return contentRef.value?.description ?? '';
}

function getAllOutputs() {
	return contentRef.value?.allOutputs ?? false;
}

function getWorkflow() {
	return contentRef.value?.getWorkflow() ?? '';
}

function getWorkflowId() {
	return contentRef.value?.getWorkflowId();
}

function getInputs() {
	return contentRef.value?.getInputs();
}

defineExpose({
	getName,
	getDescription,
	getAllOutputs,
	getWorkflow,
	getWorkflowId,
	getInputs,
	handleChangeName,
});
</script>

<template>
	<WorkflowToolConfigContent
		ref="contentRef"
		:initial-ref="props.initialRef"
		:project-id="props.projectId"
		:submit-count="props.submitCount"
		@update:valid="emit('update:valid', $event)"
		@update:node-name="emit('update:node-name', $event)"
	>
		<template v-if="props.showApprovalSetting" #commonSettings>
			<div data-test-id="agent-workflow-tool-approval">
				<slot name="approvalSettings">
					<N8nSettingsRowGroup :class="$style.approvalFallback">
						<AgentToolConfigApprovalSetting
							:model-value="props.approvalRequired ?? false"
							@update:model-value="emit('update:approvalRequired', $event)"
						/>
					</N8nSettingsRowGroup>
				</slot>
			</div>
		</template>
		<template #beforeAdvanced>
			<slot name="beforeAdvanced" />
		</template>
	</WorkflowToolConfigContent>
</template>

<style module lang="scss">
.approvalFallback {
	padding: var(--spacing--sm) var(--spacing--md);
	background: transparent;
}
</style>
