<script setup lang="ts">
import { ref, toRef, watch, onMounted, onBeforeUnmount } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import { useAgentChatStream } from '../composables/useAgentChatStream';
import AgentChatEmptyState from './AgentChatEmptyState.vue';
import AgentChatMessageList from './AgentChatMessageList.vue';

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

const inputText = ref('');

const {
	messages,
	isStreaming,
	messagingState,
	loadHistory,
	clearHistory,
	sendMessage,
	stopGenerating,
} = useAgentChatStream({
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

async function onClearHistory() {
	await clearHistory();
}

async function onSubmit() {
	const text = inputText.value.trim();
	if (!text || isStreaming.value) return;
	inputText.value = '';
	await sendMessage(text);
}

function sendMessageFromOutside(message: string) {
	inputText.value = message;
	void onSubmit();
}

defineExpose({ sendMessageFromOutside });

onMounted(() => {
	void loadHistory();
	if (props.initialMessage) {
		sendMessageFromOutside(props.initialMessage);
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
		<div v-if="continueSessionId" :class="[$style.topBar, $style.topBarContinue]">
			<button :class="$style.backBtn" title="Back to agent" @click="emit('back')">
				<N8nIcon icon="arrow-left" :size="14" />
			</button>
			<span v-if="sessionEmoji" :class="$style.sessionEmoji">{{ sessionEmoji }}</span>
			<span v-if="sessionTitle" :class="$style.sessionTitle">{{ sessionTitle }}</span>
		</div>
		<div v-else-if="endpoint === 'build' && messages.length > 0" :class="$style.topBar">
			<button
				:class="$style.clearBtn"
				title="Clear chat history"
				data-testid="chat-clear"
				@click="onClearHistory"
			>
				<N8nIcon icon="trash-2" :size="14" />
			</button>
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

.topBar {
	position: absolute;
	top: 0;
	right: 0;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: var(--spacing--2xs) var(--spacing--sm);
}

.clearBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text--tint-2);
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
}

.clearBtn:hover {
	background-color: var(--color--foreground--tint-1);
	color: var(--color--danger);
}

.topBarContinue {
	justify-content: flex-start;
	gap: var(--spacing--2xs);
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

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}

.sessionEmoji {
	font-size: var(--font-size--md);
	line-height: 1;
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
}

.inputArea {
	padding: var(--spacing--sm);
}
</style>
