<script setup lang="ts">
import { useTemplateRef } from 'vue';
import Modal from '@/components/Modal.vue';
import { N8nResizeWrapper } from '@n8n/design-system';
import { useResizablePanel } from '@/composables/useResizablePanel';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { AI_CHAT_DIALOG_MODAL_KEY } from '@/features/ai/chatHub/constants';
import ConversationListPane from './ConversationListPane.vue';
import ErrorDisplayPane from './ErrorDisplayPane.vue';
import ChatPrompt from './ChatPrompt.vue';

const chatStore = useChatStore();
const container = useTemplateRef('container');

const {
	size: leftPaneWidth,
	onResize: onLeftPaneResize,
	onResizeEnd: onLeftPaneResizeEnd,
} = useResizablePanel('aiDialog_leftPaneWidth', {
	container,
	defaultSize: 300,
	minSize: 200,
	maxSize: 500,
});

const {
	size: middlePaneWidth,
	onResize: onMiddlePaneResize,
	onResizeEnd: onMiddlePaneResizeEnd,
} = useResizablePanel('aiDialog_middlePaneWidth', {
	container,
	defaultSize: 350,
	minSize: 250,
	maxSize: 500,
});

function handleSubmitMessage(message: string) {
	// This is a simplified version - in full implementation would need model and credentials
	// For now, we'll just show this connects to the store
	if (!chatStore.currentSessionId) {
		// Create new session by sending first message
		// The backend will create the session
		console.log('Would send message to create new session:', message);
	} else {
		console.log('Would send message to existing session:', message);
	}
}
</script>

<template>
	<Modal
		:name="AI_CHAT_DIALOG_MODAL_KEY"
		width="800px"
		height="600px"
		:close-on-click-modal="false"
	>
		<template #header>
			<div :class="$style['ai-dialog-header']">
				<h3>AI Chat Assistant</h3>
			</div>
		</template>

		<template #content>
			<div ref="container" :class="$style['ai-dialog-body']">
				<N8nResizeWrapper
					:supported-directions="['right']"
					:width="leftPaneWidth"
					:style="{ width: `${leftPaneWidth}px` }"
					:class="$style['left-pane']"
					@resize="onLeftPaneResize"
					@resizeend="onLeftPaneResizeEnd"
				>
					<ConversationListPane />
				</N8nResizeWrapper>

				<N8nResizeWrapper
					:supported-directions="['right']"
					:width="middlePaneWidth"
					:style="{ width: `${middlePaneWidth}px` }"
					:class="$style['middle-pane']"
					@resize="onMiddlePaneResize"
					@resizeend="onMiddlePaneResizeEnd"
				>
					<div :class="$style['middle-pane-content']">
						<ChatPrompt
							placeholder="Type your message..."
							:disabled="false"
							@submit="handleSubmitMessage"
						/>
					</div>
				</N8nResizeWrapper>

				<div :class="$style['right-pane']">
					<ErrorDisplayPane />
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.ai-dialog-header {
	h3 {
		margin: 0;
		font-size: var(--font-size-l);
		font-weight: 600;
	}
}

.ai-dialog-body {
	display: flex;
	height: 100%;
	overflow: hidden;
}

.left-pane {
	height: 100%;
	border-right: 1px solid var(--color-foreground-base);
}

.middle-pane {
	height: 100%;
	border-right: 1px solid var(--color-foreground-base);
	display: flex;
	flex-direction: column;
}

.middle-pane-content {
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	padding: var(--spacing-m);
}

.right-pane {
	flex-grow: 1;
	height: 100%;
	overflow: auto;
	min-width: 150px;
}
</style>
