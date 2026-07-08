<script setup lang="ts">
import AgentBuilderView from '@/features/agents/views/AgentBuilderView.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	refreshKey: number;
}>();

const emit = defineEmits<{
	'toggle-artifacts-panel': [];
}>();
</script>

<template>
	<AgentBuilderView
		artifact-mode
		:artifact-project-id="props.projectId"
		:artifact-agent-id="props.agentId"
		:artifact-refresh-key="props.refreshKey"
		@toggle-artifacts-panel="emit('toggle-artifacts-panel')"
	/>
</template>
