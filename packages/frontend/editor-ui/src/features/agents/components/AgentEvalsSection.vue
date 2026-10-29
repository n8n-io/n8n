<script setup lang="ts">
import { useAgentEvalsStore } from '../agentEvals.store';
import AgentOnlineReplayPanel from './AgentOnlineReplayPanel.vue';

defineProps<{
	projectId: string;
	agentId: string;
	disabled?: boolean;
	canRun?: boolean;
	generating?: boolean;
	agentUnsaved?: boolean;
}>();

const emit = defineEmits<{
	generate: [];
	'details-open': [open: boolean];
	'publish-changes': [];
}>();
const agentEvalsStore = useAgentEvalsStore();
</script>

<template>
	<div data-testid="agent-evals-section">
		<AgentOnlineReplayPanel
			v-if="!agentUnsaved"
			:project-id="projectId"
			:agent-id="agentId"
			:disabled="disabled"
			:open-data="agentEvalsStore.replaySetupAgentId === agentId"
			@data-opened="agentEvalsStore.replaySetupAgentId = null"
			@publish="emit('publish-changes')"
			@details-open="emit('details-open', $event)"
		/>
	</div>
</template>
