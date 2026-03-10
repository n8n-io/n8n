<script lang="ts" setup>
import { computed, ref } from 'vue';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import AgentActivityTree from './AgentActivityTree.vue';
import ChatTypingIndicator from '@/features/ai/chatHub/components/ChatTypingIndicator.vue';
import type { InstanceAiMessage } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
import CollapsibleMessage from './CollapsibleMessage.vue';

const props = defineProps<{
	message: InstanceAiMessage;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const showDebugInfo = ref(false);

const isUser = computed(() => props.message.role === 'user');
const isStreaming = computed(() => props.message.isStreaming);
const showContent = computed(() => props.message.content.length > 0 || isStreaming.value);

/**
 * Background task indicator: shows when the orchestrator run has finished
 * but child agents (e.g., workflow builder) are still working in the background.
 */
const hasActiveBackgroundTasks = computed(() => {
	if (!props.message.agentTree || props.message.isStreaming) return false;
	return props.message.agentTree.children.some((c) => c.status === 'active');
});

const emit = defineEmits<{
	retry: [message: string];
}>();

const canRetry = computed(() => {
	if (isUser.value || isStreaming.value) return false;
	const tree = props.message.agentTree;
	if (!tree) return false;
	return tree.status === 'error' || tree.status === 'cancelled';
});

function handleRetry() {
	const msgIndex = store.messages.findIndex((m) => m.id === props.message.id);
	const prevUserMsg = store.messages
		.slice(0, msgIndex)
		.reverse()
		.find((m) => m.role === 'user');
	if (prevUserMsg) {
		emit('retry', prevUserMsg.content);
	}
}

function formatJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}
</script>

<template>
	<div :class="[$style.message, isUser ? $style.userMessage : $style.assistantMessage]">
		<!-- User message -->
		<div v-if="isUser" :class="$style.userBubble" data-test-id="instance-ai-user-message">
			<span>{{ props.message.content }}</span>
		</div>

		<!-- Assistant message -->
		<div v-else :class="$style.assistantWrapper" data-test-id="instance-ai-assistant-message">
			<CollapsibleMessage :is-streaming="isStreaming">
				<div :class="$style.assistantContent">
					<!-- Agent activity tree (handles reasoning, tool calls, sub-agents) -->
					<AgentActivityTree
						v-if="props.message.agentTree"
						:agent-node="props.message.agentTree"
						:is-root="true"
					/>

					<!-- Text content (shown when no agentTree, or streaming dots) -->
					<div v-if="showContent && !props.message.agentTree" :class="$style.textContent">
						<InstanceAiMarkdown v-if="props.message.content" :content="props.message.content" />
					</div>

					<!-- Streaming indicator -->
					<ChatTypingIndicator
						v-if="isStreaming && !props.message.content && !props.message.agentTree"
					/>

					<!-- Background task indicator (run finished but sub-agents still working) -->
					<div v-if="hasActiveBackgroundTasks" :class="$style.backgroundStatus">
						<N8nIcon icon="spinner" spin size="small" />
						<span>{{ i18n.baseText('instanceAi.backgroundTask.running') }}</span>
					</div>
				</div>
			</CollapsibleMessage>

			<div :class="$style.actionButtons">
				<N8nIconButton
					v-if="canRetry"
					icon="refresh-cw"
					variant="ghost"
					size="xsmall"
					:class="$style.actionBtn"
					:title="i18n.baseText('instanceAi.message.retry')"
					@click="handleRetry"
				/>
				<N8nIconButton
					v-if="store.debugMode && !isUser"
					icon="code"
					variant="ghost"
					size="xsmall"
					:class="$style.actionBtn"
					@click="showDebugInfo = !showDebugInfo"
				/>
			</div>
			<pre v-if="showDebugInfo" :class="$style.debugJson">{{ formatJson(props.message) }}</pre>
		</div>
	</div>
</template>

<style lang="scss" module>
.message {
	padding: var(--spacing--xs) 0;
}

.userMessage {
	display: flex;
	justify-content: flex-end;
}

.assistantMessage {
	display: flex;
	justify-content: flex-start;
}

.userBubble {
	background: var(--color--primary--tint-3);
	color: var(--color--text);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--xl);
	max-width: 80%;
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
}

.assistantWrapper {
	position: relative;
	max-width: 90%;
	width: 100%;

	&:hover .actionBtn {
		opacity: 1;
	}
}

.assistantContent {
	width: 100%;
}

.textContent {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text);
}

.actionButtons {
	position: absolute;
	top: 0;
	right: 0;
	display: flex;
	gap: var(--spacing--4xs);
}

.actionBtn {
	opacity: 0;
	transition: opacity 0.15s ease;

	@media (hover: none) {
		opacity: 1;
	}
}

.backgroundStatus {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--3xs) 0;
	margin-top: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.debugJson {
	margin-top: var(--spacing--2xs);
	padding: var(--spacing--xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 300px;
	overflow-y: auto;
	color: var(--color--text--tint-1);
}
</style>
