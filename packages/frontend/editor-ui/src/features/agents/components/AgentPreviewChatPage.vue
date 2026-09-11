<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type {
	AgentContinueLoadedEvent,
	AgentSendToAssistantEvent,
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
	{ layout: 'dock' },
);

const emit = defineEmits<{
	'continue-loaded': [event: AgentContinueLoadedEvent];
	'open-build': [];
	'send-to-assistant': [event?: AgentSendToAssistantEvent];
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
		:is="layout === 'page' ? 'main' : 'div'"
		:class="[$style.previewPage, { [$style.pageLayout]: layout === 'page' }]"
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
	background-color: transparent;
	overflow: hidden;
}

.pageLayout {
	background-color: var(--background--surface);
}

.chatFrame {
	width: 100%;
	min-height: 0;
	display: flex;
}
</style>
