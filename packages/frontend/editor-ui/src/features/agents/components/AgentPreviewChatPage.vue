<script setup lang="ts">
import { ref } from 'vue';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type { AgentJsonConfig, AgentResource } from '../types';
import AgentChatPanel from './AgentChatPanel.vue';

defineProps<{
	initialized: boolean;
	projectId: string;
	agentId: string;
	agent: AgentResource | null;
	localConfig: AgentJsonConfig | null;
	connectedTriggers: string[];
	effectiveSessionId?: string;
	initialPrompt?: string;
}>();

const emit = defineEmits<{
	'config-updated': [];
	'continue-loaded': [count: number];
	'open-build': [];
}>();

const inputDraft = ref('');
</script>

<template>
	<main :class="$style.previewPage" data-testid="agent-preview-chat-page">
		<div :class="$style.chatFrame">
			<AgentChatPanel
				v-if="initialized && effectiveSessionId"
				:key="`preview-${effectiveSessionId}`"
				v-model:input-draft="inputDraft"
				:project-id="projectId"
				:agent-id="agentId"
				mode="inline"
				endpoint="chat"
				:initial-message="initialPrompt"
				:continue-session-id="effectiveSessionId"
				:agent-config="localConfig"
				:agent-status="deriveAgentStatus(agent)"
				:connected-triggers="connectedTriggers"
				@config-updated="emit('config-updated')"
				@continue-loaded="emit('continue-loaded', $event)"
				@open-build="emit('open-build')"
			/>
		</div>
	</main>
</template>

<style lang="scss" module>
.previewPage {
	flex: 1;
	min-height: 0;
	display: flex;
	justify-content: center;
	background-color: var(--background--surface);
	overflow: hidden;
}

.chatFrame {
	width: 100%;
	max-width: 45rem;
	min-height: 0;
	display: flex;
}
</style>
