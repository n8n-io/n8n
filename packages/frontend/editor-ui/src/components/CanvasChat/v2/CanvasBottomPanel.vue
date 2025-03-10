<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { computed, ref } from 'vue';
import { N8nIconButton, N8nResizeWrapper } from '@n8n/design-system';
import { useChatState } from '@/components/CanvasChat/composables/useChatState';
import { useResize } from '@/components/CanvasChat/composables/useResize';

const workflowsStore = useWorkflowsStore();
const isOpen = computed(() => workflowsStore.isChatPanelOpen || workflowsStore.isLogsPanelOpen);
const container = ref<HTMLElement>();
const previousChatMessages = computed(() => workflowsStore.getPastChatMessages);

const { rootStyles, height, onWindowResize, onResizeDebounced } = useResize(container);

const { currentSessionId, messages, connectedNode, sendMessage, refreshSession, displayExecution } =
	useChatState(ref(false), onWindowResize);

function handleToggleOpen() {
	workflowsStore.setPanelOpen('chat', !isOpen.value);
}

function handleClickHeader() {
	if (!isOpen.value) {
		workflowsStore.setPanelOpen('chat', true);
	}
}
</script>

<template>
	<N8nResizeWrapper
		:height="height"
		:supported-directions="['top']"
		:is-resizing-enabled="true"
		:style="rootStyles"
		:class="[$style.resizeWrapper, isOpen ? $style.isOpen : '']"
		@resize="onResizeDebounced"
	>
		<div ref="container" :class="$style.container">
			<ChatMessagesPanel
				data-test-id="canvas-chat"
				:is-open="isOpen"
				:messages="messages"
				:session-id="currentSessionId"
				:past-chat-messages="previousChatMessages"
				:show-close-button="!connectedNode"
				@close="handleToggleOpen"
				@refresh-session="refreshSession"
				@display-execution="displayExecution"
				@send-message="sendMessage"
				@click-header="handleClickHeader"
			/>
			<LogsPanel :is-open="isOpen" @click-header="handleClickHeader">
				<template #actions
					><N8nIconButton
						type="secondary"
						size="mini"
						:icon="isOpen ? 'chevron-down' : 'chevron-up'"
						@click.stop="handleToggleOpen"
				/></template>
			</LogsPanel>
		</div>
	</N8nResizeWrapper>
</template>

<style lang="scss" module>
.resizeWrapper {
	height: auto;
	min-height: 0;
	flex-basis: 0;
	border-top: 1px solid var(--color-foreground-base);
	background-color: var(--color-background-light);
	display: flex;
	align-items: stretch;
	justify-content: stretch;

	&.isOpen {
		height: var(--panel-height);
		min-height: 4rem;
		max-height: 90vh;
		flex-basis: content;
	}
}

.container {
	display: flex;
	flex-grow: 1;

	& > *:not(:last-child) {
		border-right: 1px solid var(--color-foreground-base);
	}
}
</style>
