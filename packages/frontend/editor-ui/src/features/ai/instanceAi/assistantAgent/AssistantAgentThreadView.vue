<script setup lang="ts">
import type { AgentJsonConfig, InstanceAiAttachment } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, useTemplateRef, watch } from 'vue';

import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import { useN8nAssistantIdentity } from '@/features/agents/n8nChatPage/composables/useN8nAssistantIdentity';

import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { ASSISTANT_AGENT_ID, consumePendingAssistantAgentMessage } from './assistantAgentThreads';

const props = defineProps<{ threadId: string; projectId: string }>();

const rootStore = useRootStore();
const settingsStore = useInstanceAiSettingsStore();
const identity = useN8nAssistantIdentity();

// A thread that the empty view just created has its first message waiting. Until
// the server accepts it, the thread does not exist there yet.
const pendingMessage = consumePendingAssistantAgentMessage(props.threadId);
const isNewSession = ref(pendingMessage !== undefined);
let pendingReferences: InstanceAiAttachment[] = pendingMessage?.references ?? [];

const agentConfig = computed<AgentJsonConfig>(() => ({
	name: identity.name.value,
	model: '',
	instructions: '',
	personalisation: identity.personalisation,
}));

/** The Assistant reads the same request fields as from its current runtime. */
function clientContext(): Record<string, unknown> {
	const references = pendingReferences;
	pendingReferences = [];
	return {
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		...(rootStore.pushRef ? { pushRef: rootStore.pushRef } : {}),
		browserUseAvailable: settingsStore.isBrowserUseAvailable,
		...(references.length > 0 ? { attachments: references } : {}),
	};
}

const panel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('panel');
watch(panel, (current) => {
	if (!current || !pendingMessage) return;
	current.sendMessageFromOutside(pendingMessage.text, pendingMessage.files);
});

function onSessionCreated(): void {
	isNewSession.value = false;
}
</script>

<template>
	<div :class="$style.container" data-test-id="assistant-agent-thread-view">
		<AgentChatPanel
			ref="panel"
			:project-id="props.projectId"
			:agent-id="ASSISTANT_AGENT_ID"
			mode="inline"
			:continue-session-id="props.threadId"
			:new-session="isNewSession"
			:agent-config="agentConfig"
			:attachment-capabilities="{ image: true, pdf: true, audio: false }"
			agent-status="production"
			:connected-triggers="[]"
			channel="system"
			:client-context="clientContext"
			@session-created="onSessionCreated"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	height: 100%;
}
</style>
