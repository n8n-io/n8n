<script setup lang="ts">
import { computed, ref, toRef, watch, onMounted, onBeforeUnmount } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import { useAgentChatStream } from '../composables/useAgentChatStream';
import AgentChatEmptyState from './AgentChatEmptyState.vue';
import AgentChatMessageList from './AgentChatMessageList.vue';
import type { AgentJsonConfig } from '../types';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import { buildAgentConfigFingerprint, sha256Hex16 } from '../composables/agentTelemetry.utils';

const props = withDefaults(
	defineProps<{
		visible?: boolean;
		projectId: string;
		agentId: string;
		mode?: 'panel' | 'inline';
		endpoint?: 'build' | 'chat';
		initialMessage?: string;
		continueSessionId?: string;
		sessionTitle?: string;
		sessionEmoji?: string;
		agentConfig: AgentJsonConfig | null;
		agentStatus: 'draft' | 'production';
		connectedTriggers: string[];
	}>(),
	{
		visible: true,
		mode: 'panel',
		endpoint: 'chat',
		initialMessage: undefined,
		continueSessionId: undefined,
		sessionTitle: undefined,
		sessionEmoji: undefined,
	},
);

const emit = defineEmits<{
	codeUpdated: [];
	codeDelta: [delta: string];
	configUpdated: [];
	'update:streaming': [streaming: boolean];
	'continue-loaded': [count: number];
	back: [];
}>();

const locale = useI18n();
const agentTelemetry = useAgentTelemetry();

// Sub-header title for chat sessions — the persisted session title if one
// exists, otherwise "New chat" for freshly-started ephemeral sessions.
// (Builder has no sub-header, so no builder branch here.)
const displayTitle = computed(() => props.sessionTitle ?? locale.baseText('agents.chat.newChat'));

const inputText = ref('');

const { messages, isStreaming, messagingState, loadHistory, sendMessage, stopGenerating } =
	useAgentChatStream({
		projectId: toRef(props, 'projectId'),
		agentId: toRef(props, 'agentId'),
		endpoint: toRef(props, 'endpoint'),
		continueSessionId: toRef(props, 'continueSessionId'),
		onCodeUpdated: () => emit('codeUpdated'),
		onCodeDelta: (d) => emit('codeDelta', d),
		onConfigUpdated: () => emit('configUpdated'),
		onHistoryLoaded: (count) => {
			if (props.continueSessionId) emit('continue-loaded', count);
		},
	});

watch(isStreaming, (v) => emit('update:streaming', v));

async function onSubmit() {
	const text = inputText.value.trim();
	if (!text || isStreaming.value) return;
	inputText.value = '';

	const [fingerprint, messageHash] = await Promise.all([
		buildAgentConfigFingerprint(props.agentConfig, props.connectedTriggers),
		sha256Hex16(text),
	]);
	agentTelemetry.trackSubmittedMessage({
		agentId: props.agentId,
		messageHash,
		messageLength: text.length,
		mode: props.endpoint === 'build' ? 'build' : 'test',
		status: props.agentStatus,
		agentConfig: fingerprint,
	});

	await sendMessage(text);
}

function sendMessageFromOutside(message: string) {
	inputText.value = message;
	void onSubmit();
}

defineExpose({ sendMessageFromOutside });

onMounted(() => {
	// A supplied `initialMessage` means the parent just minted a fresh session
	// and wants us to seed it with the first message — there's no thread to
	// load yet, and hitting the history endpoint would 404.
	if (props.initialMessage) {
		sendMessageFromOutside(props.initialMessage);
	} else {
		void loadHistory();
	}
});

// Abort any in-flight stream when the panel unmounts (e.g. route change,
// chat mode reset). Without this the fetch keeps running and its reader
// accumulates bytes until the browser gc's it.
onBeforeUnmount(() => {
	stopGenerating();
});
</script>

<template>
	<aside v-if="visible" :class="[mode === 'inline' ? $style.inlinePanel : $style.panel]">
		<!-- Builder intentionally has no sub-header: it's one persistent per-agent
			 conversation with no "session" to label or exit back from. -->
		<div v-if="endpoint !== 'build'" :class="$style.subHeader">
			<button
				:class="$style.backBtn"
				:title="locale.baseText('agents.chat.back')"
				@click="emit('back')"
			>
				<N8nIcon icon="arrow-left" :size="14" />
			</button>
			<span v-if="sessionEmoji" :class="$style.sessionEmoji">{{ sessionEmoji }}</span>
			<N8nIcon v-else :class="$style.sessionIcon" icon="message-square" :size="14" />
			<span :class="$style.sessionTitle">{{ displayTitle }}</span>
		</div>

		<AgentChatEmptyState v-if="messages.length === 0 && !isStreaming" :endpoint="endpoint" />
		<AgentChatMessageList v-else :messages="messages" :messaging-state="messagingState" />

		<div :class="$style.inputArea">
			<ChatInputBase
				v-model="inputText"
				placeholder="Type a message..."
				:is-streaming="messagingState === 'receiving'"
				:can-submit="!isStreaming && inputText.trim().length > 0"
				:disabled="isStreaming && messagingState !== 'receiving'"
				data-testid="chat-input"
				@submit="onSubmit"
				@stop="stopGenerating"
			/>
		</div>
	</aside>
</template>

<style lang="scss" module>
.panel {
	position: relative;
	width: 400px;
	min-width: 400px;
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
	display: flex;
	flex-direction: column;
}

.inlinePanel {
	position: relative;
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.subHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	flex-shrink: 0;
}

.backBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--primary);
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	flex-shrink: 0;

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}

.sessionEmoji {
	font-size: var(--font-size--md);
	line-height: 1;
	flex-shrink: 0;
}

.sessionIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.sessionTitle {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	flex: 1;
}

.inputArea {
	padding: var(--spacing--sm);
}
</style>
