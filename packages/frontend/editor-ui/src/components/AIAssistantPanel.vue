<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { N8nResizeWrapper, N8nScrollArea, N8nSelect, N8nOption, N8nIconButton, N8nText } from '@n8n/design-system';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useAIPanelStore } from '@/stores/aiPanel.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useUIStore } from '@/stores/ui.store';
import ChatPrompt from '@/features/ai/chatHub/components/ChatPrompt.vue';
import ChatMessage from '@/features/ai/chatHub/components/ChatMessage.vue';
import { v4 as uuidv4 } from 'uuid';

// Stores
const chatStore = useChatStore();
const aiPanelStore = useAIPanelStore();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();

// Refs
const messagesScrollAreaRef = ref<InstanceType<typeof N8nScrollArea> | null>(null);
const ollamaCredentialId = ref<string | null>(null);
const chatPromptRef = ref<InstanceType<typeof ChatPrompt> | null>(null);

// Computed properties
const aiPanelWidth = computed(() => aiPanelStore.panelWidth);
const currentSessionId = computed({
	get: () => chatStore.currentSessionId,
	set: (value) => chatStore.setCurrentSessionId(value),
});
const isResponding = computed(() => chatStore.isResponding);
const activeMessages = computed(() => {
	if (!currentSessionId.value) return [];
	return chatStore.getActiveMessages(currentSessionId.value);
});

const sortedSessions = computed(() => {
	return chatStore.sessions
		.slice()
		.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
		.slice(0, 50); // Limit to 50 most recent
});

const currentSession = computed(() => {
	if (!currentSessionId.value) return null;
	return chatStore.sessions.find((s) => s.id === currentSessionId.value);
});

// Helper functions
function truncateTitle(title: string, maxLength: number): string {
	if (title.length <= maxLength) return title;
	return title.substring(0, maxLength - 3) + '...';
}

function scrollToBottom() {
	nextTick(() => {
		if (messagesScrollAreaRef.value) {
			const scrollContainer = messagesScrollAreaRef.value.$el.querySelector('[data-radix-scroll-area-viewport]');
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}
	});
}

// Event handlers
async function handleSendMessage(message: string) {
	if (!ollamaCredentialId.value) {
		uiStore.showToast({
			title: 'Cannot send message',
			message: 'Ollama credentials not configured',
			type: 'error',
		});
		return;
	}

	// Ensure we have a session
	let sessionId = currentSessionId.value;
	if (!sessionId) {
		sessionId = uuidv4();
		chatStore.setCurrentSessionId(sessionId);
	}

	if (!sessionId) {
		uiStore.showToast({
			title: 'Error',
			message: 'Failed to create conversation',
			type: 'error',
		});
		return;
	}

	// Hardcoded model
	const model = {
		provider: 'ollama' as const,
		model: 'llama3.2:latest',
		workflowId: null,
	};

	// Hardcoded credentials
	const credentials = {
		ollama: ollamaCredentialId.value,
	};

	// Send message
	chatStore.sendMessage(sessionId, message, model, credentials);

	// Clear input after sending
	if (chatPromptRef.value) {
		chatPromptRef.value.setText('');
	}
}

function handleNewConversation() {
	const sessionId = uuidv4();
	chatStore.setCurrentSessionId(sessionId);
}

async function handleSelectConversation(sessionId: string) {
	chatStore.setCurrentSessionId(sessionId);

	// Fetch messages if not already loaded
	const conversation = chatStore.getConversation(sessionId);
	if (!conversation || Object.keys(conversation.messages).length === 0) {
		try {
			await chatStore.fetchMessages(sessionId);
		} catch (error) {
			uiStore.showToast({
				title: 'Failed to load conversation',
				message: error instanceof Error ? error.message : 'Please try again',
				type: 'error',
			});
		}
	}
}

function onResize(data: { width: number; direction: string }) {
	aiPanelStore.updateWidth(data.width);
}

// Lifecycle
onMounted(async () => {
	// Clean up old modal localStorage keys
	localStorage.removeItem('n8n-ai-dialog-selected-model');
	localStorage.removeItem('n8n-ai-dialog-credentials');
	localStorage.removeItem('aiDialog_windowPosition');
	localStorage.removeItem('aiDialog_windowSize');

	// Fetch credentials
	await credentialsStore.fetchAllCredentials();

	// Find first Ollama credential
	const ollamaCredentials = credentialsStore.allCredentials.filter(
		(cred) => cred.type === 'ollamaApi'
	);

	if (ollamaCredentials.length > 0) {
		ollamaCredentialId.value = ollamaCredentials[0].id;
	} else {
		uiStore.showToast({
			title: 'Ollama credentials not found',
			message: 'Please configure Ollama credentials in Settings',
			type: 'error',
			duration: 5000,
		});
	}

	// Fetch existing sessions
	await chatStore.fetchSessions();

	// If no current session and sessions exist, select the most recent one
	if (!currentSessionId.value && chatStore.sessions.length > 0) {
		const mostRecent = sortedSessions.value[0];
		if (mostRecent) {
			await handleSelectConversation(mostRecent.id);
		}
	}

	// If still no session, create a new one
	if (!currentSessionId.value) {
		handleNewConversation();
	}
});

// Watch for new messages and auto-scroll
watch(activeMessages, (newMessages, oldMessages) => {
	if (newMessages.length !== oldMessages?.length || isResponding.value) {
		scrollToBottom();
	}
}, { deep: true });

// Watch for session changes and scroll to bottom
watch(currentSessionId, () => {
	scrollToBottom();
});
</script>

<template>
	<div ref="wrapper" :class="$style.wrapper">
		<N8nResizeWrapper
			:width="aiPanelWidth"
			:supported-directions="['left']"
			:min-width="350"
			:max-width="800"
			:grid-size="8"
			@resize="onResize"
		>
			<div :class="$style.container">
				<div :class="$style.header">
					<span :class="$style.title">AI Assistant</span>
					<N8nSelect
						v-model="currentSessionId"
						:class="$style.conversationSelector"
						size="small"
						placeholder="New Conversation"
						@update:model-value="handleSelectConversation"
					>
						<N8nOption
							v-for="session in sortedSessions"
							:key="session.id"
							:value="session.id"
							:label="truncateTitle(session.title || 'Untitled', 30)"
						/>
					</N8nSelect>
					<N8nIconButton
						icon="plus"
						type="tertiary"
						size="medium"
						:class="$style.newConversationButton"
						@click="handleNewConversation"
						title="New conversation"
					/>
				</div>

				<div :class="$style.messagesSection">
					<N8nScrollArea ref="messagesScrollAreaRef" :class="$style.messageList">
						<div v-if="activeMessages.length === 0" :class="$style.emptyState">
							<N8nText size="medium" color="text-base">Start a conversation with AI Assistant</N8nText>
						</div>
						<div v-for="message in activeMessages" :key="message.id" :class="$style.message">
							<ChatMessage
								:message="message"
								:compact="false"
								:is-editing="false"
								:is-streaming="isResponding && message.id === chatStore.streamingMessageId"
							/>
						</div>
					</N8nScrollArea>
				</div>

				<div :class="$style.inputSection">
					<ChatPrompt
						ref="chatPromptRef"
						placeholder="Type your message..."
						:disabled="isResponding || !ollamaCredentialId"
						@submit="handleSendMessage"
					/>
				</div>
			</div>
		</N8nResizeWrapper>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	height: 100%;
	background: var(--color-background-xlight);
	border-left: 1px solid var(--color-foreground-base);
}

.container {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.header {
	padding: 16px;
	border-bottom: 1px solid var(--color-foreground-base);
	display: flex;
	align-items: center;
	gap: 12px;
	background: var(--color-background-xlight);
}

.title {
	font-weight: 600;
	font-size: 16px;
	color: var(--color-text-dark);
}

.conversationSelector {
	flex: 1;
	min-width: 0;
}

.newConversationButton {
	flex-shrink: 0;
}

.messagesSection {
	flex: 1;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.messageList {
	flex: 1;
	padding: 16px;
}

.message {
	margin-bottom: 24px;

	&:last-child {
		margin-bottom: 0;
	}
}

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	text-align: center;
	color: var(--color-text-base);
}

.inputSection {
	padding: 16px;
	border-top: 1px solid var(--color-foreground-base);
	background: var(--color-background-xlight);
}
</style>
