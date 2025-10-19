<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { N8nResizeWrapper, N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useAIAssistantStore } from '@/stores/aiAssistant.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import AIAssistantVersionHistory from '@/components/AIAssistantVersionHistory.vue';
import AIAssistantSettings from '@/components/AIAssistantSettings.vue';

const aiAssistantStore = useAIAssistantStore();
const workflowsStore = useWorkflowsStore();

const messageInput = ref('');
const messagesContainer = ref<HTMLDivElement | null>(null);
const showVersionHistory = ref(false);
const showSettings = ref(false);

const workflow = computed(() => workflowsStore.workflow);
const messages = computed(() => aiAssistantStore.messages);
const isProcessing = computed(() => aiAssistantStore.isProcessing);
const panelWidth = computed(() => aiAssistantStore.panelWidth);

const canSend = computed(
	() => messageInput.value.trim().length > 0 && !isProcessing.value && workflow.value,
);

const nodeCount = computed(() => workflow.value?.nodes?.length || 0);

watch(
	() => workflow.value?.id,
	(newId) => {
		if (newId) {
			aiAssistantStore.loadConversationForWorkflow(newId);
		}
	},
	{ immediate: true },
);

watch(
	() => messages.value.length,
	async () => {
		await nextTick();
		scrollToBottom();
	},
);

function scrollToBottom() {
	if (messagesContainer.value) {
		messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
	}
}

async function handleSend() {
	if (!canSend.value) return;

	const message = messageInput.value.trim();
	messageInput.value = '';

	await aiAssistantStore.sendMessage(message);
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		handleSend();
	}
}

function handleResize(data: { width?: number; height?: number }) {
	if (data.width) {
		aiAssistantStore.updatePanelWidth(data.width);
	}
}

function openVersionHistory() {
	showVersionHistory.value = true;
}

function openSettings() {
	showSettings.value = true;
}

function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

	if (diffInMinutes < 1) return 'Just now';
	if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
	if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;

	return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
	<N8nResizeWrapper
		:supported-directions="['left']"
		:width="panelWidth"
		:min-width="300"
		:max-width="800"
		:class="$style.panel"
		@resize="handleResize"
	>
		<div :class="$style.container">
			<!-- Header -->
			<div :class="$style.header">
				<N8nText :class="$style.title" bold size="large">AI Assistant</N8nText>
				<div :class="$style.actions">
					<N8nButton
						type="tertiary"
						size="small"
						icon="history"
						:title="'Version History'"
						@click="openVersionHistory"
					>
						<N8nIcon icon="history" size="medium" />
					</N8nButton>
					<N8nButton
						type="tertiary"
						size="small"
						icon="cog"
						:title="'Settings'"
						@click="openSettings"
					>
						<N8nIcon icon="cog" size="medium" />
					</N8nButton>
				</div>
			</div>

			<!-- Messages Area -->
			<div ref="messagesContainer" :class="$style.messages">
				<div v-if="messages.length === 0" :class="$style.emptyState">
					<N8nText color="text-light" size="medium">
						{{ nodeCount === 0
							? 'Create nodes in the workflow to get started'
							: 'Describe what you want to change in the workflow...' }}
					</N8nText>
				</div>

				<div
					v-for="message in messages"
					:key="message.id"
					:class="[
						$style.message,
						message.role === 'user' ? $style.userMessage : $style.assistantMessage,
					]"
				>
					<div :class="$style.messageHeader">
						<N8nText :class="$style.sender" bold size="small">
							{{ message.role === 'user' ? 'You' : 'AI Assistant' }}
						</N8nText>
						<N8nText :class="$style.timestamp" color="text-light" size="xsmall">
							{{ formatTimestamp(message.timestamp) }}
						</N8nText>
					</div>
					<div :class="$style.messageContent">
						<N8nText size="medium">{{ message.content }}</N8nText>
					</div>
					<div v-if="message.metadata" :class="$style.metadata">
						<span v-if="message.metadata.nodeCount !== undefined" :class="$style.badge">
							Context: {{ message.metadata.nodeCount }} nodes loaded
						</span>
						<span
							v-if="message.status === 'applied'"
							:class="[$style.badge, $style.successBadge]"
						>
							✓ Applied to workflow
						</span>
						<span v-if="message.status === 'error'" :class="[$style.badge, $style.errorBadge]">
							✗ Error
						</span>
					</div>
				</div>

				<div v-if="isProcessing" :class="[$style.message, $style.assistantMessage]">
					<div :class="$style.messageHeader">
						<N8nText :class="$style.sender" bold size="small">AI Assistant</N8nText>
					</div>
					<div :class="$style.messageContent">
						<N8nText color="text-light" size="medium">Thinking...</N8nText>
					</div>
				</div>
			</div>

			<!-- Input Area -->
			<div :class="$style.inputArea">
				<textarea
					v-model="messageInput"
					:class="$style.textarea"
					:disabled="isProcessing || !workflow"
					placeholder="Describe what you want to change in the workflow..."
					rows="3"
					@keydown="handleKeydown"
				/>
				<N8nButton
					:class="$style.sendButton"
					:disabled="!canSend"
					:loading="isProcessing"
					type="primary"
					size="large"
					@click="handleSend"
				>
					{{ isProcessing ? 'Processing...' : 'Send' }}
				</N8nButton>
			</div>
		</div>

		<!-- Modals -->
		<AIAssistantVersionHistory
			v-if="showVersionHistory"
			@close="showVersionHistory = false"
		/>
		<AIAssistantSettings v-if="showSettings" @close="showSettings = false" />
	</N8nResizeWrapper>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	background-color: var(--color-background-light);
	border-left: var(--border-base);
	height: 100%;
}

.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-s);
	border-bottom: var(--border-base);
	flex-shrink: 0;
}

.title {
	font-size: 14px;
}

.actions {
	display: flex;
	gap: var(--spacing-2xs);
}

.messages {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing-s);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
}

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	padding: var(--spacing-l);
	text-align: center;
}

.message {
	padding: var(--spacing-s);
	border-radius: var(--border-radius-base);
	max-width: 85%;
}

.userMessage {
	background-color: #f5f5f5;
	align-self: flex-end;
	margin-left: var(--spacing-l);
}

.assistantMessage {
	background-color: #e8f4f8;
	align-self: flex-start;
	margin-right: var(--spacing-l);
}

.messageHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing-2xs);
}

.sender {
	font-size: 12px;
}

.timestamp {
	font-size: 11px;
}

.messageContent {
	font-size: 13px;
	line-height: 1.4;
	white-space: pre-wrap;
	word-wrap: break-word;
}

.metadata {
	display: flex;
	gap: var(--spacing-2xs);
	margin-top: var(--spacing-2xs);
	flex-wrap: wrap;
}

.badge {
	display: inline-block;
	padding: 2px 8px;
	border-radius: var(--border-radius-base);
	font-size: 11px;
	background-color: var(--color-background-base);
	color: var(--color-text-base);
}

.successBadge {
	background-color: var(--color-success-tint-1);
	color: var(--color-success);
}

.errorBadge {
	background-color: var(--color-danger-tint-1);
	color: var(--color-danger);
}

.inputArea {
	flex-shrink: 0;
	padding: var(--spacing-s);
	border-top: var(--border-base);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.textarea {
	width: 100%;
	min-height: 60px;
	padding: var(--spacing-xs);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
	font-family: inherit;
	font-size: 13px;
	resize: vertical;
	max-height: 200px;

	&:focus {
		outline: none;
		border-color: var(--color-secondary);
	}

	&:disabled {
		background-color: var(--color-background-light);
		cursor: not-allowed;
	}
}

.sendButton {
	width: 100%;
}
</style>
