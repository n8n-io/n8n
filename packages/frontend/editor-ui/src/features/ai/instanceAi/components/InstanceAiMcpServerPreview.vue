<script setup lang="ts">
import { loadMcpServerView } from '@n8n/frontend-module-mcp-servers';
import { defineAsyncComponent, useTemplateRef, watch } from 'vue';

const props = defineProps<{
	projectId: string;
	serverId: string;
	refreshKey: number;
}>();

const emit = defineEmits<{
	deleted: [serverId: string];
	renamed: [name: string];
}>();

const McpServerView = defineAsyncComponent(loadMcpServerView);
const serverView = useTemplateRef<{ refresh: () => Promise<void> }>('serverView');

watch(
	() => props.refreshKey,
	async () => await serverView.value?.refresh(),
);
</script>

<template>
	<McpServerView
		ref="serverView"
		:key="serverId"
		artifact-mode
		:artifact-project-id="projectId"
		:artifact-server-id="serverId"
		data-test-id="instance-ai-mcp-server-preview"
		@deleted="emit('deleted', $event)"
		@renamed="emit('renamed', $event)"
	/>
</template>
