<script setup lang="ts">
import { computed, reactive, useTemplateRef } from 'vue';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type {
	AgentChatDraft,
	AgentContinueLoadedEvent,
	AgentFixWithAssistantEvent,
	AgentJsonConfig,
	AgentResource,
} from '../types';
import AgentChatPanel from './AgentChatPanel.vue';

const props = withDefaults(
	defineProps<{
		active?: boolean;
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
	'send-to-assistant': [event?: AgentFixWithAssistantEvent];
}>();

const drafts = reactive(new Map<string, AgentChatDraft>());
const draftKey = () => props.effectiveSessionId ?? '';
const inputDraft = computed({
	get: () => drafts.get(draftKey())?.text ?? '',
	set: (text: string) => drafts.set(draftKey(), { text, files: inputFiles.value }),
});
const inputFiles = computed({
	get: () => drafts.get(draftKey())?.files ?? [],
	set: (files: File[]) => drafts.set(draftKey(), { text: inputDraft.value, files }),
});
function recoverDraft(sessionId: string | undefined, draft: AgentChatDraft) {
	drafts.set(sessionId ?? '', draft);
}
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
				v-model:input-files="inputFiles"
				:recover-draft="recoverDraft"
				:project-id="projectId"
				:agent-id="agentId"
				:visible="active !== false"
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
