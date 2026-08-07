<script setup lang="ts">
import { ref } from 'vue';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type { AgentContinueLoadedEvent, AgentJsonConfig, AgentResource } from '../types';
import AgentChatPanel from './AgentChatPanel.vue';

withDefaults(
	defineProps<{
		initialized: boolean;
		projectId: string;
		agentId: string;
		agent: AgentResource | null;
		localConfig: AgentJsonConfig | null;
		connectedTriggers: string[];
		effectiveSessionId?: string;
		initialPrompt?: string;
		canSendToAssistant?: boolean;
		beforeSend?: () => Promise<void> | void;
		layout?: 'page' | 'dock';
	}>(),
	{ layout: 'page' },
);

const emit = defineEmits<{
	'continue-loaded': [event: AgentContinueLoadedEvent];
	'open-build': [];
	'send-to-assistant': [executionId?: string];
}>();

const inputDraft = ref('');
</script>

<template>
	<component
		:is="layout === 'dock' ? 'div' : 'main'"
		:class="[$style.previewPage, { [$style.dockLayout]: layout === 'dock' }]"
		data-testid="agent-preview-chat-page"
	>
		<div :class="[$style.chatFrame, { [$style.dockChatFrame]: layout === 'dock' }]">
			<AgentChatPanel
				v-if="initialized && effectiveSessionId"
				:key="`preview-${effectiveSessionId}`"
				v-model:input-draft="inputDraft"
				:project-id="projectId"
				:agent-id="agentId"
				mode="inline"
				:continue-session-id="effectiveSessionId"
				:agent-config="localConfig"
				:agent-status="deriveAgentStatus(agent)"
				:connected-triggers="connectedTriggers"
				:can-send-to-assistant="canSendToAssistant"
				:before-send="beforeSend"
				@continue-loaded="emit('continue-loaded', $event)"
				@open-build="emit('open-build')"
				@send-to-assistant="emit('send-to-assistant', $event)"
			/>
		</div>
	</component>
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

.dockLayout {
	background-color: transparent;
}

.dockChatFrame {
	max-width: none;
}
</style>
