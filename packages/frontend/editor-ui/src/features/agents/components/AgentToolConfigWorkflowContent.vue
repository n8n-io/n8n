<script setup lang="ts">
import { ref } from 'vue';

import AgentToolConfigApprovalSetting from './AgentToolConfigApprovalSetting.vue';
import WorkflowToolConfigContent from './WorkflowToolConfigContent.vue';
import type { WorkflowToolRef } from '../types';

const props = defineProps<{
	initialRef: WorkflowToolRef;
	showApprovalSetting?: boolean;
	approvalRequired?: boolean;
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

defineExpose({
	getName,
	getDescription,
	getAllOutputs,
	handleChangeName,
});
</script>

<template>
	<WorkflowToolConfigContent
		ref="contentRef"
		:initial-ref="props.initialRef"
		@update:valid="emit('update:valid', $event)"
		@update:node-name="emit('update:node-name', $event)"
	>
		<template #commonSettings>
			<AgentToolConfigApprovalSetting
				v-if="props.showApprovalSetting"
				:model-value="props.approvalRequired ?? false"
				@update:model-value="emit('update:approvalRequired', $event)"
			/>
		</template>
	</WorkflowToolConfigContent>
</template>
