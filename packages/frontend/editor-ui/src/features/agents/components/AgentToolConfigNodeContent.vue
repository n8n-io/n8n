<script setup lang="ts">
import { ref } from 'vue';
import type { INode } from 'n8n-workflow';

import NodeToolSettingsContent from '@/features/shared/toolConfig/NodeToolSettingsContent.vue';

const props = defineProps<{
	initialNode: INode;
	existingToolNames?: string[];
	projectId?: string;
	contentTestId?: string;
}>();

const emit = defineEmits<{
	'update:valid': [valid: boolean];
	'update:node-name': [name: string];
	'update:node': [node: INode];
}>();

const contentRef = ref<InstanceType<typeof NodeToolSettingsContent> | null>(null);

function handleChangeName(name: string) {
	contentRef.value?.handleChangeName(name);
}

function getNode() {
	return contentRef.value?.node ?? null;
}

function getNodeTypeDescription() {
	return contentRef.value?.nodeTypeDescription ?? null;
}

defineExpose({
	getNode,
	getNodeTypeDescription,
	handleChangeName,
});
</script>

<template>
	<NodeToolSettingsContent
		ref="contentRef"
		:initial-node="props.initialNode"
		:existing-tool-names="props.existingToolNames"
		:project-id="props.projectId"
		:hide-ask-assistant="true"
		:data-test-id="props.contentTestId"
		@update:valid="emit('update:valid', $event)"
		@update:node-name="emit('update:node-name', $event)"
		@update:node="emit('update:node', $event)"
	/>
</template>
