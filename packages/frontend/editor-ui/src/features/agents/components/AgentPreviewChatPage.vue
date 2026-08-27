<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type {
	AgentContinueLoadedEvent,
	AgentFixWithAssistantEvent,
	AgentJsonConfig,
	AgentResource,
} from '../types';
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
	'send-to-assistant': [event?: AgentFixWithAssistantEvent];
}>();

const inputDraft = ref('');
const chatPanel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('chatPanel');

function focusInput(options?: FocusOptions) {
	chatPanel.value?.focusInput(options);
}

function getConversationMarkdown(): string {
	return chatPanel.value?.getConversationMarkdown() ?? '';
}

defineExpose({ focusInput, getConversationMarkdown });
</script>

<template>
	<component
		:is="layout === 'dock' ? 'div' : 'main'"
		:class="[$style.previewPage, { [$style.dockLayout]: layout === 'dock' }]"
		data-testid="agent-preview-chat-page"
	>
		<div :class="$style.chatFrame">
			<AgentChatPanel
				v-if="initialized && effectiveSessionId"
				:key="`preview-${effectiveSessionId}`"
				ref="chatPanel"
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
	min-height: 0;
	display: flex;
}

.dockLayout {
	background-color: transparent;
}
</style>
