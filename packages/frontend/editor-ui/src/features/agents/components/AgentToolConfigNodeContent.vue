<script setup lang="ts">
import { provide, ref } from 'vue';
import type { INode } from 'n8n-workflow';
import { UNSUPPORTED_AGENT_NODE_TOOL_OPERATIONS } from '@n8n/api-types';

import {
	ResourceMapperRefreshEmptySchemaKey,
	ResourceMapperSchemaAutoRefreshKey,
} from '@/app/constants';
import NodeToolSettingsContent from '@/features/shared/toolConfig/NodeToolSettingsContent.vue';

const props = defineProps<{
	initialNode: INode;
	existingToolNames?: string[];
	projectId?: string;
	contentTestId?: string;
	parameterIssues?: Record<string, string[]>;
	fromAiDisabledParameters?: string[];
}>();

const emit = defineEmits<{
	'update:valid': [valid: boolean];
	'update:node-name': [name: string];
	'update:node': [node: INode];
}>();

const contentRef = ref<InstanceType<typeof NodeToolSettingsContent> | null>(null);

provide(ResourceMapperSchemaAutoRefreshKey, false);
provide(ResourceMapperRefreshEmptySchemaKey, true);

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
		:hidden-operations="UNSUPPORTED_AGENT_NODE_TOOL_OPERATIONS"
		:parameter-issues="props.parameterIssues"
		:from-ai-disabled-parameters="props.fromAiDisabledParameters"
		:sync-node-to-ndv="true"
		:data-test-id="props.contentTestId"
		@update:valid="emit('update:valid', $event)"
		@update:node-name="emit('update:node-name', $event)"
		@update:node="emit('update:node', $event)"
	/>
</template>
