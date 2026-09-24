<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type {
	AgentContinueLoadedEvent,
	AgentSendToAssistantEvent,
	AgentJsonConfig,
	AgentResource,
} from '../types';
import AgentChatPanel from './AgentChatPanel.vue';

const props = withDefaults(
	defineProps<{
		visible?: boolean;
		initialized: boolean;
		projectId: string;
		agentId: string;
		agent: AgentResource | null;
		localConfig: AgentJsonConfig | null;
		connectedTriggers: string[];
		effectiveSessionId?: string;
		newSession?: boolean;
		initialPrompt?: string;
		canSendToAssistant?: boolean;
		beforeSend?: () => Promise<void> | void;
		layout?: 'page' | 'dock';
	}>(),
	{ visible: true, newSession: false, layout: 'dock' },
);

const emit = defineEmits<{
	'continue-loaded': [event: AgentContinueLoadedEvent];
	'session-created': [sessionId: string];
	'open-build': [];
	'send-to-assistant': [event?: AgentSendToAssistantEvent];
	'initial-consumed': [];
}>();

const inputDraft = ref('');
const chatPanel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('chatPanel');

function focusInput(options?: FocusOptions) {
	chatPanel.value?.focusInput(options);
}

function getConversationMarkdown(): string {
	return chatPanel.value?.getConversationMarkdown() ?? '';
}

watch(
	[() => props.initialPrompt, chatPanel],
	([prompt, panel]) => {
		if (!prompt || !panel) return;
		panel.sendMessageFromOutside(prompt);
	},
	{ immediate: true, flush: 'post' },
);

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
				:visible="visible"
				:background-jobs-active="visible"
				mode="inline"
				:continue-session-id="effectiveSessionId"
				:new-session="newSession"
				:agent-config="localConfig"
				:agent-status="deriveAgentStatus(agent)"
				:connected-triggers="connectedTriggers"
				:can-send-to-assistant="canSendToAssistant"
				:before-send="beforeSend"
				@continue-loaded="emit('continue-loaded', $event)"
				@session-created="emit('session-created', $event)"
				@initial-consumed="emit('initial-consumed')"
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
