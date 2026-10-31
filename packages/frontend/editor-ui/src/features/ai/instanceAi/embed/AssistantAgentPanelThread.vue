<script lang="ts" setup>
/**
 * One thread of the embedded panel on the Assistant agent. It sends the
 * subject agent with each message, so the Assistant knows which agent the
 * user builds. It exposes the same calls as `InstanceAiConversation`, so the
 * panel treats both runtimes the same.
 */
import type {
	AgentJsonConfig,
	InstanceAiAgentAttachment,
	InstanceAiAttachment,
	InstanceAiHandoffContext,
	InstanceAiPrefillPayload,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, provide, ref, useTemplateRef, watch } from 'vue';

import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import { useN8nAssistantIdentity } from '@/features/agents/n8nChatPage/composables/useN8nAssistantIdentity';

import { provideArtifactThread } from '../artifactThread';
import {
	ASSISTANT_AGENT_ATTACHMENT_CAPABILITIES,
	ASSISTANT_AGENT_ID,
	ASSISTANT_AGENT_PROJECT_ID,
	ASSISTANT_AGENT_THREAD_ID,
} from '../assistantAgent/assistantAgentThreads';
import { useAssistantAgentThreadsStore } from '../assistantAgent/assistantAgentThreads.store';
import { assistantConfirmationExtension } from '../assistantAgent/assistantConfirmation';
import { useAssistantAgentMessageTelemetry } from '../assistantAgent/useAssistantAgentMessageTelemetry';
import { useAssistantArtifactThread } from '../assistantAgent/useAssistantArtifactThread';
import type { SuggestionSelectionPayload } from '../components/InstanceAiInput.vue';
import InstanceAiResourceChip from '../components/InstanceAiResourceChip.vue';
import { useAgentMutationRefresh } from '../composables/useAgentMutationRefresh';
import { useBuildingArtifactIds } from '../composables/useBuildingArtifactIds';
import {
	clearPendingComposerDraft,
	clearPendingHandoffContext,
	consumePendingFirstMessage,
	getPendingComposerDraft,
	getPendingHandoffContext,
	stashPendingComposerDraft,
	stashPendingHandoffContext,
	type PendingComposerDraft,
} from '../composables/useInstanceAiHandoff';
import {
	agentPreviewContextIcon,
	formatAgentPreviewContextLabel,
} from '../instanceAi.handoffContext';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { resolveAuthorship } from '../prefills';

const props = defineProps<{
	threadId: string;
	subject: InstanceAiAgentAttachment;
	/** True for a thread that the panel just created: it has no history to load. */
	newSession: boolean;
	placeholder?: string;
	composerHeight?: string;
	beforeSend?: () => Promise<void>;
}>();

const emit = defineEmits<{
	'update:building': [building: boolean];
	'update:working': [working: boolean];
	'message-sent': [];
	'session-created': [];
}>();

const slots = defineSlots<{
	empty?: () => unknown;
	'composer-start'?: () => unknown;
	'composer-footer'?: () => unknown;
}>();

provide(ASSISTANT_AGENT_THREAD_ID, props.threadId);
provide(ASSISTANT_AGENT_PROJECT_ID, props.subject.projectId);

const i18n = useI18n();
const rootStore = useRootStore();
const settingsStore = useInstanceAiSettingsStore();
const threadsStore = useAssistantAgentThreadsStore();
const identity = useN8nAssistantIdentity();
const messageTelemetry = useAssistantAgentMessageTelemetry(props.threadId);

const isNewSession = ref(props.newSession);
const agentConfig = computed<AgentJsonConfig>(() => ({
	name: identity.name.value,
	model: '',
	instructions: '',
	personalisation: identity.personalisation,
}));

// The host stashes a starter message before it opens a new thread.
const starter = consumePendingFirstMessage(props.threadId);
let starterReferences: InstanceAiAttachment[] = starter?.attachments ?? [];
// A hand-off context goes with the next accepted message only.
const handoffContext = ref<InstanceAiHandoffContext | null>(
	starter?.context ?? getPendingHandoffContext(props.threadId),
);

/** The request fields of the current runtime, plus the agent that the user builds. */
function clientContext(): Record<string, unknown> {
	return {
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		...(rootStore.pushRef ? { pushRef: rootStore.pushRef } : {}),
		browserUseAvailable: settingsStore.isBrowserUseAvailable,
		attachments: [...starterReferences, props.subject],
		...(handoffContext.value ? { context: handoffContext.value } : {}),
	};
}

function clearHandoff(): void {
	handoffContext.value = null;
	clearPendingHandoffContext(props.threadId);
	clearPendingComposerDraft(props.threadId);
}

/** Like the current runtime, removing the chip also removes the draft that the hand-off typed. */
function dismissHandoff(): void {
	const draft = getPendingComposerDraft(props.threadId);
	if (draft) panel.value?.clearDraftIfMatches(draft.text);
	if (!panel.value?.isDirty()) messageTelemetry.setPrefill(null);
	clearHandoff();
}

function onMessageAccepted({ clientContext }: { clientContext?: Record<string, unknown> }): void {
	starterReferences = [];
	messageTelemetry.onMessageAccepted();
	// A newer hand-off that arrived during the send stays for the next message.
	if (handoffContext.value && clientContext?.context === handoffContext.value) clearHandoff();
}

/** Like the current runtime, the composer shows a pending agent preview hand-off as a chip. */
const handoffChip = computed(() => {
	const context = handoffContext.value;
	if (context?.source !== 'agent-preview') return null;
	const agentName = context.agentId === props.subject.id ? props.subject.name : undefined;
	return {
		label: formatAgentPreviewContextLabel(
			context,
			(key, options) => i18n.baseText(key, options),
			agentName,
		),
		icon: agentPreviewContextIcon(context.agentIcon),
	};
});

const panel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('panel');
watch(panel, (current, previous) => {
	if (!current || previous) return;
	if (starter) {
		messageTelemetry.expectHostSend({ text: starter.message, authorship: starter.authorship });
		current.sendMessageFromOutside(starter.message);
		return;
	}
	const draft = getPendingComposerDraft(props.threadId);
	if (draft) setPrefill(draft);
});

function setPrefill(prefill: InstanceAiPrefillPayload): void {
	messageTelemetry.setPrefill(prefill);
	panel.value?.setDraft(prefill.text);
}

function onSessionCreated(): void {
	isNewSession.value = false;
	void threadsStore.loadThread(props.threadId);
	emit('session-created');
}

// A finished turn can give the thread a title.
let wasStreaming = false;
function onStreamingChange(streaming: boolean): void {
	emit('update:working', streaming);
	if (wasStreaming && !streaming) void threadsStore.fetchRecent();
	wasStreaming = streaming;
}

const thread = useAssistantArtifactThread({
	threadId: props.threadId,
	projectId: props.subject.projectId,
	messages: () => panel.value?.messages ?? [],
	isStreaming: () => panel.value?.isStreaming ?? false,
	isLoadingHistory: () => panel.value?.isLoadingHistory ?? true,
	sendMessage: (text, authorship, context) => {
		messageTelemetry.expectHostSend({ text, authorship });
		panel.value?.sendMessageFromOutside(text, [], context ? { context } : undefined);
	},
});
provideArtifactThread(thread);
useAgentMutationRefresh(thread);
const buildingArtifactIds = useBuildingArtifactIds(thread);
watch(
	() => buildingArtifactIds.value.has(props.subject.id),
	(building) => emit('update:building', building),
	{ immediate: true },
);
watch(
	() => thread.messages.some((message) => message.role === 'user'),
	(hasMessages) => {
		if (hasMessages) emit('message-sent');
	},
	{ immediate: true },
);

const interactionExtensions = [assistantConfirmationExtension];

defineExpose({
	focus: () => panel.value?.focusInput(),
	isDirty: () => panel.value?.isDirty() ?? false,
	applyHandoff(context: InstanceAiHandoffContext, initialDraft?: PendingComposerDraft) {
		stashPendingHandoffContext(props.threadId, context);
		handoffContext.value = context;
		if (initialDraft) {
			stashPendingComposerDraft(props.threadId, initialDraft);
			setPrefill(initialDraft);
		} else {
			clearPendingComposerDraft(props.threadId);
		}
		panel.value?.focusInput();
	},
	setPrefill,
	submitSuggestion(payload: SuggestionSelectionPayload) {
		const text = payload.prompt ?? i18n.baseText(payload.promptKey);
		const prefill = { text, prefillType: payload.prefillType, prefillId: payload.suggestionId };
		messageTelemetry.expectHostSend({ text, authorship: resolveAuthorship(text, prefill) });
		panel.value?.sendMessageFromOutside(text);
	},
});
</script>

<template>
	<AgentChatPanel
		ref="panel"
		:project-id="props.subject.projectId"
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
		:before-send="props.beforeSend"
		:placeholder="props.placeholder"
		:composer-height="props.composerHeight"
		data-test-id="instance-ai-embed-assistant-agent-thread"
		@session-created="onSessionCreated"
		@message-sending="messageTelemetry.trackSend"
		@message-accepted="onMessageAccepted"
		@update:streaming="onStreamingChange"
	>
		<template v-if="slots.empty" #empty-state>
			<slot name="empty" />
		</template>
		<template v-if="handoffChip" #composer-attachments="{ chips, removeChip }">
			<InstanceAiResourceChip
				:label="handoffChip.label"
				:icon="handoffChip.icon"
				:remove-label="i18n.baseText('generic.close')"
				test-id="instance-ai-handoff-context-chip"
				remove-test-id="instance-ai-handoff-context-chip-dismiss"
				removable
				@remove="dismissHandoff"
			/>
			<!-- The slot replaces the default chips, so render them too. -->
			<InstanceAiResourceChip
				v-for="chip in chips"
				:key="chip.id"
				:label="chip.label"
				:icon="chip.icon"
				removable
				:remove-label="
					i18n.baseText('agents.chat.composer.removeChip', { interpolate: { label: chip.label } })
				"
				test-id="agent-chat-composer-chip"
				remove-test-id="agent-chat-composer-chip-remove"
				@remove="removeChip(chip.id)"
			/>
		</template>
		<template v-if="slots['composer-start']" #composer-start>
			<slot name="composer-start" />
		</template>
		<template v-if="slots['composer-footer']" #composer-footer>
			<slot name="composer-footer" />
		</template>
	</AgentChatPanel>
</template>
