<script setup lang="ts">
import { useAgentEvalsStore } from '../agentEvals.store';
import AgentMonitoringPanel from './AgentMonitoringPanel.vue';
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
	'view-sessions': [];
}>();
const agentEvalsStore = useAgentEvalsStore();
</script>

<template>
	<div data-testid="agent-evals-section">
		<template v-if="!agentUnsaved">
			<AgentOnlineReplayPanel
				v-if="agentEvalsStore.replaySetupAgentId === agentId"
				:project-id="projectId"
				:agent-id="agentId"
				:disabled="disabled"
				:open-data="true"
				@close="agentEvalsStore.replaySetupAgentId = null"
				@publish="emit('publish-changes')"
				@details-open="emit('details-open', $event)"
			/>
			<AgentMonitoringPanel
				v-else
				:project-id="projectId"
				:agent-id="agentId"
				:disabled="disabled"
				@view-sessions="emit('view-sessions')"
			/>
		</template>
	</div>
</template>
