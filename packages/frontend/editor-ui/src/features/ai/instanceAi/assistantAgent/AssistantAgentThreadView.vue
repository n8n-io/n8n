<script setup lang="ts">
import type { AgentJsonConfig, InstanceAiAttachment } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { computed, provide, ref, useTemplateRef, watch } from 'vue';

import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import { useN8nAssistantIdentity } from '@/features/agents/n8nChatPage/composables/useN8nAssistantIdentity';

import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { countAttachedNodes } from '../utils/buildNodesAttachment';
import {
	ASSISTANT_AGENT_ATTACHMENT_CAPABILITIES,
	ASSISTANT_AGENT_ID,
	ASSISTANT_AGENT_THREAD_ID,
	consumePendingAssistantAgentMessage,
} from './assistantAgentThreads';
import { assistantConfirmationExtension } from './assistantConfirmation';
import { useAssistantAgentThreadsStore } from './assistantAgentThreads.store';

const props = defineProps<{ threadId: string; projectId: string }>();

provide(ASSISTANT_AGENT_THREAD_ID, props.threadId);

const telemetry = useTelemetry();
const rootStore = useRootStore();
const settingsStore = useInstanceAiSettingsStore();
const identity = useN8nAssistantIdentity();
const threadsStore = useAssistantAgentThreadsStore();

// A thread that the empty view just created has its first message waiting. Until
// the server accepts it, the thread does not exist there yet.
const pendingMessage = consumePendingAssistantAgentMessage(props.threadId);
const isNewSession = ref(pendingMessage !== undefined);
let pendingReferences: InstanceAiAttachment[] = pendingMessage?.references ?? [];
// The lists show a thread opened by URL even when it is older than the recent page.
if (!pendingMessage) void threadsStore.loadThread(props.threadId);

const agentConfig = computed<AgentJsonConfig>(() => ({
	name: identity.name.value,
	model: '',
	instructions: '',
	personalisation: identity.personalisation,
}));

/** The Assistant reads the same request fields as from its current runtime. */
function clientContext(): Record<string, unknown> {
	return {
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		...(rootStore.pushRef ? { pushRef: rootStore.pushRef } : {}),
		browserUseAvailable: settingsStore.isBrowserUseAvailable,
		...(pendingReferences.length > 0 ? { attachments: pendingReferences } : {}),
	};
}

/** The references go with the first message, so a retry of a refused send keeps them. */
function onMessageAccepted(): void {
	// Tracked on acceptance, like the current runtime, so refused sends don't inflate the count.
	const nodeCount = countAttachedNodes(pendingReferences);
	if (nodeCount > 0) {
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_NODES, {
			node_count: nodeCount,
			runtime: 'agents',
		});
	}
	pendingReferences = [];
}

const interactionExtensions = [assistantConfirmationExtension];

const panel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('panel');
watch(panel, (current) => {
	if (!current || !pendingMessage) return;
	current.sendMessageFromOutside(pendingMessage.text, pendingMessage.files);
});

function onSessionCreated(): void {
	isNewSession.value = false;
	// The thread exists once the server accepts its first message. Show it in the lists
	// now, not only after the first reply ends.
	void threadsStore.loadThread(props.threadId);
}

// A finished turn can add the thread to the lists, or give it a title.
let wasStreaming = false;
function onStreamingChange(streaming: boolean): void {
	if (wasStreaming && !streaming) void threadsStore.fetchRecent();
	wasStreaming = streaming;
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
			:attachment-capabilities="ASSISTANT_AGENT_ATTACHMENT_CAPABILITIES"
			agent-status="production"
			:connected-triggers="[]"
			channel="system"
			:client-context="clientContext"
			:interaction-extensions="interactionExtensions"
			@session-created="onSessionCreated"
			@message-accepted="onMessageAccepted"
			@update:streaming="onStreamingChange"
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
