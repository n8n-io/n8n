<script setup lang="ts">
import { computed } from 'vue';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { N8nScrollArea, N8nButton } from '@n8n/design-system';

const chatStore = useChatStore();

const conversations = computed(() => chatStore.sessions);
const activeSessionId = computed(() => chatStore.currentSessionId);

function selectConversation(sessionId: string) {
	chatStore.setCurrentSessionId(sessionId);
	// Fetch messages for the selected conversation
	chatStore.fetchMessages(sessionId);
}

function createNewChat() {
	chatStore.setCurrentSessionId(undefined); // Clear current session
	// Messages area will show empty state
	// Sending first message creates new backend session
}

function getConversationTitle(session: typeof conversations.value[0]): string {
	return session.title || session.firstMessagePreview || 'Chat';
}
</script>

<template>
	<div :class="$style['conversation-list-pane']">
		<div :class="$style['conversation-sidebar']">
			<N8nScrollArea :class="$style['sidebar-scroll']">
				<div
					v-for="session in conversations"
					:key="session.id"
					:class="[
						$style['conversation-item'],
						{ [$style.active]: session.id === activeSessionId },
					]"
					@click="selectConversation(session.id)"
				>
					{{ getConversationTitle(session) }}
				</div>
				<div v-if="conversations.length === 0" :class="$style['empty-state']">
					No conversations yet
				</div>
			</N8nScrollArea>
			<N8nButton
				:class="$style['new-chat-button']"
				type="secondary"
				size="small"
				@click="createNewChat"
			>
				+ New Chat
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.conversation-list-pane {
	height: 100%;
}

.conversation-sidebar {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	background: var(--color-background-xlight);
}

.sidebar-scroll {
	flex-grow: 1;
	overflow: hidden;
}

.conversation-item {
	padding: var(--spacing-xs);
	cursor: pointer;
	border-bottom: 1px solid var(--color-foreground-xlight);
	word-wrap: break-word;
	font-size: var(--font-size-2xs);
	line-height: 1.2;
	transition: background-color 0.2s;

	&:hover {
		background: var(--color-background-base);
	}

	&.active {
		background: var(--color-primary-tint-2);
		font-weight: 600;
	}
}

.new-chat-button {
	margin: var(--spacing-xs);
	width: calc(100% - 2 * var(--spacing-xs));
}

.empty-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-l);
	color: var(--color-text-light);
	font-size: var(--font-size-s);
	text-align: center;
}
</style>
